import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getNaverToken,
  fetchProductOrders,
  convertToParseOrders,
} from '@/lib/naver/commerce-api';
import { processOrders } from '@/lib/services/order-processor';
import { writeAuditLog } from '@/lib/audit-log';

/**
 * GET: 자동 동기화용 (전날 주문 자동 수집 — 모든 스마트스토어 채널)
 * Windows 작업 스케줄러에서 호출
 */
export async function GET() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  const from = `${dateStr}T00:00:00.000+09:00`;
  const to = `${dateStr}T23:59:59.999+09:00`;

  // 모든 스마트스토어 채널 조회
  const channels = await prisma.channel.findMany({
    where: { code: { startsWith: 'SMARTSTORE' } },
  });

  const results = [];
  for (const ch of channels) {
    const fakeRequest = new NextRequest(
      'http://localhost:3000/api/sync/smartstore',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, channelId: ch.id }),
      },
    );
    const res = await POST(fakeRequest);
    const data = await res.json();
    results.push({ channel: ch.name, ...data });
  }

  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from, to, channelId } = body;

    if (!from || !to) {
      return NextResponse.json(
        { error: '조회 기간(from, to)을 입력해주세요' },
        { status: 400 },
      );
    }

    // 채널 조회 (channelId 지정 시 해당 채널, 아니면 기본 스마트스토어)
    const channel = channelId
      ? await prisma.channel.findUnique({ where: { id: channelId } })
      : await prisma.channel.findFirst({
          where: {
            OR: [
              { code: 'SMARTSTORE' },
              { code: 'NAVER' },
              { name: { contains: '스마트스토어' } },
            ],
          },
        });

    if (!channel) {
      return NextResponse.json(
        {
          error:
            '스마트스토어 채널이 등록되어 있지 않습니다. 채널 관리에서 먼저 등록해주세요.',
        },
        { status: 400 },
      );
    }

    // 1. 토큰 발급 (채널 코드별 API 키 분기)
    const token = await getNaverToken(channel.code);

    // 2. 주문 조회 (24시간 제한 → 하루씩 분할)
    const fromDate = from.split('T')[0];
    const toDate = to.split('T')[0];
    const naverOrders = [];

    const startD = new Date(fromDate);
    const endD = new Date(toDate);
    const currentD = new Date(startD);

    while (currentD <= endD) {
      const dateStr = currentD.toISOString().split('T')[0];
      const dayFrom = `${dateStr}T00:00:00.000+09:00`;
      const dayTo = `${dateStr}T23:59:59.999+09:00`;

      try {
        const orders = await fetchProductOrders(token, dayFrom, dayTo);
        naverOrders.push(...orders);
        console.log(`[Sync] ${dateStr}: ${orders.length}건`);
      } catch (err) {
        console.error(`[Sync] ${dateStr} 조회 실패:`, err);
      }

      currentD.setDate(currentD.getDate() + 1);
    }

    console.log(`[Sync] 총 ${naverOrders.length}건 조회됨`);

    // 처음 3건 상세 로그 (디버깅용)
    if (naverOrders.length > 0) {
      console.log('[Sync] 샘플 주문 데이터 (최대 3건):');
      naverOrders.slice(0, 3).forEach((order, i) => {
        console.log(`[Sync] #${i + 1}:`, JSON.stringify(order, null, 2));
      });
    }

    if (naverOrders.length === 0) {
      return NextResponse.json({
        summary: {
          total: 0,
          success: 0,
          errors: 0,
          duplicates: 0,
        },
        message: '해당 기간에 주문이 없습니다',
      });
    }

    // 3. ParsedOrder 형태로 변환
    const parsedOrders = convertToParseOrders(naverOrders);

    // 4. Upload 레코드 생성 (API 동기화도 이력 관리)
    const upload = await prisma.upload.create({
      data: {
        fileName: `[API] ${channel.name} 동기화 ${fromDate} ~ ${toDate}`,
        channelId: channel.id,
        totalRows: parsedOrders.length,
        successRows: 0,
        errorRows: 0,
      },
    });

    // 5. 공통 주문 처리
    const result = await processOrders(parsedOrders, channel.id, upload.id);

    // 6. Upload 결과 업데이트
    await prisma.upload.update({
      where: { id: upload.id },
      data: {
        successRows: result.successCount,
        errorRows: result.errors.length,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
    });

    const duplicateCount = result.errors.filter((e) =>
      e.message.startsWith('중복'),
    ).length;

    await writeAuditLog({
      action: 'API_SYNC',
      target: 'Order',
      targetId: upload.id,
      summary: `${channel.name} API 동기화 (${fromDate} ~ ${toDate}) — ${result.successCount}건 성공, 중복 ${duplicateCount}건`,
      changes: {
        channel: { from: null, to: channel.name },
        dateRange: { from: fromDate, to: toDate },
        successCount: { from: null, to: result.successCount },
        errorCount: { from: null, to: result.errors.length },
        duplicateCount: { from: null, to: duplicateCount },
      },
    });

    // 신규 상품 상세 정보 조회 (가격 설정 팝업용)
    let newProducts: { id: string; name: string; optionInfo: string }[] = [];
    if (result.newProductIds.size > 0) {
      newProducts = await prisma.product.findMany({
        where: { id: { in: Array.from(result.newProductIds) } },
        select: { id: true, name: true, optionInfo: true },
      });
    }

    return NextResponse.json({
      summary: {
        total: parsedOrders.length,
        success: result.successCount,
        errors: result.errors.length,
        duplicates: result.errors.filter((e) => e.message.startsWith('중복'))
          .length,
        newProducts: result.newProductIds.size,
      },
      newProducts,
      message: `${result.successCount}건 동기화 완료`,
    });
  } catch (err) {
    console.error('Smartstore sync error:', err);
    const message =
      err instanceof Error ? err.message : '동기화 중 오류가 발생했습니다';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

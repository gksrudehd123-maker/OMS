import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseSmartstoreExcel } from '@/lib/excel/smartstore-parser';
import { parseCoupangExcel } from '@/lib/excel/coupang-parser';
import { processOrders } from '@/lib/services/order-processor';
import { validateExcelFormat } from '@/lib/excel/validate-format';

// 채널 코드로 파서 분기
const COUPANG_CHANNEL_CODES = ['coupang_wing', 'coupang_rocket_growth', 'coupang_rocket_delivery'];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const channelId = formData.get('channelId') as string | null;

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다' }, { status: 400 });
    }
    if (!channelId) {
      return NextResponse.json(
        { error: '채널을 선택해주세요' },
        { status: 400 },
      );
    }

    // 채널 정보 조회 (파서 분기용)
    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { code: true },
    });
    if (!channel) {
      return NextResponse.json(
        { error: '존재하지 않는 채널입니다' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 채널 코드에 따라 파서 선택 (대소문자 무시)
    const isCoupang = COUPANG_CHANNEL_CODES.includes(
      channel.code.toLowerCase(),
    );

    // 채널-엑셀 양식 검증
    const validation = await validateExcelFormat(buffer, isCoupang);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 },
      );
    }

    const { orders: parsedOrders, errors } = isCoupang
      ? await parseCoupangExcel(buffer)
      : await parseSmartstoreExcel(buffer);

    // Upload 레코드 생성
    const upload = await prisma.upload.create({
      data: {
        fileName: file.name,
        channelId,
        totalRows: parsedOrders.length + errors.length,
        successRows: 0,
        errorRows: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });

    // 공통 주문 처리
    const result = await processOrders(parsedOrders, channelId, upload.id, errors);

    // Upload 결과 업데이트
    const updatedUpload = await prisma.upload.update({
      where: { id: upload.id },
      data: {
        successRows: result.successCount,
        errorRows: result.errors.length,
        errors: result.errors.length > 0 ? result.errors : undefined,
      },
    });

    // 신규 상품 목록 조회 (가격 미설정 상품)
    const newProducts =
      result.newProductIds.size > 0
        ? await prisma.product.findMany({
            where: { id: { in: [...result.newProductIds] } },
            select: {
              id: true,
              name: true,
              optionInfo: true,
              sellingPrice: true,
              costPrice: true,
              shippingCost: true,
              freeShippingMin: true,
            },
          })
        : [];

    return NextResponse.json({
      upload: updatedUpload,
      summary: {
        total: parsedOrders.length + errors.length,
        success: result.successCount,
        errors: result.errors.length,
        duplicates: result.errors.filter((e) => e.message.startsWith('중복'))
          .length,
      },
      newProducts,
    });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json(
      { error: '파일 처리 중 오류가 발생했습니다' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const [uploads, total] = await Promise.all([
    prisma.upload.findMany({
      include: { channel: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.upload.count(),
  ]);

  return NextResponse.json({ uploads, total, page, limit });
}

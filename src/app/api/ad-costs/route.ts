import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isError } from '@/lib/auth-guard';

// 광고비 목록 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const channelId = searchParams.get('channelId');

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + 'T23:59:59') } : {}),
    };
  }
  if (channelId) {
    where.channelId = channelId;
  }

  const adCosts = await prisma.adCost.findMany({
    where,
    include: { channel: { select: { id: true, name: true, code: true } } },
    orderBy: { date: 'desc' },
  });

  // 합계
  const totalCost = adCosts.reduce((sum, ac) => sum + Number(ac.cost), 0);

  const response = NextResponse.json({ adCosts, totalCost });
  response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return response;
}

// 광고비 등록/수정 (같은 채널+날짜면 upsert)
export async function POST(request: NextRequest) {
  const user = await requireRole('OWNER', 'MANAGER');
  if (isError(user)) return user;

  try {
    const body = await request.json();
    const { channelId, date, cost, memo } = body;

    if (!channelId || !date || cost === undefined) {
      return NextResponse.json(
        { error: '채널, 날짜, 광고비를 모두 입력해주세요' },
        { status: 400 },
      );
    }

    const adCost = await prisma.adCost.upsert({
      where: {
        channelId_date: {
          channelId,
          date: new Date(date),
        },
      },
      update: {
        cost: parseFloat(cost),
        memo: memo || null,
      },
      create: {
        channelId,
        date: new Date(date),
        cost: parseFloat(cost),
        memo: memo || null,
      },
      include: { channel: { select: { id: true, name: true, code: true } } },
    });

    return NextResponse.json(adCost);
  } catch (err) {
    console.error('AdCost create error:', err);
    return NextResponse.json(
      { error: '광고비 저장 중 오류가 발생했습니다' },
      { status: 500 },
    );
  }
}

// 광고비 삭제
export async function DELETE(request: NextRequest) {
  const user = await requireRole('OWNER', 'MANAGER');
  if (isError(user)) return user;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID가 필요합니다' }, { status: 400 });
  }

  await prisma.adCost.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

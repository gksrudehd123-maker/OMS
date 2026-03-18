import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const channels = await prisma.channel.findMany({
    include: { _count: { select: { orders: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(channels);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, code, feeRate } = body;

  if (!name || !code) {
    return NextResponse.json(
      { error: '채널명과 코드는 필수입니다' },
      { status: 400 },
    );
  }

  const channel = await prisma.channel.create({
    data: { name, code, feeRate: feeRate || 0 },
  });

  return NextResponse.json(channel, { status: 201 });
}

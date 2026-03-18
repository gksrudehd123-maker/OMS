import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { productName: { contains: search, mode: 'insensitive' } },
      { orderNumber: { contains: search } },
      { buyerName: { contains: search } },
    ];
  }

  if (status) {
    where.orderStatus = status;
  }

  if (from || to) {
    where.orderDate = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + 'T23:59:59') } : {}),
    };
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { product: true, channel: true },
      orderBy: { orderDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return NextResponse.json({ orders, total, page, limit });
}

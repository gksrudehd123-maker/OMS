import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateRGMargin } from '@/lib/helpers/rg-margin-calc';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || '';
  const channelId = searchParams.get('channelId') || '';

  const where: Record<string, unknown> = {};

  if (channelId) {
    where.channelId = channelId;
  }

  if (search) {
    where.optionName = { contains: search, mode: 'insensitive' };
  }

  const [sales, total] = await Promise.all([
    prisma.dailySales.findMany({
      where,
      include: { product: true, channel: true },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.dailySales.count({ where }),
  ]);

  const salesWithMargin = sales.map((ds) => {
    const margin = calculateRGMargin({
      salesAmount: Number(ds.salesAmount),
      salesQuantity: ds.salesQuantity,
      costPrice: ds.product.costPrice ? Number(ds.product.costPrice) : null,
      feeRate: ds.product.feeRate ? Number(ds.product.feeRate) : null,
      fulfillmentFee: ds.product.fulfillmentFee
        ? Number(ds.product.fulfillmentFee)
        : null,
      couponDiscount: ds.product.couponDiscount
        ? Number(ds.product.couponDiscount)
        : null,
    });

    return {
      ...ds,
      margin: {
        salesAmount: margin.salesAmount,
        margin: margin.margin,
        marginRate: margin.marginRate,
        isCalculable: margin.isCalculable,
      },
    };
  });

  const response = NextResponse.json({ sales: salesWithMargin, total, page, limit });
  response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
  return response;
}

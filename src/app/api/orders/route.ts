import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateMargin } from '@/lib/helpers/margin-calc';
import { requireAuth, isError, checkChannelAccess, getChannelFilter } from '@/lib/auth-guard';

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (isError(user)) return user;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const channelId = searchParams.get('channelId') || '';
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const channelError = checkChannelAccess(user, channelId || null);
  if (channelError) return channelError;

  const where: Record<string, unknown> = {};

  if (channelId) {
    where.channelId = channelId;
  } else {
    const allowedChannels = getChannelFilter(user);
    if (allowedChannels) where.channelId = { in: allowedChannels };
  }
  if (status) where.orderStatus = status;

  if (search) {
    where.OR = [
      { productName: { contains: search, mode: 'insensitive' } },
      { orderNumber: { contains: search } },
      { buyerName: { contains: search } },
    ];
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
      select: {
        id: true,
        productOrderNumber: true,
        orderNumber: true,
        orderDate: true,
        orderStatus: true,
        productName: true,
        optionInfo: true,
        quantity: true,
        buyerName: true,
        claimStatus: true,
        productId: true,
        channelId: true,
        product: {
          select: {
            sellingPrice: true,
            costPrice: true,
            feeRate: true,
            shippingCost: true,
            freeShippingMin: true,
          },
        },
        channel: { select: { feeRate: true } },
      },
      orderBy: { orderDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  // 같은 주문번호 목록으로 합산금액 조회 (N+1 제거: select로 최소 필드만)
  const orderNumbers = [...new Set(orders.map((o) => o.orderNumber))];
  const orderGroups =
    orderNumbers.length > 0
      ? await prisma.order.findMany({
          where: { orderNumber: { in: orderNumbers } },
          select: {
            orderNumber: true,
            quantity: true,
            product: {
              select: {
                sellingPrice: true,
                shippingCost: true,
                freeShippingMin: true,
              },
            },
          },
        })
      : [];

  // 주문번호별 합산금액 + 무료배송 (단일 루프)
  const orderTotals: Record<string, number> = {};
  const orderFreeShipping: Record<string, boolean> = {};

  for (const o of orderGroups) {
    const sp = o.product.sellingPrice ? Number(o.product.sellingPrice) : 0;
    orderTotals[o.orderNumber] = (orderTotals[o.orderNumber] || 0) + sp * o.quantity;
  }

  for (const o of orderGroups) {
    if (orderFreeShipping[o.orderNumber]) continue;
    const freeMin = o.product.freeShippingMin ? Number(o.product.freeShippingMin) : null;
    if ((freeMin !== null && (orderTotals[o.orderNumber] || 0) >= freeMin) ||
        Number(o.product.shippingCost) === 0) {
      orderFreeShipping[o.orderNumber] = true;
    }
  }

  const ordersWithMargin = orders.map((order) => ({
    ...order,
    margin: calculateMargin({
      sellingPrice: order.product.sellingPrice ? Number(order.product.sellingPrice) : null,
      costPrice: order.product.costPrice ? Number(order.product.costPrice) : null,
      quantity: order.quantity,
      feeRate: Number(order.channel.feeRate),
      productFeeRate: order.product.feeRate ? Number(order.product.feeRate) : null,
      shippingCost: Number(order.product.shippingCost),
      freeShippingMin: order.product.freeShippingMin ? Number(order.product.freeShippingMin) : null,
      orderTotal: orderTotals[order.orderNumber] || 0,
      isAnyFreeShipping: orderFreeShipping[order.orderNumber] || false,
    }),
  }));

  const response = NextResponse.json({
    orders: ordersWithMargin,
    total,
    page,
    limit,
  });

  response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
  return response;
}

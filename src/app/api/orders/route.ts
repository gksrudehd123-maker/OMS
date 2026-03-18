import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateMargin } from '@/lib/helpers/margin-calc';

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

  // 같은 주문번호별 합산금액 계산 (배송비 무료배송 판단용)
  const orderNumbers = [...new Set(orders.map((o) => o.orderNumber))];
  const orderGroups =
    orderNumbers.length > 0
      ? await prisma.order.findMany({
          where: { orderNumber: { in: orderNumbers } },
          include: { product: true },
        })
      : [];

  // 주문번호별 합산금액 및 무료배송 조건 체크
  const orderTotals: Record<string, number> = {};
  const orderFreeShipping: Record<string, boolean> = {};

  for (const o of orderGroups) {
    const sellingPrice = o.product.sellingPrice
      ? Number(o.product.sellingPrice)
      : 0;
    const amount = sellingPrice * o.quantity;
    orderTotals[o.orderNumber] = (orderTotals[o.orderNumber] || 0) + amount;
  }

  // 무료배송 조건 체크: 한 주문 내 어떤 상품이든 조건 충족 시 전체 무료
  for (const o of orderGroups) {
    const freeShippingMin = o.product.freeShippingMin
      ? Number(o.product.freeShippingMin)
      : null;
    const total = orderTotals[o.orderNumber] || 0;

    if (freeShippingMin !== null && total >= freeShippingMin) {
      orderFreeShipping[o.orderNumber] = true;
    }
    // shippingCost가 0인 상품(무료배송 상품)이 있어도 전체 무료배송
    if (Number(o.product.shippingCost) === 0) {
      orderFreeShipping[o.orderNumber] = true;
    }
  }

  // 마진 계산하여 주문 데이터에 추가
  const ordersWithMargin = orders.map((order) => {
    const marginResult = calculateMargin({
      sellingPrice: order.product.sellingPrice
        ? Number(order.product.sellingPrice)
        : null,
      costPrice: order.product.costPrice
        ? Number(order.product.costPrice)
        : null,
      quantity: order.quantity,
      feeRate: Number(order.channel.feeRate),
      shippingCost: Number(order.product.shippingCost),
      freeShippingMin: order.product.freeShippingMin
        ? Number(order.product.freeShippingMin)
        : null,
      orderTotal: orderTotals[order.orderNumber] || 0,
      isAnyFreeShipping: orderFreeShipping[order.orderNumber] || false,
    });

    return {
      ...order,
      margin: marginResult,
    };
  });

  return NextResponse.json({
    orders: ordersWithMargin,
    total,
    page,
    limit,
  });
}

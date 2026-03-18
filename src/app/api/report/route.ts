import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateMargin } from '@/lib/helpers/margin-calc';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json(
      { error: '기간을 선택해주세요' },
      { status: 400 },
    );
  }

  const where = {
    orderDate: {
      gte: new Date(from),
      lte: new Date(to + 'T23:59:59'),
    },
  };

  const orders = await prisma.order.findMany({
    where,
    include: { product: true, channel: true },
    orderBy: { orderDate: 'asc' },
  });

  // 주문번호별 합산 및 무료배송 판단
  const orderTotals: Record<string, number> = {};
  const orderFreeShipping: Record<string, boolean> = {};

  for (const o of orders) {
    const sp = o.product.sellingPrice ? Number(o.product.sellingPrice) : 0;
    orderTotals[o.orderNumber] =
      (orderTotals[o.orderNumber] || 0) + sp * o.quantity;
  }

  for (const o of orders) {
    const freeMin = o.product.freeShippingMin
      ? Number(o.product.freeShippingMin)
      : null;
    const total = orderTotals[o.orderNumber] || 0;
    if (freeMin !== null && total >= freeMin) {
      orderFreeShipping[o.orderNumber] = true;
    }
    if (Number(o.product.shippingCost) === 0) {
      orderFreeShipping[o.orderNumber] = true;
    }
  }

  // KPI
  let totalSales = 0;
  let totalMargin = 0;
  let totalCost = 0;
  let totalFee = 0;
  let totalShipping = 0;

  // 일별 집계
  const dailyMap: Record<
    string,
    { date: string; sales: number; margin: number; orders: number }
  > = {};

  // 상품별 집계
  const productMap: Record<
    string,
    {
      name: string;
      optionInfo: string;
      quantity: number;
      sales: number;
      cost: number;
      fee: number;
      shipping: number;
      margin: number;
    }
  > = {};

  for (const order of orders) {
    const m = calculateMargin({
      sellingPrice: order.product.sellingPrice
        ? Number(order.product.sellingPrice)
        : null,
      costPrice: order.product.costPrice
        ? Number(order.product.costPrice)
        : null,
      quantity: order.quantity,
      feeRate: Number(order.channel.feeRate),
      productFeeRate: order.product.feeRate
        ? Number(order.product.feeRate)
        : null,
      shippingCost: Number(order.product.shippingCost),
      freeShippingMin: order.product.freeShippingMin
        ? Number(order.product.freeShippingMin)
        : null,
      orderTotal: orderTotals[order.orderNumber] || 0,
      isAnyFreeShipping: orderFreeShipping[order.orderNumber] || false,
    });

    if (m.isCalculable) {
      totalSales += m.salesAmount;
      totalMargin += m.margin;
      totalCost += m.costAmount;
      totalFee += m.fee;
      totalShipping += m.shipping;
    }

    // 일별
    const dateKey = order.orderDate.toISOString().split('T')[0];
    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = { date: dateKey, sales: 0, margin: 0, orders: 0 };
    }
    dailyMap[dateKey].orders++;
    if (m.isCalculable) {
      dailyMap[dateKey].sales += m.salesAmount;
      dailyMap[dateKey].margin += m.margin;
    }

    // 상품별
    if (m.isCalculable) {
      const pid = order.productId;
      if (!productMap[pid]) {
        productMap[pid] = {
          name: order.product.name,
          optionInfo: order.product.optionInfo,
          quantity: 0,
          sales: 0,
          cost: 0,
          fee: 0,
          shipping: 0,
          margin: 0,
        };
      }
      productMap[pid].quantity += order.quantity;
      productMap[pid].sales += m.salesAmount;
      productMap[pid].cost += m.costAmount;
      productMap[pid].fee += m.fee;
      productMap[pid].shipping += m.shipping;
      productMap[pid].margin += m.margin;
    }
  }

  const dailyData = Object.values(dailyMap).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const productData = Object.values(productMap)
    .map((p) => ({
      ...p,
      marginRate: p.sales > 0 ? (p.margin / p.sales) * 100 : 0,
    }))
    .sort((a, b) => b.margin - a.margin);

  return NextResponse.json({
    period: { from, to },
    kpi: {
      totalSales,
      totalCost,
      totalFee,
      totalShipping,
      totalMargin,
      avgMarginRate: totalSales > 0 ? (totalMargin / totalSales) * 100 : 0,
      totalOrders: orders.length,
    },
    dailyData,
    productData,
  });
}

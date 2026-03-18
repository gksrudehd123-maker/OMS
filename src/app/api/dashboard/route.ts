import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateMargin } from '@/lib/helpers/margin-calc';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.orderDate = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + 'T23:59:59') } : {}),
    };
  }

  // 전체 주문 조회 (마진 계산용)
  const orders = await prisma.order.findMany({
    where,
    include: { product: true, channel: true },
    orderBy: { orderDate: 'asc' },
  });

  // 주문번호별 합산금액 및 무료배송 판단
  const orderTotals: Record<string, number> = {};
  const orderFreeShipping: Record<string, boolean> = {};

  for (const o of orders) {
    const sellingPrice = o.product.sellingPrice
      ? Number(o.product.sellingPrice)
      : 0;
    const amount = sellingPrice * o.quantity;
    orderTotals[o.orderNumber] = (orderTotals[o.orderNumber] || 0) + amount;
  }

  for (const o of orders) {
    const freeShippingMin = o.product.freeShippingMin
      ? Number(o.product.freeShippingMin)
      : null;
    const total = orderTotals[o.orderNumber] || 0;
    if (freeShippingMin !== null && total >= freeShippingMin) {
      orderFreeShipping[o.orderNumber] = true;
    }
    if (Number(o.product.shippingCost) === 0) {
      orderFreeShipping[o.orderNumber] = true;
    }
  }

  // KPI 계산
  let totalSales = 0;
  let totalMargin = 0;
  let calculableCount = 0;
  const totalOrders = orders.length;

  // 일별 매출 데이터 (차트용)
  const dailyMap: Record<
    string,
    { date: string; sales: number; margin: number; orders: number }
  > = {};

  // 상품별 마진 집계
  const productMarginMap: Record<
    string,
    { name: string; optionInfo: string; sales: number; margin: number; orders: number }
  > = {};

  for (const order of orders) {
    const margin = calculateMargin({
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

    if (margin.isCalculable) {
      totalSales += margin.salesAmount;
      totalMargin += margin.margin;
      calculableCount++;
    }

    // 일별 집계
    const dateKey = order.orderDate.toISOString().split('T')[0];
    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = { date: dateKey, sales: 0, margin: 0, orders: 0 };
    }
    dailyMap[dateKey].orders++;
    if (margin.isCalculable) {
      dailyMap[dateKey].sales += margin.salesAmount;
      dailyMap[dateKey].margin += margin.margin;
    }

    // 상품별 집계
    if (margin.isCalculable) {
      const productId = order.productId;
      if (!productMarginMap[productId]) {
        productMarginMap[productId] = {
          name: order.product.name,
          optionInfo: order.product.optionInfo,
          sales: 0,
          margin: 0,
          orders: 0,
        };
      }
      productMarginMap[productId].sales += margin.salesAmount;
      productMarginMap[productId].margin += margin.margin;
      productMarginMap[productId].orders += order.quantity;
    }
  }

  const avgMarginRate = totalSales > 0 ? (totalMargin / totalSales) * 100 : 0;

  // 일별 데이터 정렬
  const dailyData = Object.values(dailyMap).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  // 상품별 마진 순위 Top 10
  const productMarginRank = Object.values(productMarginMap)
    .map((p) => ({
      ...p,
      marginRate: p.sales > 0 ? (p.margin / p.sales) * 100 : 0,
      label: p.optionInfo ? `${p.name} (${p.optionInfo})` : p.name,
    }))
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 10);

  return NextResponse.json({
    kpi: {
      totalSales,
      totalMargin,
      avgMarginRate,
      totalOrders,
      calculableCount,
    },
    dailyData,
    productMarginRank,
  });
}

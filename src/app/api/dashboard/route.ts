import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateMargin } from '@/lib/helpers/margin-calc';
import { calculateRGMargin } from '@/lib/helpers/rg-margin-calc';

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

  // DailySales 조회 (로켓그로스)
  const dailySalesWhere: Record<string, unknown> = {};
  if (from || to) {
    dailySalesWhere.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + 'T23:59:59') } : {}),
    };
  }
  const dailySalesRecords = await prisma.dailySales.findMany({
    where: dailySalesWhere,
    include: { product: true, channel: true },
  });

  // 광고비 조회 (같은 기간)
  const adCostWhere: Record<string, unknown> = {};
  if (from || to) {
    adCostWhere.date = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + 'T23:59:59') } : {}),
    };
  }
  const adCosts = await prisma.adCost.findMany({ where: adCostWhere });

  // 날짜+채널별 광고비 맵
  const adCostMap: Record<string, number> = {};
  for (const ac of adCosts) {
    const key = `${ac.date.toISOString().split('T')[0]}_${ac.channelId}`;
    adCostMap[key] = (adCostMap[key] || 0) + Number(ac.cost);
  }

  // 광고비 총액
  const totalAdCostAmount = adCosts.reduce(
    (sum, ac) => sum + Number(ac.cost),
    0,
  );

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

  // 채널별 집계
  const channelMap: Record<
    string,
    { name: string; sales: number; margin: number; orders: number }
  > = {};

  // 상품별 마진 집계
  const productMarginMap: Record<
    string,
    {
      name: string;
      optionInfo: string;
      sales: number;
      margin: number;
      orders: number;
    }
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

    // 채널별 집계
    const chId = order.channelId;
    if (!channelMap[chId]) {
      channelMap[chId] = {
        name: order.channel.name,
        sales: 0,
        margin: 0,
        orders: 0,
      };
    }
    channelMap[chId].orders++;
    if (margin.isCalculable) {
      channelMap[chId].sales += margin.salesAmount;
      channelMap[chId].margin += margin.margin;
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

  // RG DailySales 합산
  let rgSalesCount = 0;
  for (const ds of dailySalesRecords) {
    const rgMargin = calculateRGMargin({
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

    rgSalesCount++;
    const rgSalesAmt = Number(ds.salesAmount);

    // 매출은 항상 합산 (엑셀 확정값)
    totalSales += rgSalesAmt;
    if (rgMargin.isCalculable) {
      totalMargin += rgMargin.margin;
      calculableCount++;
    }

    // 일별 집계
    const dateKey = ds.date.toISOString().split('T')[0];
    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = { date: dateKey, sales: 0, margin: 0, orders: 0 };
    }
    dailyMap[dateKey].orders += ds.salesQuantity;
    dailyMap[dateKey].sales += rgSalesAmt;
    if (rgMargin.isCalculable) {
      dailyMap[dateKey].margin += rgMargin.margin;
    }

    // 채널별 집계
    const chId = ds.channelId;
    if (!channelMap[chId]) {
      channelMap[chId] = {
        name: ds.channel.name,
        sales: 0,
        margin: 0,
        orders: 0,
      };
    }
    channelMap[chId].orders += ds.salesQuantity;
    channelMap[chId].sales += rgSalesAmt;
    if (rgMargin.isCalculable) {
      channelMap[chId].margin += rgMargin.margin;
    }

    // 상품별 집계
    const productId = ds.productId;
    if (!productMarginMap[productId]) {
      productMarginMap[productId] = {
        name: ds.product.name,
        optionInfo: ds.product.optionInfo,
        sales: 0,
        margin: 0,
        orders: 0,
      };
    }
    productMarginMap[productId].sales += rgSalesAmt;
    productMarginMap[productId].orders += ds.salesQuantity;
    if (rgMargin.isCalculable) {
      productMarginMap[productId].margin += rgMargin.margin;
    }
  }

  const netMargin = totalMargin - totalAdCostAmount;
  const avgMarginRate = totalSales > 0 ? Math.round((netMargin / totalSales) * 1000) / 10 : 0;

  // 일별 데이터 정렬
  const dailyData = Object.values(dailyMap)
    .map((d) => ({ ...d, sales: Math.round(d.sales), margin: Math.round(d.margin) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 채널별 데이터 (매출 내림차순)
  const channelData = Object.values(channelMap)
    .map((ch) => ({
      ...ch,
      sales: Math.round(ch.sales),
      margin: Math.round(ch.margin),
      marginRate: ch.sales > 0 ? Math.round((ch.margin / ch.sales) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.sales - a.sales);

  // 상품별 마진 순위 Top 10
  const productMarginRank = Object.values(productMarginMap)
    .map((p) => ({
      ...p,
      sales: Math.round(p.sales),
      margin: Math.round(p.margin),
      marginRate: p.sales > 0 ? Math.round((p.margin / p.sales) * 1000) / 10 : 0,
      label: p.optionInfo ? `${p.name} (${p.optionInfo})` : p.name,
    }))
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 10);

  return NextResponse.json({
    kpi: {
      totalSales: Math.round(totalSales),
      totalMargin: Math.round(netMargin),
      totalAdCost: Math.round(totalAdCostAmount),
      avgMarginRate,
      totalOrders: totalOrders + rgSalesCount,
      calculableCount,
    },
    dailyData,
    channelData,
    productMarginRank,
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateMargin } from '@/lib/helpers/margin-calc';
import { calculateRGMargin } from '@/lib/helpers/rg-margin-calc';

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

  const dateFilter = {
    gte: new Date(from),
    lte: new Date(to + 'T23:59:59'),
  };

  // 2개 쿼리 병렬 실행 + 필요한 필드만 select
  const [orders, dailySalesRecords] = await Promise.all([
    prisma.order.findMany({
      where: { orderDate: dateFilter },
      select: {
        orderNumber: true,
        orderDate: true,
        quantity: true,
        productId: true,
        channelId: true,
        product: {
          select: {
            name: true,
            optionInfo: true,
            sellingPrice: true,
            costPrice: true,
            feeRate: true,
            shippingCost: true,
            freeShippingMin: true,
          },
        },
        channel: { select: { name: true, feeRate: true } },
      },
      orderBy: { orderDate: 'asc' },
    }),
    prisma.dailySales.findMany({
      where: { date: dateFilter },
      select: {
        date: true,
        salesAmount: true,
        salesQuantity: true,
        productId: true,
        channelId: true,
        product: {
          select: {
            name: true,
            optionInfo: true,
            costPrice: true,
            feeRate: true,
            fulfillmentFee: true,
            couponDiscount: true,
          },
        },
        channel: { select: { name: true } },
      },
    }),
  ]);

  // 주문번호별 합산 + 무료배송 판단 (단일 루프)
  const orderTotals: Record<string, number> = {};
  for (const o of orders) {
    const sp = o.product.sellingPrice ? Number(o.product.sellingPrice) : 0;
    orderTotals[o.orderNumber] = (orderTotals[o.orderNumber] || 0) + sp * o.quantity;
  }

  const orderFreeShipping: Record<string, boolean> = {};
  for (const o of orders) {
    if (orderFreeShipping[o.orderNumber]) continue;
    const freeMin = o.product.freeShippingMin ? Number(o.product.freeShippingMin) : null;
    if ((freeMin !== null && (orderTotals[o.orderNumber] || 0) >= freeMin) ||
        Number(o.product.shippingCost) === 0) {
      orderFreeShipping[o.orderNumber] = true;
    }
  }

  // KPI + 집계 (단일 루프)
  let totalSales = 0, totalMargin = 0, totalCost = 0, totalFee = 0, totalShipping = 0;

  const dailyMap: Record<string, { date: string; sales: number; margin: number; orders: number }> = {};
  const channelMap: Record<string, { name: string; sales: number; margin: number; cost: number; fee: number; shipping: number; orders: number }> = {};
  const productMap: Record<string, { name: string; optionInfo: string; quantity: number; sales: number; cost: number; fee: number; shipping: number; margin: number }> = {};

  for (const order of orders) {
    const m = calculateMargin({
      sellingPrice: order.product.sellingPrice ? Number(order.product.sellingPrice) : null,
      costPrice: order.product.costPrice ? Number(order.product.costPrice) : null,
      quantity: order.quantity,
      feeRate: Number(order.channel.feeRate),
      productFeeRate: order.product.feeRate ? Number(order.product.feeRate) : null,
      shippingCost: Number(order.product.shippingCost),
      freeShippingMin: order.product.freeShippingMin ? Number(order.product.freeShippingMin) : null,
      orderTotal: orderTotals[order.orderNumber] || 0,
      isAnyFreeShipping: orderFreeShipping[order.orderNumber] || false,
    });

    const dateKey = order.orderDate.toISOString().split('T')[0];
    if (!dailyMap[dateKey]) dailyMap[dateKey] = { date: dateKey, sales: 0, margin: 0, orders: 0 };
    dailyMap[dateKey].orders++;

    const chId = order.channelId;
    if (!channelMap[chId]) channelMap[chId] = { name: order.channel.name, sales: 0, margin: 0, cost: 0, fee: 0, shipping: 0, orders: 0 };
    channelMap[chId].orders += order.quantity;

    if (m.isCalculable) {
      totalSales += m.salesAmount;
      totalMargin += m.margin;
      totalCost += m.costAmount;
      totalFee += m.fee;
      totalShipping += m.shipping;

      dailyMap[dateKey].sales += m.salesAmount;
      dailyMap[dateKey].margin += m.margin;

      channelMap[chId].sales += m.salesAmount;
      channelMap[chId].margin += m.margin;
      channelMap[chId].cost += m.costAmount;
      channelMap[chId].fee += m.fee;
      channelMap[chId].shipping += m.shipping;

      const pid = order.productId;
      if (!productMap[pid]) {
        productMap[pid] = { name: order.product.name, optionInfo: order.product.optionInfo, quantity: 0, sales: 0, cost: 0, fee: 0, shipping: 0, margin: 0 };
      }
      productMap[pid].quantity += order.quantity;
      productMap[pid].sales += m.salesAmount;
      productMap[pid].cost += m.costAmount;
      productMap[pid].fee += m.fee;
      productMap[pid].shipping += m.shipping;
      productMap[pid].margin += m.margin;
    }
  }

  // RG DailySales 합산
  for (const ds of dailySalesRecords) {
    const rgm = calculateRGMargin({
      salesAmount: Number(ds.salesAmount),
      salesQuantity: ds.salesQuantity,
      costPrice: ds.product.costPrice ? Number(ds.product.costPrice) : null,
      feeRate: ds.product.feeRate ? Number(ds.product.feeRate) : null,
      fulfillmentFee: ds.product.fulfillmentFee ? Number(ds.product.fulfillmentFee) : null,
      couponDiscount: ds.product.couponDiscount ? Number(ds.product.couponDiscount) : null,
    });

    const rgSalesAmt = Number(ds.salesAmount);
    totalSales += rgSalesAmt;

    const dateKey = ds.date.toISOString().split('T')[0];
    if (!dailyMap[dateKey]) dailyMap[dateKey] = { date: dateKey, sales: 0, margin: 0, orders: 0 };
    dailyMap[dateKey].orders += ds.salesQuantity;
    dailyMap[dateKey].sales += rgSalesAmt;

    const chId = ds.channelId;
    if (!channelMap[chId]) channelMap[chId] = { name: ds.channel.name, sales: 0, margin: 0, cost: 0, fee: 0, shipping: 0, orders: 0 };
    channelMap[chId].sales += rgSalesAmt;
    channelMap[chId].orders += ds.salesQuantity;

    const pid = ds.productId;
    if (!productMap[pid]) {
      productMap[pid] = { name: ds.product.name, optionInfo: ds.product.optionInfo, quantity: 0, sales: 0, cost: 0, fee: 0, shipping: 0, margin: 0 };
    }
    productMap[pid].quantity += ds.salesQuantity;
    productMap[pid].sales += rgSalesAmt;

    if (rgm.isCalculable) {
      totalMargin += rgm.margin;
      totalCost += rgm.costAmount;
      totalFee += rgm.fee + rgm.feeVat;
      totalShipping += rgm.shippingFee + rgm.shippingVat;

      dailyMap[dateKey].margin += rgm.margin;
      channelMap[chId].margin += rgm.margin;
      channelMap[chId].cost += rgm.costAmount;
      channelMap[chId].fee += rgm.fee + rgm.feeVat;
      channelMap[chId].shipping += rgm.shippingFee + rgm.shippingVat;
      productMap[pid].cost += rgm.costAmount;
      productMap[pid].fee += rgm.fee + rgm.feeVat;
      productMap[pid].shipping += rgm.shippingFee + rgm.shippingVat;
      productMap[pid].margin += rgm.margin;
    }
  }

  const response = NextResponse.json({
    period: { from, to },
    kpi: {
      totalSales: Math.round(totalSales),
      totalCost: Math.round(totalCost),
      totalFee: Math.round(totalFee),
      totalShipping: Math.round(totalShipping),
      totalMargin: Math.round(totalMargin),
      avgMarginRate: totalSales > 0 ? Math.round((totalMargin / totalSales) * 1000) / 10 : 0,
      totalOrders: orders.length + dailySalesRecords.length,
    },
    channelData: Object.values(channelMap)
      .map((ch) => ({
        ...ch,
        sales: Math.round(ch.sales),
        margin: Math.round(ch.margin),
        cost: Math.round(ch.cost),
        fee: Math.round(ch.fee),
        shipping: Math.round(ch.shipping),
        marginRate: ch.sales > 0 ? Math.round((ch.margin / ch.sales) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.sales - a.sales),
    dailyData: Object.values(dailyMap)
      .map((d) => ({ ...d, sales: Math.round(d.sales), margin: Math.round(d.margin) }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    productData: Object.values(productMap)
      .map((p) => ({
        ...p,
        sales: Math.round(p.sales),
        cost: Math.round(p.cost),
        fee: Math.round(p.fee),
        shipping: Math.round(p.shipping),
        margin: Math.round(p.margin),
        marginRate: p.sales > 0 ? Math.round((p.margin / p.sales) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.margin - a.margin),
  });

  response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return response;
}

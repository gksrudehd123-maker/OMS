import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateMargin } from '@/lib/helpers/margin-calc';
import { calculateRGMargin } from '@/lib/helpers/rg-margin-calc';
import { requireAuth, isError, checkChannelAccess, getChannelFilter, isStaff } from '@/lib/auth-guard';
import { EXCLUDED_ORDER_STATUSES } from '@/lib/helpers/status-map';

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (isError(user)) return user;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const channelId = searchParams.get('channelId');

  // 요청된 channelId가 사용자 권한에 포함되는지 확인
  const channelError = checkChannelAccess(user, channelId);
  if (channelError) return channelError;

  const dateFilter = from || to
    ? {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to + 'T23:59:59') } : {}),
      }
    : undefined;

  const orderWhere: Record<string, unknown> = {
    orderStatus: { notIn: EXCLUDED_ORDER_STATUSES },
  };
  const dsWhere: Record<string, unknown> = {};
  const adWhere: Record<string, unknown> = {};

  if (dateFilter) {
    orderWhere.orderDate = dateFilter;
    dsWhere.date = dateFilter;
    adWhere.date = dateFilter;
  }

  if (channelId) {
    orderWhere.channelId = channelId;
    dsWhere.channelId = channelId;
    adWhere.channelId = channelId;
  }

  // channelId 미지정 시, 허용된 채널만 필터링 (OWNER/빈 배열은 전체)
  const allowedChannels = getChannelFilter(user);
  if (!channelId && allowedChannels) {
    orderWhere.channelId = { in: allowedChannels };
    dsWhere.channelId = { in: allowedChannels };
    adWhere.channelId = { in: allowedChannels };
  }

  // 3개 쿼리 병렬 실행 + 필요한 필드만 select
  const [orders, dailySalesRecords, adCostAgg] = await Promise.all([
    prisma.order.findMany({
      where: orderWhere,
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
      where: dsWhere,
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
    // 광고비는 aggregate로 총액만 가져오기
    prisma.adCost.aggregate({
      where: adWhere,
      _sum: { cost: true },
    }),
  ]);

  const totalAdCostAmount = Number(adCostAgg._sum.cost ?? 0);

  // ── 이전 기간 비교 데이터 (전일/전주/전월 비교용) ──
  let prevKpi: { totalSales: number; totalMargin: number; totalOrders: number } | null = null;

  if (from && to) {
    const fromDate = new Date(from);
    const toDate = new Date(to + 'T23:59:59');
    const periodMs = toDate.getTime() - fromDate.getTime();
    const prevFrom = new Date(fromDate.getTime() - periodMs - 86400000); // 이전 기간 시작
    const prevTo = new Date(fromDate.getTime() - 86400000); // 이전 기간 끝 (from 하루 전)

    const prevDateFilter = {
      gte: prevFrom,
      lte: prevTo,
    };

    const prevOrderWhere: Record<string, unknown> = {
      orderDate: prevDateFilter,
      orderStatus: { notIn: EXCLUDED_ORDER_STATUSES },
    };
    const prevDsWhere: Record<string, unknown> = { date: prevDateFilter };
    const prevAdWhere: Record<string, unknown> = { date: prevDateFilter };

    if (channelId) {
      prevOrderWhere.channelId = channelId;
      prevDsWhere.channelId = channelId;
      prevAdWhere.channelId = channelId;
    } else if (allowedChannels) {
      prevOrderWhere.channelId = { in: allowedChannels };
      prevDsWhere.channelId = { in: allowedChannels };
      prevAdWhere.channelId = { in: allowedChannels };
    }

    const [prevOrders, prevDs, prevAdAgg] = await Promise.all([
      prisma.order.findMany({
        where: prevOrderWhere,
        select: {
          orderNumber: true,
          quantity: true,
          product: {
            select: { sellingPrice: true, costPrice: true, feeRate: true, shippingCost: true, freeShippingMin: true },
          },
          channel: { select: { feeRate: true } },
        },
      }),
      prisma.dailySales.findMany({
        where: prevDsWhere,
        select: {
          salesAmount: true,
          salesQuantity: true,
          product: {
            select: { costPrice: true, feeRate: true, fulfillmentFee: true, couponDiscount: true },
          },
        },
      }),
      prisma.adCost.aggregate({ where: prevAdWhere, _sum: { cost: true } }),
    ]);

    // 이전 기간 주문별 합산
    const prevOrderTotals: Record<string, number> = {};
    for (const o of prevOrders) {
      const sp = o.product.sellingPrice ? Number(o.product.sellingPrice) : 0;
      prevOrderTotals[o.orderNumber] = (prevOrderTotals[o.orderNumber] || 0) + sp * o.quantity;
    }
    const prevOrderFS: Record<string, boolean> = {};
    for (const o of prevOrders) {
      if (prevOrderFS[o.orderNumber]) continue;
      const freeMin = o.product.freeShippingMin ? Number(o.product.freeShippingMin) : null;
      if ((freeMin !== null && (prevOrderTotals[o.orderNumber] || 0) >= freeMin) || Number(o.product.shippingCost) === 0) {
        prevOrderFS[o.orderNumber] = true;
      }
    }

    let prevSales = 0, prevMargin = 0, prevOrderCount = 0;
    for (const o of prevOrders) {
      const m = calculateMargin({
        sellingPrice: o.product.sellingPrice ? Number(o.product.sellingPrice) : null,
        costPrice: o.product.costPrice ? Number(o.product.costPrice) : null,
        quantity: o.quantity,
        feeRate: Number(o.channel.feeRate),
        productFeeRate: o.product.feeRate ? Number(o.product.feeRate) : null,
        shippingCost: Number(o.product.shippingCost),
        freeShippingMin: o.product.freeShippingMin ? Number(o.product.freeShippingMin) : null,
        orderTotal: prevOrderTotals[o.orderNumber] || 0,
        isAnyFreeShipping: prevOrderFS[o.orderNumber] || false,
      });
      if (m.isCalculable) { prevSales += m.salesAmount; prevMargin += m.margin; }
      prevOrderCount++;
    }

    for (const ds of prevDs) {
      const rgM = calculateRGMargin({
        salesAmount: Number(ds.salesAmount),
        salesQuantity: ds.salesQuantity,
        costPrice: ds.product.costPrice ? Number(ds.product.costPrice) : null,
        feeRate: ds.product.feeRate ? Number(ds.product.feeRate) : null,
        fulfillmentFee: ds.product.fulfillmentFee ? Number(ds.product.fulfillmentFee) : null,
        couponDiscount: ds.product.couponDiscount ? Number(ds.product.couponDiscount) : null,
      });
      prevSales += Number(ds.salesAmount);
      if (rgM.isCalculable) prevMargin += rgM.margin;
      prevOrderCount += ds.salesQuantity;
    }

    const prevAdCost = Number(prevAdAgg._sum.cost ?? 0);
    prevKpi = {
      totalSales: Math.round(prevSales),
      totalMargin: Math.round(prevMargin - prevAdCost),
      totalOrders: prevOrderCount,
    };
  }

  // ── 채널별 광고비 (ROAS 계산용) ──
  const channelAdCosts = await prisma.adCost.groupBy({
    by: ['channelId'],
    where: adWhere,
    _sum: { cost: true },
  });

  // 주문번호별 합산금액 + 무료배송 판단 (단일 루프)
  const orderTotals: Record<string, number> = {};
  for (const o of orders) {
    const sp = o.product.sellingPrice ? Number(o.product.sellingPrice) : 0;
    orderTotals[o.orderNumber] = (orderTotals[o.orderNumber] || 0) + sp * o.quantity;
  }

  const orderFreeShipping: Record<string, boolean> = {};
  for (const o of orders) {
    if (orderFreeShipping[o.orderNumber]) continue; // 이미 무료배송 확정
    const freeMin = o.product.freeShippingMin ? Number(o.product.freeShippingMin) : null;
    if ((freeMin !== null && (orderTotals[o.orderNumber] || 0) >= freeMin) ||
        Number(o.product.shippingCost) === 0) {
      orderFreeShipping[o.orderNumber] = true;
    }
  }

  // KPI + 일별/채널별/상품별 집계 (단일 루프)
  let totalSales = 0;
  let totalMargin = 0;
  let calculableCount = 0;

  const dailyMap: Record<string, { date: string; sales: number; margin: number; orders: number }> = {};
  const channelMap: Record<string, { name: string; sales: number; margin: number; orders: number }> = {};
  const productMarginMap: Record<string, { name: string; optionInfo: string; sales: number; margin: number; orders: number }> = {};

  for (const order of orders) {
    const margin = calculateMargin({
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
    if (!channelMap[chId]) channelMap[chId] = { name: order.channel.name, sales: 0, margin: 0, orders: 0 };
    channelMap[chId].orders++;

    if (margin.isCalculable) {
      totalSales += margin.salesAmount;
      totalMargin += margin.margin;
      calculableCount++;

      dailyMap[dateKey].sales += margin.salesAmount;
      dailyMap[dateKey].margin += margin.margin;

      channelMap[chId].sales += margin.salesAmount;
      channelMap[chId].margin += margin.margin;

      const pid = order.productId;
      if (!productMarginMap[pid]) {
        productMarginMap[pid] = { name: order.product.name, optionInfo: order.product.optionInfo, sales: 0, margin: 0, orders: 0 };
      }
      productMarginMap[pid].sales += margin.salesAmount;
      productMarginMap[pid].margin += margin.margin;
      productMarginMap[pid].orders += order.quantity;
    }
  }

  // RG DailySales 합산 (단일 루프)
  let rgSalesCount = 0;
  for (const ds of dailySalesRecords) {
    const rgMargin = calculateRGMargin({
      salesAmount: Number(ds.salesAmount),
      salesQuantity: ds.salesQuantity,
      costPrice: ds.product.costPrice ? Number(ds.product.costPrice) : null,
      feeRate: ds.product.feeRate ? Number(ds.product.feeRate) : null,
      fulfillmentFee: ds.product.fulfillmentFee ? Number(ds.product.fulfillmentFee) : null,
      couponDiscount: ds.product.couponDiscount ? Number(ds.product.couponDiscount) : null,
    });

    rgSalesCount++;
    const rgSalesAmt = Number(ds.salesAmount);
    totalSales += rgSalesAmt;

    const dateKey = ds.date.toISOString().split('T')[0];
    if (!dailyMap[dateKey]) dailyMap[dateKey] = { date: dateKey, sales: 0, margin: 0, orders: 0 };
    dailyMap[dateKey].orders += ds.salesQuantity;
    dailyMap[dateKey].sales += rgSalesAmt;

    const chId = ds.channelId;
    if (!channelMap[chId]) channelMap[chId] = { name: ds.channel.name, sales: 0, margin: 0, orders: 0 };
    channelMap[chId].orders += ds.salesQuantity;
    channelMap[chId].sales += rgSalesAmt;

    const pid = ds.productId;
    if (!productMarginMap[pid]) {
      productMarginMap[pid] = { name: ds.product.name, optionInfo: ds.product.optionInfo, sales: 0, margin: 0, orders: 0 };
    }
    productMarginMap[pid].sales += rgSalesAmt;
    productMarginMap[pid].orders += ds.salesQuantity;

    if (rgMargin.isCalculable) {
      totalMargin += rgMargin.margin;
      calculableCount++;
      dailyMap[dateKey].margin += rgMargin.margin;
      channelMap[chId].margin += rgMargin.margin;
      productMarginMap[pid].margin += rgMargin.margin;
    }
  }

  const netMargin = totalMargin - totalAdCostAmount;
  const avgMarginRate = totalSales > 0 ? Math.round((netMargin / totalSales) * 1000) / 10 : 0;

  const staff = isStaff(user);

  // 채널별 광고비 맵
  const channelAdCostMap: Record<string, number> = {};
  for (const cac of channelAdCosts) {
    channelAdCostMap[cac.channelId] = Number(cac._sum.cost ?? 0);
  }

  const response = NextResponse.json({
    kpi: {
      totalSales: Math.round(totalSales),
      totalMargin: staff ? undefined : Math.round(netMargin),
      totalAdCost: staff ? undefined : Math.round(totalAdCostAmount),
      avgMarginRate: staff ? undefined : avgMarginRate,
      totalOrders: orders.length + rgSalesCount,
      calculableCount: staff ? undefined : calculableCount,
    },
    prevKpi: staff ? undefined : prevKpi,
    dailyData: Object.values(dailyMap)
      .map((d) => ({
        date: d.date,
        sales: Math.round(d.sales),
        margin: staff ? undefined : Math.round(d.margin),
        orders: d.orders,
      }))
      .sort((a, b) => a.date.localeCompare(b.date)),
    channelData: Object.entries(channelMap)
      .map(([chId, ch]) => {
        const adCost = channelAdCostMap[chId] || 0;
        const roas = adCost > 0 ? Math.round((ch.sales / adCost) * 100) / 100 : null;
        return {
          name: ch.name,
          sales: Math.round(ch.sales),
          margin: staff ? undefined : Math.round(ch.margin),
          marginRate: staff ? undefined : (ch.sales > 0 ? Math.round((ch.margin / ch.sales) * 1000) / 10 : 0),
          orders: ch.orders,
          adCost: staff ? undefined : Math.round(adCost),
          roas: staff ? undefined : roas,
        };
      })
      .sort((a, b) => b.sales - a.sales),
    productMarginRank: staff ? [] : Object.values(productMarginMap)
      .map((p) => ({
        ...p,
        sales: Math.round(p.sales),
        margin: Math.round(p.margin),
        marginRate: p.sales > 0 ? Math.round((p.margin / p.sales) * 1000) / 10 : 0,
        label: p.optionInfo ? `${p.name} (${p.optionInfo})` : p.name,
      }))
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 10),
  });

  response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return response;
}

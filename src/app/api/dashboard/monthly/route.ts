import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateMargin } from '@/lib/helpers/margin-calc';
import { calculateRGMargin } from '@/lib/helpers/rg-margin-calc';
import {
  requireAuth,
  isError,
  getChannelFilter,
  isStaff,
} from '@/lib/auth-guard';
import { EXCLUDED_ORDER_STATUSES } from '@/lib/helpers/status-map';
import { toDateString } from '@/lib/helpers/date-utils';

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (isError(user)) return user;

  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get('year');
  const monthParam = searchParams.get('month');

  // KST 기준 현재 날짜
  const now = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
  const year = yearParam ? parseInt(yearParam, 10) : now.getUTCFullYear();
  const month = monthParam ? parseInt(monthParam, 10) : now.getUTCMonth() + 1;

  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 0)); // 해당 월 말일
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const dateFilter = { gte: from, lte: to };

  const orderWhere: Record<string, unknown> = {
    orderDate: dateFilter,
    orderStatus: { notIn: EXCLUDED_ORDER_STATUSES },
  };
  const dsWhere: Record<string, unknown> = { date: dateFilter };
  const adWhere: Record<string, unknown> = { date: dateFilter };

  const allowedChannels = getChannelFilter(user);
  if (allowedChannels) {
    orderWhere.channelId = { in: allowedChannels };
    dsWhere.channelId = { in: allowedChannels };
    adWhere.channelId = { in: allowedChannels };
  }

  const [orders, dailySalesRecords, adCosts] = await Promise.all([
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
            brand: true,
            brandCategory: true,
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
            brand: true,
            brandCategory: true,
          },
        },
        channel: { select: { name: true } },
      },
    }),
    prisma.adCost.findMany({
      where: adWhere,
      select: {
        channelId: true,
        date: true,
        cost: true,
        channel: { select: { name: true } },
      },
    }),
  ]);

  // 주문번호별 합산금액 + 무료배송 판단
  const orderTotals: Record<string, number> = {};
  for (const o of orders) {
    const sp = o.product.sellingPrice ? Number(o.product.sellingPrice) : 0;
    orderTotals[o.orderNumber] =
      (orderTotals[o.orderNumber] || 0) + sp * o.quantity;
  }

  const orderFreeShipping: Record<string, boolean> = {};
  for (const o of orders) {
    if (orderFreeShipping[o.orderNumber]) continue;
    const freeMin = o.product.freeShippingMin
      ? Number(o.product.freeShippingMin)
      : null;
    if (
      (freeMin !== null && (orderTotals[o.orderNumber] || 0) >= freeMin) ||
      Number(o.product.shippingCost) === 0
    ) {
      orderFreeShipping[o.orderNumber] = true;
    }
  }

  // KPI + 일별/채널별 집계
  let totalSales = 0;
  let totalMargin = 0;
  let totalOrders = 0;

  // dailyChannelMap: { '2026-03-01': { '스마트스토어': 12345, '쿠팡 윙': 6789 } }
  const dailyChannelMap: Record<string, Record<string, number>> = {};
  const channelNamesSet = new Set<string>();
  const channelSalesMap: Record<
    string,
    { name: string; sales: number; orders: number }
  > = {};

  // 브랜드별 판매 갯수 집계 (채널별 분리)
  // brandChannelMap: { '방짜': { '스마트스토어': { '배터리 KF-9': 5 }, '쿠팡 로켓그로스': { '배터리 KF-9': 3 } } }
  const brandChannelMap: Record<
    string,
    Record<string, Record<string, number>>
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

    const dateKey = toDateString(order.orderDate);
    totalOrders++;

    const chId = order.channelId;
    if (!channelSalesMap[chId])
      channelSalesMap[chId] = { name: order.channel.name, sales: 0, orders: 0 };
    channelSalesMap[chId].orders++;

    // 브랜드별 판매 갯수 (채널별)
    if (order.product.brand && order.product.brandCategory) {
      const brand = order.product.brand;
      const chName = order.channel.name;
      const cat = order.product.brandCategory;
      if (!brandChannelMap[brand]) brandChannelMap[brand] = {};
      if (!brandChannelMap[brand][chName]) brandChannelMap[brand][chName] = {};
      brandChannelMap[brand][chName][cat] =
        (brandChannelMap[brand][chName][cat] || 0) + order.quantity;
    }

    if (margin.isCalculable) {
      totalSales += margin.salesAmount;
      totalMargin += margin.margin;
      const chName = order.channel.name;
      channelNamesSet.add(chName);
      if (!dailyChannelMap[dateKey]) dailyChannelMap[dateKey] = {};
      dailyChannelMap[dateKey][chName] =
        (dailyChannelMap[dateKey][chName] || 0) + margin.salesAmount;
      channelSalesMap[chId].sales += margin.salesAmount;
    }
  }

  // RG DailySales 합산
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

    const rgSalesAmt = Number(ds.salesAmount);
    totalSales += rgSalesAmt;
    totalOrders += ds.salesQuantity;

    const dateKey = toDateString(ds.date);
    const chName = ds.channel.name;
    channelNamesSet.add(chName);
    if (!dailyChannelMap[dateKey]) dailyChannelMap[dateKey] = {};
    dailyChannelMap[dateKey][chName] =
      (dailyChannelMap[dateKey][chName] || 0) + rgSalesAmt;

    const chId = ds.channelId;
    if (!channelSalesMap[chId])
      channelSalesMap[chId] = { name: ds.channel.name, sales: 0, orders: 0 };
    channelSalesMap[chId].sales += rgSalesAmt;
    channelSalesMap[chId].orders += ds.salesQuantity;

    // 브랜드별 판매 갯수 (채널별)
    if (ds.product.brand && ds.product.brandCategory) {
      const brand = ds.product.brand;
      const chName = ds.channel.name;
      const cat = ds.product.brandCategory;
      if (!brandChannelMap[brand]) brandChannelMap[brand] = {};
      if (!brandChannelMap[brand][chName]) brandChannelMap[brand][chName] = {};
      brandChannelMap[brand][chName][cat] =
        (brandChannelMap[brand][chName][cat] || 0) + ds.salesQuantity;
    }

    if (rgMargin.isCalculable) {
      totalMargin += rgMargin.margin;
    }
  }

  // 광고비 채널별 집계
  let totalAdCost = 0;
  const channelAdMap: Record<string, { name: string; cost: number }> = {};
  for (const ac of adCosts) {
    const cost = Number(ac.cost);
    totalAdCost += cost;
    const chId = ac.channelId;
    if (!channelAdMap[chId])
      channelAdMap[chId] = { name: ac.channel.name, cost: 0 };
    channelAdMap[chId].cost += cost;
  }

  // 일별 매출 데이터 (해당 월 전체 날짜, 채널별 분리)
  const channelNames = Array.from(channelNamesSet).sort();
  const dailyData = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayEntry: Record<string, unknown> = { date: dateKey, day: d };
    const channelData = dailyChannelMap[dateKey];
    for (const chName of channelNames) {
      dayEntry[chName] = channelData?.[chName]
        ? Math.round(channelData[chName])
        : null;
    }
    dailyData.push(dayEntry);
  }

  // 데이터 존재 여부 (당월 데이터 없으면 프론트에서 전월로 전환)
  const hasData = orders.length > 0 || dailySalesRecords.length > 0;

  const staff = isStaff(user);

  return NextResponse.json({
    year,
    month,
    hasData,
    kpi: {
      totalSales: Math.round(totalSales),
      totalMargin: staff ? undefined : Math.round(totalMargin - totalAdCost),
      totalAdCost: staff ? undefined : Math.round(totalAdCost),
      totalOrders,
    },
    channelNames,
    dailyData,
    channelSales: staff
      ? []
      : Object.values(channelSalesMap)
          .map((ch) => ({
            name: ch.name,
            sales: Math.round(ch.sales),
            orders: ch.orders,
          }))
          .sort((a, b) => b.sales - a.sales),
    channelAdCosts: staff
      ? []
      : Object.values(channelAdMap)
          .map((ch) => ({
            name: ch.name,
            cost: Math.round(ch.cost),
          }))
          .sort((a, b) => b.cost - a.cost),
    brandSales: Object.entries(brandChannelMap)
      .map(([brand, channels]) => {
        const channelList = Object.entries(channels)
          .map(([channelName, categories]) => ({
            channelName,
            total: Object.values(categories).reduce((s, v) => s + v, 0),
            categories: Object.entries(categories)
              .map(([category, quantity]) => ({ category, quantity }))
              .sort((a, b) => b.quantity - a.quantity),
          }))
          .sort((a, b) => b.total - a.total);
        return {
          brand,
          total: channelList.reduce((s, ch) => s + ch.total, 0),
          channels: channelList,
        };
      })
      .sort((a, b) => {
        const order = ['방짜', '웰스파', '카모도'];
        return (
          (order.indexOf(a.brand) === -1 ? 99 : order.indexOf(a.brand)) -
          (order.indexOf(b.brand) === -1 ? 99 : order.indexOf(b.brand))
        );
      }),
  });
}

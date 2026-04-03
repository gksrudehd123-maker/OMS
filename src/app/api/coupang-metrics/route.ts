import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateRGMargin } from '@/lib/helpers/rg-margin-calc';
import {
  requireAuth,
  isError,
  checkChannelAccess,
  getChannelFilter,
  isStaff,
} from '@/lib/auth-guard';
import { apiPaginated } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (isError(user)) return user;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || '';
  const channelId = searchParams.get('channelId') || '';

  const channelError = checkChannelAccess(user, channelId || null);
  if (channelError) return channelError;

  const where: Record<string, unknown> = {};

  if (channelId) {
    where.channelId = channelId;
  } else {
    const allowedChannels = getChannelFilter(user);
    if (allowedChannels) where.channelId = { in: allowedChannels };
  }

  if (search) {
    where.optionName = { contains: search, mode: 'insensitive' };
  }

  const [metrics, total] = await Promise.all([
    prisma.coupangDailyMetrics.findMany({
      where,
      include: { product: true, channel: true },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.coupangDailyMetrics.count({ where }),
  ]);

  const staff = isStaff(user);

  const metricsWithMargin = metrics.map((m) => {
    const margin = calculateRGMargin({
      salesAmount: Number(m.salesAmount),
      salesQuantity: m.salesQuantity,
      costPrice: m.product.costPrice ? Number(m.product.costPrice) : null,
      feeRate: m.product.feeRate ? Number(m.product.feeRate) : null,
      fulfillmentFee: m.product.fulfillmentFee
        ? Number(m.product.fulfillmentFee)
        : null,
      couponDiscount: m.product.couponDiscount
        ? Number(m.product.couponDiscount)
        : null,
    });

    if (staff) {
      const { product: _p, channel: _c, ...rest } = m;
      return { ...rest, margin: undefined };
    }

    return {
      ...m,
      margin: {
        salesAmount: margin.salesAmount,
        margin: margin.margin,
        marginRate: margin.marginRate,
        isCalculable: margin.isCalculable,
      },
    };
  });

  return apiPaginated(metricsWithMargin, { total, page, limit });
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  requireAuth,
  requireRole,
  isError,
  checkChannelAccess,
  getChannelFilter,
} from '@/lib/auth-guard';
import { writeAuditLog } from '@/lib/audit-log';
import { apiSuccess, apiError } from '@/lib/api-response';
import { EXCLUDED_ORDER_STATUSES } from '@/lib/helpers/status-map';

// 상품별 광고 예산 목록 조회
export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (isError(user)) return user;

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month'); // "2026-03"
  const channelId = searchParams.get('channelId');

  const channelError = checkChannelAccess(user, channelId);
  if (channelError) return channelError;

  // 광고 예산이 등록된 상품 목록 조회
  const where: Record<string, unknown> = {};
  if (month) where.month = month;
  if (channelId) {
    where.channelId = channelId;
  } else {
    const allowedChannels = getChannelFilter(user);
    if (allowedChannels) where.channelId = { in: allowedChannels };
  }

  const budgets = await prisma.productAdBudget.findMany({
    where,
    include: {
      channel: { select: { id: true, name: true, code: true, feeRate: true } },
      product: {
        select: {
          id: true,
          name: true,
          optionInfo: true,
          costPrice: true,
          sellingPrice: true,
          feeRate: true,
          shippingCost: true,
          thumbnailUrl: true,
          keywords: {
            include: {
              ranks: {
                orderBy: { date: 'desc' },
                take: 30,
              },
            },
          },
        },
      },
    },
    orderBy: [{ month: 'desc' }, { createdAt: 'desc' }],
  });

  // 상품별로 해당 월의 실제 판매 수량 집계
  // 같은 상품명의 모든 옵션(productId)을 합산
  const budgetsWithSales = await Promise.all(
    budgets.map(async (budget) => {
      const monthStart = new Date(`${budget.month}-01`);
      const monthEnd = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth() + 1,
        0,
      );
      monthEnd.setHours(23, 59, 59, 999);

      // 같은 상품명의 모든 productId 조회
      const sameNameProducts = await prisma.product.findMany({
        where: { name: budget.product.name },
        select: { id: true },
      });
      const productIds = sameNameProducts.map((p) => p.id);

      // Order 테이블에서 판매 수량 (취소/반품/교환 제외)
      const orderAgg = await prisma.order.aggregate({
        where: {
          productId: { in: productIds },
          channelId: budget.channelId,
          orderDate: { gte: monthStart, lte: monthEnd },
          orderStatus: { notIn: EXCLUDED_ORDER_STATUSES },
        },
        _sum: { quantity: true },
      });

      // DailySales 테이블에서 판매 수량
      const dailySalesAgg = await prisma.dailySales.aggregate({
        where: {
          productId: { in: productIds },
          channelId: budget.channelId,
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { salesQuantity: true },
      });

      const actualQuantity =
        (orderAgg._sum.quantity ?? 0) + (dailySalesAgg._sum.salesQuantity ?? 0);

      return {
        ...budget,
        actualQuantity,
      };
    }),
  );

  return apiSuccess(budgetsWithSales);
}

// 광고 예산 등록/수정 (같은 월+채널+상품이면 upsert)
export async function POST(request: NextRequest) {
  const user = await requireRole('OWNER', 'MANAGER');
  if (isError(user)) return user;

  try {
    const body = await request.json();
    const { month, channelId, productId, adCost, memo } = body;

    if (!month || !channelId || !productId || adCost === undefined) {
      return apiError('월, 채널, 상품, 광고비를 모두 입력해주세요');
    }

    const budget = await prisma.productAdBudget.upsert({
      where: {
        month_channelId_productId: {
          month,
          channelId,
          productId,
        },
      },
      update: {
        adCost: parseFloat(adCost),
        memo: memo || null,
      },
      create: {
        month,
        channelId,
        productId,
        adCost: parseFloat(adCost),
        memo: memo || null,
      },
      include: {
        channel: { select: { id: true, name: true, code: true } },
        product: { select: { id: true, name: true } },
      },
    });

    writeAuditLog({
      userId: user.id,
      userName: user.name,
      action: 'CREATE',
      target: 'ProductAdBudget',
      targetId: budget.id,
      summary: `광고 예산 ${budget.product.name} ${month} ${adCost}원 등록`,
    });

    return apiSuccess(budget);
  } catch (err) {
    console.error('ProductAdBudget create error:', err);
    return apiError('광고 예산 저장 중 오류가 발생했습니다', 500);
  }
}

// 광고 예산 삭제
export async function DELETE(request: NextRequest) {
  const user = await requireRole('OWNER', 'MANAGER');
  if (isError(user)) return user;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return apiError('ID가 필요합니다');
  }

  const budget = await prisma.productAdBudget.findUnique({
    where: { id },
    include: {
      channel: { select: { name: true } },
      product: { select: { name: true } },
    },
  });

  if (!budget) {
    return apiError('해당 광고 예산을 찾을 수 없습니다', 404);
  }

  await prisma.productAdBudget.delete({ where: { id } });

  writeAuditLog({
    userId: user.id,
    userName: user.name,
    action: 'DELETE',
    target: 'ProductAdBudget',
    targetId: id,
    summary: `광고 예산 ${budget.product.name} ${budget.channel.name} ${budget.month} 삭제`,
  });

  return apiSuccess({ deleted: true });
}

import { NextRequest, NextResponse } from 'next/server';
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
import { parseDate } from '@/lib/helpers/date-utils';

// 광고비 목록 조회
export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (isError(user)) return user;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const channelId = searchParams.get('channelId');

  const channelError = checkChannelAccess(user, channelId);
  if (channelError) return channelError;

  const where: Record<string, unknown> = {};
  if (from || to) {
    where.date = {
      ...(from ? { gte: parseDate(from) } : {}),
      ...(to ? { lte: parseDate(to) } : {}),
    };
  }
  if (channelId) {
    where.channelId = channelId;
  } else {
    const allowedChannels = getChannelFilter(user);
    if (allowedChannels) where.channelId = { in: allowedChannels };
  }

  const adCosts = await prisma.adCost.findMany({
    where,
    include: { channel: { select: { id: true, name: true, code: true } } },
    orderBy: { date: 'desc' },
  });

  // 합계
  const totalCost = adCosts.reduce((sum, ac) => sum + Number(ac.cost), 0);

  const response = NextResponse.json({ adCosts, totalCost });
  return response;
}

// 광고비 등록/수정 (같은 채널+날짜면 upsert)
export async function POST(request: NextRequest) {
  const user = await requireRole('OWNER', 'MANAGER');
  if (isError(user)) return user;

  try {
    const body = await request.json();
    const { channelId, date, cost, memo } = body;

    if (!channelId || !date || cost === undefined) {
      return apiError('채널, 날짜, 광고비를 모두 입력해주세요');
    }

    const adCost = await prisma.adCost.upsert({
      where: {
        channelId_date: {
          channelId,
          date: new Date(date),
        },
      },
      update: {
        cost: parseFloat(cost),
        memo: memo || null,
      },
      create: {
        channelId,
        date: new Date(date),
        cost: parseFloat(cost),
        memo: memo || null,
      },
      include: { channel: { select: { id: true, name: true, code: true } } },
    });

    writeAuditLog({
      userId: user.id,
      userName: user.name,
      action: 'CREATE',
      target: 'AdCost',
      targetId: adCost.id,
      summary: `광고비 ${adCost.channel.name} ${date} ${cost}원 등록`,
    });

    return apiSuccess(adCost);
  } catch (err) {
    console.error('AdCost create error:', err);
    return apiError('광고비 저장 중 오류가 발생했습니다', 500);
  }
}

// 광고비 삭제
export async function DELETE(request: NextRequest) {
  const user = await requireRole('OWNER', 'MANAGER');
  if (isError(user)) return user;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return apiError('ID가 필요합니다');
  }

  const adCost = await prisma.adCost.findUnique({
    where: { id },
    include: { channel: { select: { name: true } } },
  });
  await prisma.adCost.delete({ where: { id } });

  writeAuditLog({
    userId: user.id,
    userName: user.name,
    action: 'DELETE',
    target: 'AdCost',
    targetId: id,
    summary: `광고비 ${adCost?.channel.name} ${adCost?.date.toISOString().slice(0, 10)} 삭제`,
  });

  return apiSuccess({ deleted: true });
}

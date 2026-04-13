import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isError } from '@/lib/auth-guard';
import { apiPaginated, apiError } from '@/lib/api-response';
import type { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (isError(user)) return user;

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page')) || 1);
    const limit = Math.min(100, Number(searchParams.get('limit')) || 20);
    const recipient = searchParams.get('recipient')?.trim();
    const status = searchParams.get('status')?.trim();

    const where: Prisma.SmsLogWhereInput = {};
    if (recipient) {
      where.recipient = { contains: recipient.replace(/-/g, '') };
    }
    if (status) {
      where.status = status;
    }

    const [total, logs] = await Promise.all([
      prisma.smsLog.count({ where }),
      prisma.smsLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return apiPaginated(logs, { total, page, limit });
  } catch (err) {
    console.error('SMS logs error:', err);
    return apiError('SMS 이력 조회 중 오류가 발생했습니다', 500);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, isError } from '@/lib/auth-guard';
import { writeAuditLog } from '@/lib/audit-log';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET() {
  const user = await requireAuth();
  if (isError(user)) return user;

  const channels = await prisma.channel.findMany({
    include: { _count: { select: { orders: true, dailySales: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const response = NextResponse.json(channels);
  response.headers.set('Cache-Control', 'private, no-cache');
  return response;
}

export async function POST(request: NextRequest) {
  const user = await requireRole('OWNER');
  if (isError(user)) return user;

  const body = await request.json();
  const { name, code, feeRate } = body;

  if (!name || !code) {
    return apiError('채널명과 코드는 필수입니다');
  }

  const channel = await prisma.channel.create({
    data: { name, code, feeRate: feeRate || 0 },
  });

  writeAuditLog({
    userId: user.id,
    userName: user.name,
    action: 'CREATE',
    target: 'Channel',
    targetId: channel.id,
    summary: `채널 '${name}' 생성`,
  });

  return apiSuccess(channel, 201);
}

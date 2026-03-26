import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isError } from '@/lib/auth-guard';
import { apiPaginated } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const user = await requireRole('OWNER');
  if (isError(user)) return user;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const target = searchParams.get('target');
  const action = searchParams.get('action');

  const where: Record<string, unknown> = {};
  if (target) where.target = target;
  if (action) where.action = action;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return apiPaginated(logs, { total, page, limit });
}

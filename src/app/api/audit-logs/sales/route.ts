import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isError } from '@/lib/auth-guard';
import { apiSuccess } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (isError(user)) return user;

  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '10');

  const logs = await prisma.auditLog.findMany({
    where: {
      action: { in: ['API_SYNC', 'EXCEL_UPLOAD'] },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return apiSuccess(logs);
}

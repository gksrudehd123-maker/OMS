import { prisma } from '@/lib/prisma';
import { requireAuth, isError } from '@/lib/auth-guard';
import { apiSuccess } from '@/lib/api-response';

// CS 상태별 카운트
export async function GET() {
  const user = await requireAuth();
  if (isError(user)) return user;

  const counts = await prisma.cSRecord.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  const stats: Record<string, number> = {};
  let total = 0;
  for (const row of counts) {
    stats[row.status] = row._count.id;
    total += row._count.id;
  }
  stats['전체'] = total;

  return apiSuccess(stats);
}

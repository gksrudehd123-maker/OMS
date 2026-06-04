import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isError } from '@/lib/auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';

// 읽음 현황 (OWNER) — 열람자별 읽음 여부 + 읽은 시각
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireRole('OWNER');
  if (isError(user)) return user;

  const doc = await prisma.handoverDoc.findUnique({
    where: { id: params.id },
    select: {
      viewers: {
        select: { userId: true, userName: true },
        orderBy: { userName: 'asc' },
      },
      reads: { select: { userId: true, readAt: true } },
    },
  });

  if (!doc) return apiError('문서를 찾을 수 없습니다', 404);

  const readMap = new Map(doc.reads.map((r) => [r.userId, r.readAt]));

  const status = doc.viewers.map((v) => ({
    userId: v.userId,
    userName: v.userName,
    isRead: readMap.has(v.userId),
    readAt: readMap.get(v.userId) ?? null,
  }));

  return apiSuccess(status);
}

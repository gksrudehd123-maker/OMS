import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isError } from '@/lib/auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';

// 읽음 확인 — 본인이 열람자로 지정된 공개 문서에 대해 "확인했습니다" 처리
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireAuth();
  if (isError(user)) return user;

  const doc = await prisma.handoverDoc.findUnique({
    where: { id: params.id },
    select: {
      isPublished: true,
      viewers: { where: { userId: user.id }, select: { id: true } },
    },
  });

  if (!doc) return apiError('문서를 찾을 수 없습니다', 404);
  if (!doc.isPublished || doc.viewers.length === 0) {
    return apiError('이 문서에 접근할 권한이 없습니다', 403);
  }

  const read = await prisma.handoverDocRead.upsert({
    where: { docId_userId: { docId: params.id, userId: user.id } },
    update: {},
    create: {
      docId: params.id,
      userId: user.id,
      userName: user.name,
    },
    select: { readAt: true },
  });

  return apiSuccess({ readAt: read.readAt });
}

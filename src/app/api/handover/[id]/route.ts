import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, isError } from '@/lib/auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';
import { writeAuditLog } from '@/lib/audit-log';

// 단일 문서 조회
// - OWNER: 전체 + 열람자 목록
// - 그 외: 공개 + 본인이 열람자일 때만, 본인 읽음 여부 포함
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireAuth();
  if (isError(user)) return user;

  const doc = await prisma.handoverDoc.findUnique({
    where: { id: params.id },
    include: {
      viewers: { select: { userId: true, userName: true } },
    },
  });

  if (!doc) return apiError('문서를 찾을 수 없습니다', 404);

  if (user.role === 'OWNER') {
    return apiSuccess({ ...doc, canEdit: true });
  }

  const isViewer = doc.viewers.some((v) => v.userId === user.id);
  if (!doc.isPublished || !isViewer) {
    return apiError('이 문서에 접근할 권한이 없습니다', 403);
  }

  const read = await prisma.handoverDocRead.findUnique({
    where: { docId_userId: { docId: doc.id, userId: user.id } },
    select: { readAt: true },
  });

  return apiSuccess({
    id: doc.id,
    title: doc.title,
    category: doc.category,
    content: doc.content,
    createdByName: doc.createdByName,
    updatedAt: doc.updatedAt,
    canEdit: false,
    isRead: !!read,
    readAt: read?.readAt ?? null,
  });
}

// 문서 수정 (OWNER) — 제목/카테고리/본문/공개여부/정렬/열람자
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireRole('OWNER');
  if (isError(user)) return user;

  try {
    const existing = await prisma.handoverDoc.findUnique({
      where: { id: params.id },
      select: { id: true, title: true },
    });
    if (!existing) return apiError('문서를 찾을 수 없습니다', 404);

    const body = await request.json();

    const data: Prisma.HandoverDocUpdateInput = {};
    if (typeof body.title === 'string') {
      const t = body.title.trim();
      if (!t) return apiError('제목은 비울 수 없습니다');
      data.title = t;
    }
    if (body.category !== undefined) {
      data.category = body.category?.trim() || null;
    }
    if (body.content !== undefined) {
      data.content = body.content as Prisma.InputJsonValue;
    }
    if (body.isPublished !== undefined) {
      data.isPublished = Boolean(body.isPublished);
    }
    if (body.sortOrder !== undefined) {
      data.sortOrder = Number(body.sortOrder) || 0;
    }

    // 열람자 교체
    if (Array.isArray(body.viewerIds)) {
      const viewerUsers = body.viewerIds.length
        ? await prisma.user.findMany({
            where: { id: { in: body.viewerIds } },
            select: { id: true, name: true },
          })
        : [];
      await prisma.handoverDocViewer.deleteMany({
        where: { docId: params.id },
      });
      if (viewerUsers.length) {
        await prisma.handoverDocViewer.createMany({
          data: viewerUsers.map((u) => ({
            docId: params.id,
            userId: u.id,
            userName: u.name,
          })),
          skipDuplicates: true,
        });
      }
    }

    const doc = await prisma.handoverDoc.update({
      where: { id: params.id },
      data,
      include: { viewers: { select: { userId: true, userName: true } } },
    });

    await writeAuditLog({
      userId: user.id,
      userName: user.name,
      action: 'UPDATE',
      target: 'HandoverDoc',
      targetId: doc.id,
      summary: `인수인계 문서 '${doc.title}' 수정`,
    });

    return apiSuccess({ ...doc, canEdit: true });
  } catch (err) {
    console.error('HandoverDoc update error:', err);
    return apiError('문서 수정 중 오류가 발생했습니다', 500);
  }
}

// 문서 삭제 (OWNER)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireRole('OWNER');
  if (isError(user)) return user;

  try {
    const existing = await prisma.handoverDoc.findUnique({
      where: { id: params.id },
      select: { title: true },
    });
    if (!existing) return apiError('문서를 찾을 수 없습니다', 404);

    await prisma.handoverDoc.delete({ where: { id: params.id } });

    await writeAuditLog({
      userId: user.id,
      userName: user.name,
      action: 'DELETE',
      target: 'HandoverDoc',
      targetId: params.id,
      summary: `인수인계 문서 '${existing.title}' 삭제`,
    });

    return apiSuccess({ id: params.id });
  } catch (err) {
    console.error('HandoverDoc delete error:', err);
    return apiError('문서 삭제 중 오류가 발생했습니다', 500);
  }
}

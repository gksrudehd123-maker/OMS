import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, isError } from '@/lib/auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';
import { writeAuditLog } from '@/lib/audit-log';

// 인수인계 문서 목록
// - OWNER: 전체 문서 (임시저장 포함) + 열람자/읽음 수
// - 그 외: 공개 + 본인이 열람자로 지정된 문서만 + 본인 읽음 여부
export async function GET() {
  const user = await requireAuth();
  if (isError(user)) return user;

  if (user.role === 'OWNER') {
    const docs = await prisma.handoverDoc.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        title: true,
        category: true,
        isPublished: true,
        sortOrder: true,
        createdByName: true,
        updatedAt: true,
        _count: { select: { viewers: true, reads: true } },
      },
    });
    return apiSuccess(docs);
  }

  const docs = await prisma.handoverDoc.findMany({
    where: {
      isPublished: true,
      viewers: { some: { userId: user.id } },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      title: true,
      category: true,
      sortOrder: true,
      updatedAt: true,
      reads: { where: { userId: user.id }, select: { id: true } },
    },
  });

  const result = docs.map((d) => ({
    id: d.id,
    title: d.title,
    category: d.category,
    sortOrder: d.sortOrder,
    updatedAt: d.updatedAt,
    isRead: d.reads.length > 0,
  }));

  return apiSuccess(result);
}

// 인수인계 문서 생성 (OWNER)
export async function POST(request: NextRequest) {
  const user = await requireRole('OWNER');
  if (isError(user)) return user;

  try {
    const body = await request.json();
    const title = (body.title ?? '').trim();
    if (!title) {
      return apiError('제목은 필수입니다');
    }

    const viewerIds: string[] = Array.isArray(body.viewerIds)
      ? body.viewerIds
      : [];

    // 정렬 순서: 같은 카테고리 내 마지막
    const last = await prisma.handoverDoc.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    // 열람자 이름 매핑
    const viewerUsers = viewerIds.length
      ? await prisma.user.findMany({
          where: { id: { in: viewerIds } },
          select: { id: true, name: true },
        })
      : [];

    const doc = await prisma.handoverDoc.create({
      data: {
        title,
        category: body.category?.trim() || null,
        content: (body.content ?? []) as Prisma.InputJsonValue,
        isPublished: Boolean(body.isPublished),
        sortOrder: (last?.sortOrder ?? 0) + 1,
        createdById: user.id,
        createdByName: user.name,
        viewers: {
          create: viewerUsers.map((u) => ({
            userId: u.id,
            userName: u.name,
          })),
        },
      },
      select: { id: true, title: true },
    });

    await writeAuditLog({
      userId: user.id,
      userName: user.name,
      action: 'CREATE',
      target: 'HandoverDoc',
      targetId: doc.id,
      summary: `인수인계 문서 '${doc.title}' 생성`,
    });

    return apiSuccess(doc);
  } catch (err) {
    console.error('HandoverDoc create error:', err);
    return apiError('문서 생성 중 오류가 발생했습니다', 500);
  }
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isError } from '@/lib/auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';

// 템플릿 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireAuth();
  if (isError(user)) return user;

  try {
    const body = await request.json();
    const { title, body: templateBody } = body;

    if (!title?.trim() || !templateBody?.trim()) {
      return apiError('제목과 본문은 필수입니다');
    }

    const template = await prisma.messageTemplate.update({
      where: { id: params.id },
      data: { title: title.trim(), body: templateBody.trim() },
    });

    return apiSuccess(template);
  } catch (err) {
    console.error('Template update error:', err);
    return apiError('템플릿 수정 중 오류가 발생했습니다', 500);
  }
}

// 템플릿 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireAuth();
  if (isError(user)) return user;

  try {
    await prisma.messageTemplate.delete({
      where: { id: params.id },
    });

    return apiSuccess({ deleted: true });
  } catch (err) {
    console.error('Template delete error:', err);
    return apiError('템플릿 삭제 중 오류가 발생했습니다', 500);
  }
}

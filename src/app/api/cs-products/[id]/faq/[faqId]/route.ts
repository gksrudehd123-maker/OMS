import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isError } from '@/lib/auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';

// FAQ 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; faqId: string } },
) {
  const user = await requireAuth();
  if (isError(user)) return user;

  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.question !== undefined) data.question = body.question.trim();
    if (body.answer !== undefined) data.answer = body.answer.trim();

    const faq = await prisma.cSProductFAQ.update({
      where: { id: params.faqId },
      data,
    });

    return apiSuccess(faq);
  } catch (err) {
    console.error('CSProductFAQ update error:', err);
    return apiError('FAQ 수정 중 오류가 발생했습니다', 500);
  }
}

// FAQ 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; faqId: string } },
) {
  const user = await requireAuth();
  if (isError(user)) return user;

  try {
    await prisma.cSProductFAQ.delete({ where: { id: params.faqId } });
    return apiSuccess({ deleted: true });
  } catch (err) {
    console.error('CSProductFAQ delete error:', err);
    return apiError('FAQ 삭제 중 오류가 발생했습니다', 500);
  }
}

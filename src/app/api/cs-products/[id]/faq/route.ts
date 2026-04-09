import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isError } from '@/lib/auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';

// FAQ 추가
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireAuth();
  if (isError(user)) return user;

  try {
    const body = await request.json();
    if (!body.question?.trim() || !body.answer?.trim()) {
      return apiError('질문과 답변은 필수입니다');
    }

    const faq = await prisma.cSProductFAQ.create({
      data: {
        productId: params.id,
        question: body.question.trim(),
        answer: body.answer.trim(),
      },
    });

    return apiSuccess(faq);
  } catch (err) {
    console.error('CSProductFAQ create error:', err);
    return apiError('FAQ 추가 중 오류가 발생했습니다', 500);
  }
}

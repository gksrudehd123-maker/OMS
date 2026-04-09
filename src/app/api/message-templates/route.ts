import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isError } from '@/lib/auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';

// 템플릿 목록 조회
export async function GET() {
  const user = await requireAuth();
  if (isError(user)) return user;

  const templates = await prisma.messageTemplate.findMany({
    orderBy: { updatedAt: 'desc' },
  });

  return apiSuccess(templates);
}

// 템플릿 생성
export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (isError(user)) return user;

  try {
    const body = await request.json();
    const { title, body: templateBody } = body;

    if (!title?.trim() || !templateBody?.trim()) {
      return apiError('제목과 본문은 필수입니다');
    }

    const template = await prisma.messageTemplate.create({
      data: { title: title.trim(), body: templateBody.trim() },
    });

    return apiSuccess(template);
  } catch (err) {
    console.error('Template create error:', err);
    return apiError('템플릿 생성 중 오류가 발생했습니다', 500);
  }
}

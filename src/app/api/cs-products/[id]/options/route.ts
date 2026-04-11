import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isError } from '@/lib/auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';

// 옵션 추가
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireAuth();
  if (isError(user)) return user;

  try {
    const body = await request.json();
    if (!body.name?.trim()) {
      return apiError('옵션명은 필수입니다');
    }

    const contents: string[] = Array.isArray(body.contents)
      ? body.contents.map((c: string) => String(c).trim()).filter(Boolean)
      : [];

    const option = await prisma.cSProductOption.create({
      data: {
        productId: params.id,
        name: body.name.trim(),
        price: body.price ? parseInt(body.price) : null,
        contents,
      },
    });

    return apiSuccess(option);
  } catch (err) {
    console.error('CSProductOption create error:', err);
    return apiError('옵션 추가 중 오류가 발생했습니다', 500);
  }
}

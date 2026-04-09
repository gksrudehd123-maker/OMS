import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isError } from '@/lib/auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';

// 구성품 추가
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireAuth();
  if (isError(user)) return user;

  try {
    const body = await request.json();
    if (!body.name?.trim()) {
      return apiError('구성품명은 필수입니다');
    }

    const part = await prisma.cSProductPart.create({
      data: {
        productId: params.id,
        name: body.name.trim(),
        price: body.price ? parseInt(body.price) : null,
        storeUrl: body.storeUrl?.trim() || null,
      },
    });

    return apiSuccess(part);
  } catch (err) {
    console.error('CSProductPart create error:', err);
    return apiError('구성품 추가 중 오류가 발생했습니다', 500);
  }
}

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isError } from '@/lib/auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';

// 상품 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireAuth();
  if (isError(user)) return user;

  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = body.name.trim();
    if (body.brand !== undefined) data.brand = body.brand.trim();
    if (body.price !== undefined)
      data.price = body.price ? parseInt(body.price) : null;
    if (body.imageUrl !== undefined)
      data.imageUrl = body.imageUrl?.trim() || null;
    if (body.storeUrl !== undefined)
      data.storeUrl = body.storeUrl?.trim() || null;
    if (body.description !== undefined)
      data.description = body.description?.trim() || null;

    const product = await prisma.cSProduct.update({
      where: { id: params.id },
      data,
      include: { parts: true, faqs: true },
    });

    return apiSuccess(product);
  } catch (err) {
    console.error('CSProduct update error:', err);
    return apiError('상품 수정 중 오류가 발생했습니다', 500);
  }
}

// 상품 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireAuth();
  if (isError(user)) return user;

  try {
    await prisma.cSProduct.delete({ where: { id: params.id } });
    return apiSuccess({ deleted: true });
  } catch (err) {
    console.error('CSProduct delete error:', err);
    return apiError('상품 삭제 중 오류가 발생했습니다', 500);
  }
}

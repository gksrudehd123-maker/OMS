import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isError } from '@/lib/auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';

// 구성품 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; partId: string } },
) {
  const user = await requireAuth();
  if (isError(user)) return user;

  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = body.name.trim();
    if (body.price !== undefined)
      data.price = body.price ? parseInt(body.price) : null;
    if (body.storeUrl !== undefined)
      data.storeUrl = body.storeUrl?.trim() || null;

    const part = await prisma.cSProductPart.update({
      where: { id: params.partId },
      data,
    });

    return apiSuccess(part);
  } catch (err) {
    console.error('CSProductPart update error:', err);
    return apiError('구성품 수정 중 오류가 발생했습니다', 500);
  }
}

// 구성품 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; partId: string } },
) {
  const user = await requireAuth();
  if (isError(user)) return user;

  try {
    await prisma.cSProductPart.delete({ where: { id: params.partId } });
    return apiSuccess({ deleted: true });
  } catch (err) {
    console.error('CSProductPart delete error:', err);
    return apiError('구성품 삭제 중 오류가 발생했습니다', 500);
  }
}

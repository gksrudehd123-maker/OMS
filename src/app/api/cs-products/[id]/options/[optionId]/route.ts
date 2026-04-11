import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isError } from '@/lib/auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';

// 옵션 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; optionId: string } },
) {
  const user = await requireAuth();
  if (isError(user)) return user;

  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = body.name.trim();
    if (body.price !== undefined)
      data.price = body.price ? parseInt(body.price) : null;
    if (body.contents !== undefined) {
      data.contents = Array.isArray(body.contents)
        ? body.contents.map((c: string) => String(c).trim()).filter(Boolean)
        : [];
    }

    const option = await prisma.cSProductOption.update({
      where: { id: params.optionId },
      data,
    });

    return apiSuccess(option);
  } catch (err) {
    console.error('CSProductOption update error:', err);
    return apiError('옵션 수정 중 오류가 발생했습니다', 500);
  }
}

// 옵션 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string; optionId: string } },
) {
  const user = await requireAuth();
  if (isError(user)) return user;

  try {
    await prisma.cSProductOption.delete({ where: { id: params.optionId } });
    return apiSuccess({ deleted: true });
  } catch (err) {
    console.error('CSProductOption delete error:', err);
    return apiError('옵션 삭제 중 오류가 발생했습니다', 500);
  }
}

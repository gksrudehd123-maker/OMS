import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isError } from '@/lib/auth-guard';

// PATCH /api/keywords/[id] — 메인 키워드 설정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireAuth();
  if (isError(user)) return user;

  const body = await request.json();
  const { isMain } = body;

  if (typeof isMain !== 'boolean') {
    return NextResponse.json(
      { error: 'isMain 값이 필요합니다' },
      { status: 400 },
    );
  }

  const keyword = await prisma.productKeyword.findUnique({
    where: { id: params.id },
  });

  if (!keyword) {
    return NextResponse.json(
      { error: '키워드를 찾을 수 없습니다' },
      { status: 404 },
    );
  }

  // 같은 상품의 다른 키워드 isMain 해제 후 설정
  if (isMain) {
    await prisma.productKeyword.updateMany({
      where: { productId: keyword.productId, isMain: true },
      data: { isMain: false },
    });
  }

  const updated = await prisma.productKeyword.update({
    where: { id: params.id },
    data: { isMain },
  });

  return NextResponse.json(updated);
}

// DELETE /api/keywords/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireAuth();
  if (isError(user)) return user;

  await prisma.productKeyword.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}

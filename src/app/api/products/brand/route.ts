import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, isError } from '@/lib/auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';

// 미분류 상품 목록 조회
export async function GET() {
  const user = await requireAuth();
  if (isError(user)) return user;

  const unclassified = await prisma.product.findMany({
    where: {
      brand: null,
      brandNone: false,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      optionInfo: true,
      thumbnailUrl: true,
    },
    orderBy: { name: 'asc' },
  });

  return apiSuccess(unclassified);
}

// 브랜드 분류 저장
export async function PATCH(request: NextRequest) {
  const user = await requireRole('OWNER', 'MANAGER');
  if (isError(user)) return user;

  const body = await request.json();
  const { productId, brand, brandCategory, brandNone } = body;

  if (!productId) {
    return apiError('상품 ID는 필수입니다');
  }

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    return apiError('상품을 찾을 수 없습니다', 404);
  }

  if (brandNone) {
    // 해당사항 없음
    const updated = await prisma.product.update({
      where: { id: productId },
      data: { brand: null, brandCategory: null, brandNone: true },
    });
    return apiSuccess(updated);
  }

  if (!brand) {
    return apiError('브랜드를 선택해주세요');
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data: { brand, brandCategory: brandCategory || null, brandNone: false },
  });

  return apiSuccess(updated);
}

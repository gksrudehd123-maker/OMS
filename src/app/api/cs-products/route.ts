import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isError } from '@/lib/auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';

// 상품 목록 조회
export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (isError(user)) return user;

  const { searchParams } = new URL(request.url);
  const brand = searchParams.get('brand');
  const search = searchParams.get('search');

  const where: Record<string, unknown> = {};
  if (brand) where.brand = brand;
  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  const products = await prisma.cSProduct.findMany({
    where,
    include: {
      parts: { orderBy: { sortOrder: 'asc' } },
      faqs: { orderBy: { sortOrder: 'asc' } },
    },
    orderBy: { sortOrder: 'asc' },
  });

  return apiSuccess(products);
}

// 상품 추가
export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (isError(user)) return user;

  try {
    const body = await request.json();
    const { name, brand } = body;

    if (!name?.trim() || !brand?.trim()) {
      return apiError('상품명과 브랜드는 필수입니다');
    }

    const product = await prisma.cSProduct.create({
      data: {
        name: name.trim(),
        brand: brand.trim(),
        price: body.price ? parseInt(body.price) : null,
        imageUrl: body.imageUrl?.trim() || null,
        storeUrl: body.storeUrl?.trim() || null,
        description: body.description?.trim() || null,
      },
      include: { parts: true, faqs: true },
    });

    return apiSuccess(product);
  } catch (err) {
    console.error('CSProduct create error:', err);
    return apiError('상품 추가 중 오류가 발생했습니다', 500);
  }
}

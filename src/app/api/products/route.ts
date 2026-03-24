import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isError } from '@/lib/auth-guard';

export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (isError(user)) return user;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search') || '';
  const active = searchParams.get('active');
  const channelId = searchParams.get('channelId') || '';

  const conditions: Record<string, unknown>[] = [];

  if (search) {
    conditions.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { optionInfo: { contains: search, mode: 'insensitive' } },
      ],
    });
  }

  if (active !== null && active !== '') {
    conditions.push({ isActive: active === 'true' });
  }

  if (channelId) {
    conditions.push({
      OR: [
        { orders: { some: { channelId } } },
        { dailySales: { some: { channelId } } },
      ],
    });
  }

  const where = conditions.length > 0 ? { AND: conditions } : {};

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        _count: { select: { orders: true, dailySales: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  const response = NextResponse.json({ products, total, page, limit });
  response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return response;
}

export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (isError(user)) return user;

  const body = await request.json();
  const {
    name,
    optionInfo = '',
    categoryId,
    costPrice,
    sellingPrice,
    memo,
  } = body;

  if (!name) {
    return NextResponse.json({ error: '상품명은 필수입니다' }, { status: 400 });
  }

  const productKey = `${name.trim()}|${optionInfo.trim()}`;

  const existing = await prisma.product.findUnique({ where: { productKey } });
  if (existing) {
    return NextResponse.json(
      { error: '이미 존재하는 상품+옵션 조합입니다' },
      { status: 409 },
    );
  }

  const product = await prisma.product.create({
    data: {
      name,
      optionInfo,
      productKey,
      categoryId,
      costPrice,
      sellingPrice,
      memo,
    },
  });

  return NextResponse.json(product, { status: 201 });
}

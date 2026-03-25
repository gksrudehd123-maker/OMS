import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isError } from '@/lib/auth-guard';

// GET /api/keywords?productId=xxx
// 상품의 키워드 목록 + 최신 순위
export async function GET(request: NextRequest) {
  const user = await requireAuth();
  if (isError(user)) return user;

  const productId = new URL(request.url).searchParams.get('productId');
  if (!productId) {
    return NextResponse.json({ error: 'productId가 필요합니다' }, { status: 400 });
  }

  const keywords = await prisma.productKeyword.findMany({
    where: { productId },
    include: {
      ranks: {
        orderBy: { date: 'desc' },
        take: 2, // 최신 + 전일 (변동 계산용)
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const result = keywords.map((kw) => {
    const latest = kw.ranks[0] || null;
    const prev = kw.ranks[1] || null;
    const change = latest?.rank != null && prev?.rank != null
      ? prev.rank - latest.rank // 양수 = 순위 상승
      : null;

    return {
      id: kw.id,
      keyword: kw.keyword,
      latestRank: latest?.rank ?? null,
      latestPage: latest?.page ?? null,
      latestDate: latest?.date ?? null,
      change,
      createdAt: kw.createdAt,
    };
  });

  return NextResponse.json(result);
}

// POST /api/keywords
// 키워드 등록
export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (isError(user)) return user;

  const { productId, keyword } = await request.json();

  if (!productId || !keyword?.trim()) {
    return NextResponse.json({ error: '상품ID와 키워드가 필요합니다' }, { status: 400 });
  }

  // 중복 체크
  const existing = await prisma.productKeyword.findUnique({
    where: { productId_keyword: { productId, keyword: keyword.trim() } },
  });
  if (existing) {
    return NextResponse.json({ error: '이미 등록된 키워드입니다' }, { status: 400 });
  }

  const created = await prisma.productKeyword.create({
    data: { productId, keyword: keyword.trim() },
  });

  return NextResponse.json(created, { status: 201 });
}

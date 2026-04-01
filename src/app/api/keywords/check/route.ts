import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isError } from '@/lib/auth-guard';
import { checkKeywordRank } from '@/lib/naver/shopping-search';

// POST /api/keywords/check
// 키워드 순위 실시간 조회 + DB 저장
// body: { keywordId: string }
export async function POST(request: NextRequest) {
  const user = await requireAuth();
  if (isError(user)) return user;

  const { keywordId } = await request.json();

  if (!keywordId) {
    return NextResponse.json(
      { error: 'keywordId가 필요합니다' },
      { status: 400 },
    );
  }

  const storeName = process.env.NAVER_STORE_NAME;
  if (!storeName) {
    return NextResponse.json(
      { error: 'NAVER_STORE_NAME 환경 변수가 필요합니다' },
      { status: 500 },
    );
  }

  const kw = await prisma.productKeyword.findUnique({
    where: { id: keywordId },
    include: { product: { select: { storeProductId: true } } },
  });

  if (!kw) {
    return NextResponse.json(
      { error: '키워드를 찾을 수 없습니다' },
      { status: 404 },
    );
  }

  const result = await checkKeywordRank(
    kw.keyword,
    storeName,
    kw.product.storeProductId || undefined,
  );

  // KST 기준 오늘 날짜
  const now = new Date();
  const kstDate = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const today = new Date(kstDate.toISOString().split('T')[0] + 'T00:00:00.000Z');

  // 매칭된 상품 썸네일/storeProductId 업데이트
  if (result.matchedItem) {
    await prisma.product.update({
      where: { id: kw.productId },
      data: {
        thumbnailUrl: result.matchedItem.image,
        ...(result.matchedItem.productId && !kw.product.storeProductId
          ? { storeProductId: result.matchedItem.productId }
          : {}),
      },
    });
  }

  // 오늘 날짜로 upsert
  const saved = await prisma.keywordRank.upsert({
    where: { keywordId_date: { keywordId, date: today } },
    create: {
      keywordId,
      rank: result.rank,
      page: result.page,
      date: today,
    },
    update: {
      rank: result.rank,
      page: result.page,
    },
  });

  return NextResponse.json({
    ...result,
    saved: {
      id: saved.id,
      date: saved.date,
    },
  });
}

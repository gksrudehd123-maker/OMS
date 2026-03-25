import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkKeywordRank } from '@/lib/naver/shopping-search';

// POST /api/keywords/check-all
// 전체 키워드 일괄 순위 조회 (스케줄러용, 인증 없음)
export async function POST() {
  const storeName = process.env.NAVER_STORE_NAME;
  if (!storeName) {
    return NextResponse.json({ error: 'NAVER_STORE_NAME 환경 변수가 필요합니다' }, { status: 500 });
  }

  const keywords = await prisma.productKeyword.findMany({
    include: { product: { select: { storeProductId: true } } },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results = [];
  for (const kw of keywords) {
    try {
      const result = await checkKeywordRank(
        kw.keyword,
        storeName,
        kw.product.storeProductId || undefined,
      );

      await prisma.keywordRank.upsert({
        where: { keywordId_date: { keywordId: kw.id, date: today } },
        create: {
          keywordId: kw.id,
          rank: result.rank,
          page: result.page,
          date: today,
        },
        update: {
          rank: result.rank,
          page: result.page,
        },
      });

      results.push({ keyword: kw.keyword, rank: result.rank, success: true });

      // API 호출 간격 (rate limit 방지)
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      results.push({
        keyword: kw.keyword,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    total: keywords.length,
    checked: results.filter((r) => r.success).length,
    results,
  });
}

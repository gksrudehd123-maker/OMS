import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isError } from '@/lib/auth-guard';

// GET /api/keywords/[id]/history
// 키워드 순위 이력 (최근 30일)
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireAuth();
  if (isError(user)) return user;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const ranks = await prisma.keywordRank.findMany({
    where: {
      keywordId: params.id,
      date: { gte: thirtyDaysAgo },
    },
    orderBy: { date: 'asc' },
    select: {
      rank: true,
      page: true,
      date: true,
    },
  });

  return NextResponse.json(ranks);
}

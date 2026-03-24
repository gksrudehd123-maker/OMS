import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isError } from '@/lib/auth-guard';

// 생성된 리포트 목록 조회
export async function GET() {
  const user = await requireAuth();
  if (isError(user)) return user;

  const reports = await prisma.generatedReport.findMany({
    select: {
      id: true,
      type: true,
      periodFrom: true,
      periodTo: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json(reports);
}

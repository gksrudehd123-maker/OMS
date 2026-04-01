import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, isError } from '@/lib/auth-guard';

// 생성된 리포트 상세 조회 (데이터 포함)
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireAuth();
  if (isError(user)) return user;

  const report = await prisma.generatedReport.findUnique({
    where: { id: params.id },
  });

  if (!report) {
    return NextResponse.json(
      { error: '리포트를 찾을 수 없습니다' },
      { status: 404 },
    );
  }

  return NextResponse.json(report);
}

// 생성된 리포트 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireRole('OWNER', 'MANAGER');
  if (isError(user)) return user;

  await prisma.generatedReport.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

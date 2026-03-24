import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isError } from '@/lib/auth-guard';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireAuth();
  if (isError(user)) return user;

  const upload = await prisma.upload.findUnique({
    where: { id: params.id },
    include: { channel: true, orders: { take: 100 } },
  });

  if (!upload) {
    return NextResponse.json(
      { error: '업로드를 찾을 수 없습니다' },
      { status: 404 },
    );
  }

  return NextResponse.json(upload);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  await prisma.upload.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

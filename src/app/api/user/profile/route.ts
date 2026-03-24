import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isError } from '@/lib/auth-guard';

export async function PATCH(request: NextRequest) {
  const user = await requireAuth();
  if (isError(user)) return user;

  const body = await request.json();
  const { name } = body;

  if (!name || !name.trim()) {
    return NextResponse.json(
      { error: '이름을 입력해주세요' },
      { status: 400 },
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    select: { id: true, name: true, email: true },
    data: { name: name.trim() },
  });

  return NextResponse.json(updated);
}

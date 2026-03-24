import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { compare, hash } from 'bcryptjs';
import { requireAuth, isError } from '@/lib/auth-guard';

export async function PUT(request: NextRequest) {
  const user = await requireAuth();
  if (isError(user)) return user;

  const body = await request.json();
  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { error: '현재 비밀번호와 새 비밀번호를 입력해주세요' },
      { status: 400 },
    );
  }

  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: '새 비밀번호는 6자 이상이어야 합니다' },
      { status: 400 },
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { password: true },
  });

  if (!dbUser) {
    return NextResponse.json(
      { error: '사용자를 찾을 수 없습니다' },
      { status: 404 },
    );
  }

  const isValid = await compare(currentPassword, dbUser.password);
  if (!isValid) {
    return NextResponse.json(
      { error: '현재 비밀번호가 올바르지 않습니다' },
      { status: 400 },
    );
  }

  const hashedPassword = await hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  return NextResponse.json({ success: true });
}

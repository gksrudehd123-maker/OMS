import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isError } from '@/lib/auth-guard';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireRole('OWNER');
  if (isError(user)) return user;

  const body = await request.json();
  const { name, role, allowedChannels } = body;

  // 자기 자신의 역할은 변경 불가
  if (role && params.id === user.id) {
    return NextResponse.json(
      { error: '자신의 역할은 변경할 수 없습니다' },
      { status: 400 },
    );
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (role !== undefined) data.role = role;
  if (allowedChannels !== undefined) data.allowedChannels = allowedChannels;

  const updated = await prisma.user.update({
    where: { id: params.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      allowedChannels: true,
      createdAt: true,
    },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireRole('OWNER');
  if (isError(user)) return user;

  // 자기 자신은 삭제 불가
  if (params.id === user.id) {
    return NextResponse.json(
      { error: '자신의 계정은 삭제할 수 없습니다' },
      { status: 400 },
    );
  }

  await prisma.user.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}

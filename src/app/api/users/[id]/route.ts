import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isError } from '@/lib/auth-guard';
import { writeAuditLog, diffChanges } from '@/lib/audit-log';

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

  const before = await prisma.user.findUnique({
    where: { id: params.id },
    select: { name: true, role: true, allowedChannels: true },
  });
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

  const changes = before ? diffChanges(before as unknown as Record<string, unknown>, data) : undefined;
  writeAuditLog({
    userId: user.id,
    userName: user.name,
    action: 'UPDATE',
    target: 'User',
    targetId: params.id,
    summary: `사용자 '${updated.name}' 정보 수정`,
    changes,
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

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { name: true, email: true },
  });
  await prisma.user.delete({ where: { id: params.id } });

  writeAuditLog({
    userId: user.id,
    userName: user.name,
    action: 'DELETE',
    target: 'User',
    targetId: params.id,
    summary: `사용자 '${target?.name}' (${target?.email}) 삭제`,
  });

  return NextResponse.json({ success: true });
}

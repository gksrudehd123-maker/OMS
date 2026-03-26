import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isError } from '@/lib/auth-guard';
import { writeAuditLog, diffChanges } from '@/lib/audit-log';
import { apiSuccess } from '@/lib/api-response';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireRole('OWNER');
  if (isError(user)) return user;

  const body = await request.json();

  const before = await prisma.channel.findUnique({ where: { id: params.id } });
  const channel = await prisma.channel.update({
    where: { id: params.id },
    data: body,
  });

  const changes = before ? diffChanges(before as unknown as Record<string, unknown>, body) : undefined;
  writeAuditLog({
    userId: user.id,
    userName: user.name,
    action: 'UPDATE',
    target: 'Channel',
    targetId: params.id,
    summary: `채널 '${channel.name}' 수정`,
    changes,
  });

  return apiSuccess(channel);
}

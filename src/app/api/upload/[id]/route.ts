import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, isError } from '@/lib/auth-guard';
import { writeAuditLog } from '@/lib/audit-log';
import { apiSuccess, apiError } from '@/lib/api-response';

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
    return apiError('업로드를 찾을 수 없습니다', 404);
  }

  return apiSuccess(upload);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireRole('OWNER', 'MANAGER');
  if (isError(user)) return user;

  const upload = await prisma.upload.findUnique({
    where: { id: params.id },
    select: { fileName: true, channelId: true, totalRows: true },
  });
  await prisma.upload.delete({ where: { id: params.id } });

  writeAuditLog({
    userId: user.id,
    userName: user.name,
    action: 'DELETE',
    target: 'Upload',
    targetId: params.id,
    summary: `업로드 '${upload?.fileName}' 삭제 (${upload?.totalRows}건)`,
  });

  return apiSuccess({ deleted: true });
}

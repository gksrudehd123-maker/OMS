import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, isError } from '@/lib/auth-guard';
import { writeAuditLog, diffChanges } from '@/lib/audit-log';
import { apiSuccess, apiError } from '@/lib/api-response';
import { parseDate } from '@/lib/helpers/date-utils';

// CS 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireAuth();
  if (isError(user)) return user;

  try {
    const body = await request.json();

    const allowedFields = [
      'consultDate',
      'purchaseDate',
      'status',
      'receivedDate',
      'customerName',
      'productName',
      'consultNote',
      'receivedProduct',
      'serviceProgress',
      'shippingDate',
      'customerAddress',
      'customerPhone',
      'chargeType',
      'repairCost',
      'trackingNumber',
    ];

    const dateFields = [
      'consultDate',
      'purchaseDate',
      'receivedDate',
      'shippingDate',
    ];

    const data: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) {
        if (dateFields.includes(key)) {
          data[key] = body[key] ? parseDate(body[key]) : null;
        } else if (key === 'repairCost') {
          data[key] = body[key] ? parseInt(body[key]) : null;
        } else {
          data[key] = body[key] || null;
        }
      }
    }

    const before = await prisma.cSRecord.findUnique({
      where: { id: params.id },
    });
    if (!before) {
      return apiError('CS 데이터를 찾을 수 없습니다', 404);
    }

    const record = await prisma.cSRecord.update({
      where: { id: params.id },
      data,
    });

    const changes = diffChanges(
      before as unknown as Record<string, unknown>,
      data,
    );
    writeAuditLog({
      userId: user.id,
      userName: user.name,
      action: 'UPDATE',
      target: 'CSRecord',
      targetId: params.id,
      summary: `CS 수정 - ${record.customerName} / ${record.productName}`,
      changes,
    });

    return apiSuccess(record);
  } catch (err) {
    console.error('CS update error:', err);
    return apiError('CS 수정 중 오류가 발생했습니다', 500);
  }
}

// CS 삭제 (OWNER만)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireRole('OWNER');
  if (isError(user)) return user;

  const record = await prisma.cSRecord.findUnique({
    where: { id: params.id },
  });
  if (!record) {
    return apiError('CS 데이터를 찾을 수 없습니다', 404);
  }

  await prisma.cSRecord.delete({ where: { id: params.id } });

  writeAuditLog({
    userId: user.id,
    userName: user.name,
    action: 'DELETE',
    target: 'CSRecord',
    targetId: params.id,
    summary: `CS 삭제 - ${record.customerName} / ${record.productName}`,
  });

  return apiSuccess({ deleted: true });
}

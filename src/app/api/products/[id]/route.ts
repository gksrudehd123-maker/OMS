import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, isError, isStaff } from '@/lib/auth-guard';
import { writeAuditLog, diffChanges } from '@/lib/audit-log';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireAuth();
  if (isError(user)) return user;

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      _count: { select: { orders: true, dailySales: true } },
    },
  });

  if (!product) {
    return apiError('상품을 찾을 수 없습니다', 404);
  }

  if (isStaff(user)) {
    const { costPrice: _, feeRate: _f, shippingCost: _s, freeShippingMin: _fm, couponDiscount: _cd, fulfillmentFee: _ff, ...rest } = product;
    return apiSuccess(rest);
  }

  return apiSuccess(product);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireRole('OWNER', 'MANAGER');
  if (isError(user)) return user;

  const body = await request.json();

  // 허용된 필드만 업데이트
  const allowedFields = [
    'sellingPrice', 'costPrice', 'feeRate', 'shippingCost',
    'freeShippingMin', 'couponDiscount', 'fulfillmentFee',
    'memo', 'isActive', 'categoryId',
  ];
  const data: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) {
      data[key] = body[key];
    }
  }

  const before = await prisma.product.findUnique({ where: { id: params.id } });
  const product = await prisma.product.update({
    where: { id: params.id },
    data,
  });

  const changes = before ? diffChanges(before as unknown as Record<string, unknown>, data) : undefined;
  writeAuditLog({
    userId: user.id,
    userName: user.name,
    action: 'UPDATE',
    target: 'Product',
    targetId: params.id,
    summary: `상품 '${product.name}' 수정`,
    changes,
  });

  return apiSuccess(product);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireRole('OWNER', 'MANAGER');
  if (isError(user)) return user;

  const product = await prisma.product.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  writeAuditLog({
    userId: user.id,
    userName: user.name,
    action: 'DELETE',
    target: 'Product',
    targetId: params.id,
    summary: `상품 '${product.name}' 비활성화`,
  });

  return apiSuccess(product);
}

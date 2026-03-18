import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      _count: { select: { orders: true } },
    },
  });

  if (!product) {
    return NextResponse.json(
      { error: '상품을 찾을 수 없습니다' },
      { status: 404 },
    );
  }

  return NextResponse.json(product);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await request.json();

  const product = await prisma.product.update({
    where: { id: params.id },
    data: body,
  });

  return NextResponse.json(product);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const product = await prisma.product.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  return NextResponse.json(product);
}

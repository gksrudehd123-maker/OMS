import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, isError } from '@/lib/auth-guard';

// DELETE /api/keywords/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const user = await requireAuth();
  if (isError(user)) return user;

  await prisma.productKeyword.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}

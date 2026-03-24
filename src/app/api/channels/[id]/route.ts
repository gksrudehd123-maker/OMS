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

  const channel = await prisma.channel.update({
    where: { id: params.id },
    data: body,
  });

  return NextResponse.json(channel);
}

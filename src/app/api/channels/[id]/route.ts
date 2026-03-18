import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const body = await request.json();

  const channel = await prisma.channel.update({
    where: { id: params.id },
    data: body,
  });

  return NextResponse.json(channel);
}

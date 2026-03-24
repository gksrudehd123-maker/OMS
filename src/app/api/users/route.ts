import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, isError } from '@/lib/auth-guard';

export async function GET() {
  const user = await requireRole('OWNER');
  if (isError(user)) return user;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      allowedChannels: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(users);
}

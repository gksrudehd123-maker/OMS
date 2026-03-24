import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 첫 번째 사용자 등록이 필요한지 확인 (인증 불필요)
export async function GET() {
  const userCount = await prisma.user.count();
  return NextResponse.json({ allowRegister: userCount === 0 });
}

import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireRole, isError } from '@/lib/auth-guard';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate Limiting (분당 10회 — 브루트포스 방어)
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown';
    const limited = rateLimit(`register:${ip}`, 10);
    if (limited) return limited;

    // 첫 번째 가입자(OWNER 생성)만 공개 허용, 이후는 OWNER만 사용자 추가 가능
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      const owner = await requireRole('OWNER');
      if (isError(owner)) return owner;
    }

    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: '이메일, 비밀번호, 이름은 필수입니다' },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: '비밀번호는 8자 이상이어야 합니다' },
        { status: 400 },
      );
    }

    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: '비밀번호는 영문과 숫자를 모두 포함해야 합니다' },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: '이미 등록된 이메일입니다' },
        { status: 409 },
      );
    }

    const role = userCount === 0 ? 'OWNER' : 'STAFF';

    const hashedPassword = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: '회원가입 중 오류가 발생했습니다' },
      { status: 500 },
    );
  }
}

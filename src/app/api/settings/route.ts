import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, isError } from '@/lib/auth-guard';

// 설정 키 목록
const VALID_KEYS = ['defaultShippingCost', 'defaultFreeShippingMin'];

export async function GET() {
  const user = await requireAuth();
  if (isError(user)) return user;

  try {
    const settings = await prisma.setting.findMany({
      where: { key: { in: VALID_KEYS } },
    });

    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }

    const response = NextResponse.json(result);
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    return response;
  } catch (err) {
    console.error('Settings GET error:', err);
    return NextResponse.json(
      { error: '설정 조회 중 오류가 발생했습니다' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const user = await requireRole('OWNER');
  if (isError(user)) return user;

  try {
    const body = await request.json();

    const updates: { key: string; value: string }[] = [];
    for (const key of VALID_KEYS) {
      if (key in body) {
        updates.push({ key, value: String(body[key]) });
      }
    }

    for (const { key, value } of updates) {
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Settings PUT error:', err);
    return NextResponse.json(
      { error: '설정 저장 중 오류가 발생했습니다' },
      { status: 500 },
    );
  }
}

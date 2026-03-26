import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireRole, isError } from '@/lib/auth-guard';
import { writeAuditLog } from '@/lib/audit-log';
import { apiSuccess, apiError } from '@/lib/api-response';

// 설정 키 목록
const VALID_KEYS = ['defaultShippingCost', 'defaultFreeShippingMin', 'autoReportSchedule'];

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

    return NextResponse.json(result);
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

    const beforeSettings = await prisma.setting.findMany({
      where: { key: { in: updates.map((u) => u.key) } },
    });
    const beforeMap: Record<string, string> = {};
    for (const s of beforeSettings) beforeMap[s.key] = s.value;

    for (const { key, value } of updates) {
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }

    const changedKeys = updates.filter((u) => beforeMap[u.key] !== u.value);
    if (changedKeys.length > 0) {
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      for (const { key, value } of changedKeys) {
        changes[key] = { from: beforeMap[key] ?? null, to: value };
      }
      writeAuditLog({
        userId: user.id,
        userName: user.name,
        action: 'UPDATE',
        target: 'Setting',
        summary: `설정 변경: ${changedKeys.map((c) => c.key).join(', ')}`,
        changes,
      });
    }

    return apiSuccess({ saved: true });
  } catch (err) {
    console.error('Settings PUT error:', err);
    return apiError('설정 저장 중 오류가 발생했습니다', 500);
  }
}

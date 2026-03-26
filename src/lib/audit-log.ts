import { prisma } from '@/lib/prisma';

type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

type AuditParams = {
  userId?: string;
  userName?: string;
  action: AuditAction;
  target: string;
  targetId?: string;
  summary: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
};

export async function writeAuditLog(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        userName: params.userName,
        action: params.action,
        target: params.target,
        targetId: params.targetId,
        summary: params.summary,
        changes: params.changes ? JSON.parse(JSON.stringify(params.changes)) : undefined,
      },
    });
  } catch {
    // 감사 로그 실패가 원래 작업을 막으면 안 됨
    console.error('[AuditLog] 기록 실패:', params.summary);
  }
}

/** 두 객체를 비교해서 변경된 필드만 추출 */
export function diffChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, { from: unknown; to: unknown }> | undefined {
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  for (const key of Object.keys(after)) {
    const fromVal = before[key];
    const toVal = after[key];
    if (String(fromVal) !== String(toVal)) {
      changes[key] = { from: fromVal, to: toVal };
    }
  }

  return Object.keys(changes).length > 0 ? changes : undefined;
}

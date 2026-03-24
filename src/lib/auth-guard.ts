import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

// 인증 확인 — 로그인 필수
export async function requireAuth(): Promise<SessionUser | NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 });
  }
  return session.user as SessionUser;
}

// 역할 확인 — 특정 역할 이상만 허용
export async function requireRole(
  ...roles: string[]
): Promise<SessionUser | NextResponse> {
  const result = await requireAuth();
  if (result instanceof NextResponse) return result;

  if (!roles.includes(result.role)) {
    return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 });
  }
  return result;
}

// 타입 가드: NextResponse인지 확인
export function isError(result: SessionUser | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}

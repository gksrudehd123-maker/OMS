import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  allowedChannels: string[];
};

// 인증 확인 — 로그인 필수 + Rate Limiting
export async function requireAuth(): Promise<SessionUser | NextResponse> {
  const headersList = headers();
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const limited = rateLimit(ip);
  if (limited) return limited;

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
    return NextResponse.json(
      { error: '접근 권한이 없습니다' },
      { status: 403 },
    );
  }
  return result;
}

// 채널 접근 권한 확인 — 요청된 channelId가 사용자의 허용 채널에 포함되는지 검증
export function checkChannelAccess(
  user: SessionUser,
  channelId: string | null,
): NextResponse | null {
  if (!channelId) return null; // 전체 조회 — 쿼리 필터로 처리
  if (user.role === 'OWNER') return null;
  if (user.allowedChannels.length === 0) return null; // 빈 배열 = 전체 허용
  if (user.allowedChannels.includes(channelId)) return null;
  return NextResponse.json(
    { error: '해당 채널에 접근 권한이 없습니다' },
    { status: 403 },
  );
}

// 사용자의 허용 채널 조건을 Prisma where에 추가
export function getChannelFilter(user: SessionUser): string[] | null {
  if (user.role === 'OWNER') return null;
  if (user.allowedChannels.length === 0) return null;
  return user.allowedChannels;
}

// STAFF 역할 여부 확인 — 민감 데이터(원가, 마진, 수수료) 차단용
export function isStaff(user: SessionUser): boolean {
  return user.role === 'STAFF';
}

// 타입 가드: NextResponse인지 확인
export function isError(
  result: SessionUser | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}

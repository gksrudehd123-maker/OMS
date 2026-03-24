import { NextResponse } from 'next/server';

type RateLimitEntry = {
  count: number;
  resetTime: number;
};

const store = new Map<string, RateLimitEntry>();

// 만료된 항목 주기적 정리 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (now > entry.resetTime) store.delete(key);
  });
}, 60_000);

/**
 * IP 기반 인메모리 Rate Limiter
 * @param ip - 클라이언트 IP
 * @param limit - 윈도우당 최대 요청 수 (기본 60)
 * @param windowMs - 윈도우 크기 ms (기본 60초)
 * @returns 초과 시 429 NextResponse, 허용 시 null
 */
export function rateLimit(
  ip: string,
  limit = 60,
  windowMs = 60_000,
): NextResponse | null {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetTime) {
    store.set(ip, { count: 1, resetTime: now + windowMs });
    return null;
  }

  entry.count++;

  if (entry.count > limit) {
    return NextResponse.json(
      { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429 },
    );
  }

  return null;
}

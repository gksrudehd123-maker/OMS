import { NextRequest, NextResponse } from 'next/server';
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

const handler = NextAuth(authOptions);

// Rate Limiting 래퍼 (로그인 브루트포스 방어 — 분당 10회)
async function rateLimitedHandler(req: NextRequest, ctx: { params: { nextauth: string[] } }) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const limited = rateLimit(`auth:${ip}`, 10);
  if (limited) return limited;
  return handler(req as unknown as Request, ctx) as Promise<NextResponse>;
}

export { rateLimitedHandler as GET, rateLimitedHandler as POST };

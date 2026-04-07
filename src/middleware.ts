import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// STAFF가 접근 가능한 경로
const STAFF_ALLOWED = ['/cs', '/api/cs', '/api/auth'];

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role as string | undefined;

    // STAFF는 허용된 경로만 접근 가능
    if (role === 'STAFF') {
      const allowed = STAFF_ALLOWED.some((path) => pathname.startsWith(path));
      if (!allowed) {
        const url = req.nextUrl.clone();
        url.pathname = '/cs';
        return NextResponse.redirect(url);
      }
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: '/login',
    },
  },
);

export const config = {
  matcher: [
    // 대시보드 및 모든 보호 페이지
    '/((?!login|register|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};

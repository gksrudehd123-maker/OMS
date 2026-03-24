import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: [
    // 대시보드 및 모든 보호 페이지
    '/((?!login|register|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};

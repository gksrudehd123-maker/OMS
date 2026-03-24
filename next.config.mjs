import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['xlsx-populate'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
};

// dev 환경에서는 Sentry 비활성화 (컴파일 속도 개선)
const config =
  process.env.NODE_ENV === 'production'
    ? withSentryConfig(nextConfig, {
        org: 'gksrudehd123',
        project: 'javascript-nextjs',
        silent: !process.env.CI,
        widenClientFileUpload: true,
      })
    : nextConfig;

export default config;

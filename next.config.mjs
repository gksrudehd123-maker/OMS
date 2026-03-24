import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['xlsx-populate'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
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

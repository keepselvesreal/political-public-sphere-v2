/*
목차:
- Next.js 설정
- i18n 다국어 지원 설정
- ESLint 빌드 시 무시 설정
- 이미지 최적화 비활성화
*/

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  i18n: {
    locales: ['ko', 'en'],
    defaultLocale: 'ko',
    localeDetection: false,
  },
};

module.exports = nextConfig;

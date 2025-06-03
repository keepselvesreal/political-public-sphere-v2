/*
목차:
- Next.js 설정
- ESLint 빌드 시 무시 설정
- 이미지 최적화 비활성화
- 단순화된 설정 (청크 문제 해결)
*/

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  // 개발 환경에서 청크 문제 해결을 위한 단순화
  experimental: {
    esmExternals: false,
  },
};

module.exports = nextConfig;

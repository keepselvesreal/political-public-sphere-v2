/*
목차:
- Jest 설정: jsdom 환경, TypeScript 지원, 모듈 매핑
- 테스트 파일 경로 설정
- 변환 설정 (ts-jest)
*/

export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
}; 
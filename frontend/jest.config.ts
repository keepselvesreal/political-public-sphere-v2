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
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { 
      tsconfig: 'tsconfig.json'
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: [
    '<rootDir>/tests/**/*.(test|spec).(ts|tsx|js)',
  ],
}; 
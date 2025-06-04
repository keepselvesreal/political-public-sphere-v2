/**
 * 📋 파일 목차 (tests/api/email-verification.test.ts)
 * ========================================
 * 🎯 주요 역할: 이메일 인증 API TDD 테스트
 * 
 * 📦 구성 요소:
 * - 라인 1-30: 테스트 설정 및 임포트
 * - 라인 32-80: 이메일 발송 API 테스트
 * - 라인 82-130: 인증 코드 검증 API 테스트
 * - 라인 132-180: 에러 처리 테스트
 * 
 * 🔧 주요 기능:
 * - 실제 이메일 발송 기능 테스트
 * - 인증 코드 검증 로직 테스트
 * - 에러 메시지 중복 방지 테스트
 * - API 응답 형식 검증
 * 
 * 마지막 수정: 2025년 06월 03일 19시 56분 (KST)
 */

import { NextRequest } from 'next/server';
import { POST as sendVerificationPOST } from '@/app/api/auth/send-verification/route';
import { POST as verifyEmailPOST } from '@/app/api/auth/verify-email/route';
import { connectDB } from '@/lib/mongoose';
import User from '@/lib/models/User';
import EmailVerificationToken from '@/lib/models/EmailVerificationToken';

// 테스트 환경 설정
jest.mock('@/lib/mongoose');
jest.mock('@/lib/models/User');
jest.mock('@/lib/models/EmailVerificationToken');

const mockConnectDB = connectDB as jest.MockedFunction<typeof connectDB>;
const mockUser = User as jest.Mocked<typeof User>;
const mockEmailVerificationToken = EmailVerificationToken as jest.Mocked<typeof EmailVerificationToken>;

describe('🔴 Red 단계: 이메일 인증 API 테스트 (실패 케이스)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
  });

  describe('이메일 발송 API (/api/auth/send-verification)', () => {
    it('신규 사용자에게 이메일 발송 시 실제 이메일이 발송되어야 함', async () => {
      // Given: 신규 사용자 이메일
      const email = 'newuser@test.com';
      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
        headers: { 'Content-Type': 'application/json' },
      });

      // When: 사용자가 존재하지 않는 경우 (404 응답 예상)
      mockUser.findOne.mockResolvedValue(null);

      // Then: 실제 이메일 발송이 이루어져야 함 (현재는 실패할 것)
      const response = await sendVerificationPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200); // 신규 사용자도 성공해야 함
      expect(data.message).toContain('인증 코드가 이메일로 발송되었습니다');
    });

    it('이메일 발송 실패 시 명확한 에러 메시지를 반환해야 함', async () => {
      // Given: 잘못된 이메일 형식
      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        body: JSON.stringify({ email: 'invalid-email' }),
        headers: { 'Content-Type': 'application/json' },
      });

      // When: API 호출
      const response = await sendVerificationPOST(request);
      const data = await response.json();

      // Then: 명확한 에러 메시지 반환
      expect(response.status).toBe(400);
      expect(data.error).toBe('입력 데이터가 올바르지 않습니다');
    });
  });

  describe('인증 코드 검증 API (/api/auth/verify-email)', () => {
    it('잘못된 인증 코드 입력 시 단일 에러 메시지만 반환해야 함', async () => {
      // Given: 잘못된 인증 코드
      const email = 'test@test.com';
      const wrongCode = '123456';
      const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, token: wrongCode }),
        headers: { 'Content-Type': 'application/json' },
      });

      // When: 사용자는 존재하지만 토큰이 잘못된 경우
      mockUser.findOne.mockResolvedValue(null); // 신규 사용자
      mockEmailVerificationToken.findOne.mockResolvedValue(null);

      // Then: 단일 에러 메시지만 반환되어야 함
      const response = await verifyEmailPOST(request);
      const data = await response.json();

      expect(response.status).toBe(404); // 또는 적절한 상태 코드
      expect(data.error).toBeDefined();
      expect(data.error).not.toBe('입력 데이터가 올바르지 않습니다'); // 중복 메시지 방지
    });

    it('유효한 인증 코드로 검증 성공해야 함', async () => {
      // Given: 유효한 인증 코드
      const email = 'test@test.com';
      const validCode = '123456';
      const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, token: validCode }),
        headers: { 'Content-Type': 'application/json' },
      });

      const mockUserData = { _id: 'user123', email, isEmailVerified: false };
      const mockTokenData = { _id: 'token123', token: validCode, isUsed: false, expiresAt: new Date(Date.now() + 3600000) };

      // When: 유효한 사용자와 토큰이 존재하는 경우
      mockUser.findOne.mockResolvedValue(mockUserData);
      mockEmailVerificationToken.findOne.mockResolvedValue(mockTokenData);
      mockUser.findByIdAndUpdate.mockResolvedValue(undefined);
      mockEmailVerificationToken.findByIdAndUpdate.mockResolvedValue(undefined);
      mockUser.findById.mockResolvedValue({ ...mockUserData, isEmailVerified: true });

      // Then: 성공 응답 반환
      const response = await verifyEmailPOST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('이메일 인증이 완료되었습니다');
      expect(data.user.isEmailVerified).toBe(true);
    });
  });

  describe('에러 메시지 중복 방지', () => {
    it('프론트엔드에서 중복 에러 메시지가 표시되지 않아야 함', async () => {
      // Given: 잘못된 형식의 인증 코드 (5자리)
      const email = 'test@test.com';
      const invalidCode = '12345'; // 6자리가 아님
      const request = new NextRequest('http://localhost:3000/api/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ email, token: invalidCode }),
        headers: { 'Content-Type': 'application/json' },
      });

      // When: API 호출
      const response = await verifyEmailPOST(request);
      const data = await response.json();

      // Then: 명확하고 단일한 에러 메시지 반환
      expect(response.status).toBe(400);
      expect(data.error).toBe('입력 데이터가 올바르지 않습니다');
      expect(data.details).toBeDefined(); // 상세 에러 정보 포함
    });
  });
});

describe('🟢 Green 단계: 실제 이메일 발송 기능 테스트', () => {
  it('실제 이메일 서비스 연동 테스트 (환경 변수 확인)', () => {
    // Given: 이메일 서비스 설정
    const emailConfig = {
      service: process.env.EMAIL_SERVICE,
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    };

    // Then: 환경 변수가 설정되어 있어야 함
    expect(emailConfig.service).toBeDefined();
    expect(emailConfig.user).toBeDefined();
    expect(emailConfig.pass).toBeDefined();
  });
}); 
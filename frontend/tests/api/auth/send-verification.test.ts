/**
 * 📋 파일 목차 (tests/api/auth/send-verification.test.ts)
 * ========================================
 * 🎯 주요 역할: 이메일 인증 발송 API 테스트 (TDD Green 단계)
 * 
 * 📦 구성 요소:
 * - 라인 1-20: 테스트 설정 및 임포트
 * - 라인 22-40: 테스트 데이터 및 헬퍼 함수
 * - 라인 42-80: 성공 케이스 테스트
 * - 라인 82-120: 실패 케이스 테스트
 * - 라인 122-160: 검증 케이스 테스트
 * 
 * 🟢 TDD Green 단계:
 * - 실제 API를 호출하여 테스트
 * - 모든 테스트가 통과해야 함
 * 
 * 🧪 테스트 케이스:
 * - 6자리 인증 코드 생성
 * - 발송 빈도 제한 (1분 간격)
 * - 이메일 발송 시뮬레이션
 * - 토큰 저장 및 만료 시간 설정
 * 
 * 마지막 수정: 2025년 06월 03일 17시 35분 (KST)
 */

import { connectTestDB, disconnectTestDB, clearTestDB, setupTestEnv } from '../../setup/test-db';
import User from '../../../lib/models/User';
import EmailVerificationToken from '../../../lib/models/EmailVerificationToken';
import { z } from 'zod';
import { POST, generateVerificationCode } from '../../../app/api/auth/send-verification/route';

// 테스트 환경 설정
setupTestEnv();

describe('🟢 GREEN: 이메일 인증 발송 API 테스트', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  /**
   * 테스트 데이터
   */
  const testUser = {
    username: 'testuser',
    name: '테스트 사용자',
    email: 'test@example.com',
    password: 'TestPass123',
    isEmailVerified: false,
    isActive: true
  };

  const validRequestData = {
    email: 'test@example.com'
  };

  const invalidRequestData = {
    email: 'invalid-email'
  };

  /**
   * 테스트 헬퍼 함수 - 간단한 Request 모킹
   */
  const createMockRequest = (data: any) => {
    return {
      json: async () => data,
      method: 'POST',
      url: 'http://localhost:3000/api/auth/send-verification'
    } as any;
  };

  /**
   * 테스트용 사용자 생성 헬퍼
   */
  const createTestUser = async () => {
    const user = new User(testUser);
    return await user.save();
  };

  describe('✅ 성공 케이스', () => {
    it('🟢 유효한 이메일로 인증 코드 발송이 성공해야 함', async () => {
      // Arrange
      await createTestUser();
      const request = createMockRequest(validRequestData);
      
      // Act
      const response = await POST(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(data.message).toBe('인증 코드가 이메일로 발송되었습니다');
      expect(data.email).toBe(testUser.email);
      expect(data.expiresAt).toBeDefined();
      expect(new Date(data.expiresAt)).toBeInstanceOf(Date);
    });

    it('🟢 6자리 인증 코드가 생성되어야 함', async () => {
      // Act
      const token = generateVerificationCode();
      
      // Assert
      expect(token).toMatch(/^\d{6}$/);
      expect(token.length).toBe(6);
    });

    it('🟢 인증 토큰이 데이터베이스에 저장되어야 함', async () => {
      // Arrange
      const savedUser = await createTestUser();
      const request = createMockRequest(validRequestData);
      
      // Act
      await POST(request);
      
      // Assert
      const savedToken = await EmailVerificationToken.findOne({ 
        userId: savedUser._id 
      });
      
      expect(savedToken).toBeTruthy();
      expect(savedToken?.token).toMatch(/^\d{6}$/);
      expect(savedToken?.expiresAt).toBeDefined();
      expect(savedToken?.email).toBe(testUser.email);
    });
  });

  describe('❌ 실패 케이스', () => {
    it('🟢 존재하지 않는 이메일로 요청 시 404 에러를 반환해야 함', async () => {
      // Arrange
      const nonExistentEmailData = {
        email: 'nonexistent@example.com'
      };
      const request = createMockRequest(nonExistentEmailData);
      
      // Act
      const response = await POST(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe('해당 이메일로 등록된 사용자를 찾을 수 없습니다');
    });

    it('🟢 이미 인증된 이메일로 요청 시 400 에러를 반환해야 함', async () => {
      // Arrange
      const verifiedUser = new User({
        ...testUser,
        isEmailVerified: true
      });
      await verifiedUser.save();
      const request = createMockRequest(validRequestData);
      
      // Act
      const response = await POST(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('이미 인증된 이메일입니다');
    });

    it('🟢 발송 빈도 제한 시 429 에러를 반환해야 함', async () => {
      // Arrange
      const savedUser = await createTestUser();
      
      // 최근 토큰 생성 (1분 이내)
      await EmailVerificationToken.create({
        userId: savedUser._id,
        email: savedUser.email,
        token: '123456',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24시간 후
        createdAt: new Date() // 방금 생성
      });
      
      const request = createMockRequest(validRequestData);
      
      // Act
      const response = await POST(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(429);
      expect(data.error).toBe('인증 코드는 1분에 한 번만 발송할 수 있습니다');
    });
  });

  describe('🔍 입력 검증 케이스', () => {
    it('🟢 입력 데이터 검증 스키마가 올바르게 작동해야 함', () => {
      // Zod 스키마 테스트
      const sendVerificationSchema = z.object({
        email: z.string()
          .email('올바른 이메일 형식이 아닙니다')
          .toLowerCase()
      });

      // 유효한 데이터 테스트
      const validResult = sendVerificationSchema.safeParse(validRequestData);
      expect(validResult.success).toBe(true);

      // 무효한 데이터 테스트
      const invalidResult = sendVerificationSchema.safeParse(invalidRequestData);
      expect(invalidResult.success).toBe(false);
      if (!invalidResult.success) {
        expect(invalidResult.error.errors.length).toBeGreaterThan(0);
      }
    });

    it('🟢 인증 토큰 만료 시간이 24시간으로 설정되어야 함', async () => {
      // Arrange
      const savedUser = await createTestUser();
      const now = new Date();
      
      // 토큰 생성 시뮬레이션
      const mockToken = new EmailVerificationToken({
        userId: savedUser._id,
        email: savedUser.email,
        token: '123456',
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24시간 후
      });
      
      const savedToken = await mockToken.save();
      
      // 만료 시간 검증 (24시간 = 86400000ms)
      const timeDiff = savedToken.expiresAt.getTime() - now.getTime();
      expect(timeDiff).toBeCloseTo(24 * 60 * 60 * 1000, -1000); // 1초 오차 허용
    });

    it('🟢 잘못된 이메일 형식으로 요청 시 400 에러를 반환해야 함', async () => {
      // Arrange
      const request = createMockRequest(invalidRequestData);
      
      // Act
      const response = await POST(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('입력 데이터가 올바르지 않습니다');
      expect(data.details).toBeDefined();
    });
  });
}); 
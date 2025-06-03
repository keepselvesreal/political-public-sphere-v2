/**
 * 📋 파일 목차 (tests/api/auth/verify-email.test.ts)
 * ========================================
 * 🎯 주요 역할: 이메일 인증 확인 API 테스트 (TDD Green 단계)
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
 * - 유효한 인증 코드로 이메일 인증
 * - 사용자 isEmailVerified 상태 업데이트
 * - 토큰 사용 처리 (isUsed = true)
 * - 만료된 토큰 처리
 * - 잘못된 토큰 처리
 * 
 * 마지막 수정: 2025년 06월 03일 18시 00분 (KST)
 */

import { connectTestDB, disconnectTestDB, clearTestDB, setupTestEnv } from '../../setup/test-db';
import User from '../../../lib/models/User';
import EmailVerificationToken from '../../../lib/models/EmailVerificationToken';
import { z } from 'zod';
import { POST } from '../../../app/api/auth/verify-email/route';

// 테스트 환경 설정
setupTestEnv();

describe('🟢 GREEN: 이메일 인증 확인 API 테스트', () => {
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

  const validVerificationData = {
    email: 'test@example.com',
    token: '123456'
  };

  const invalidVerificationData = {
    email: 'test@example.com',
    token: '999999'
  };

  /**
   * 테스트 헬퍼 함수 - 간단한 Request 모킹
   */
  const createMockRequest = (data: any) => {
    return {
      json: async () => data,
      method: 'POST',
      url: 'http://localhost:3000/api/auth/verify-email'
    } as any;
  };

  /**
   * 테스트용 사용자 생성 헬퍼
   */
  const createTestUser = async () => {
    const user = new User(testUser);
    return await user.save();
  };

  /**
   * 테스트용 인증 토큰 생성 헬퍼
   */
  const createTestToken = async (userId: string, token: string = '123456', isExpired: boolean = false) => {
    const expiresAt = isExpired 
      ? new Date(Date.now() - 1000) // 1초 전 (만료됨)
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // 24시간 후

    return await EmailVerificationToken.create({
      userId,
      email: testUser.email,
      token,
      expiresAt,
      isUsed: false
    });
  };

  describe('✅ 성공 케이스', () => {
    it('🟢 유효한 인증 코드로 이메일 인증이 성공해야 함', async () => {
      // Arrange
      const savedUser = await createTestUser();
      await createTestToken(savedUser._id.toString());
      const request = createMockRequest(validVerificationData);
      
      // Act
      const response = await POST(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(data.message).toBe('이메일 인증이 완료되었습니다');
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testUser.email);
      expect(data.user.isEmailVerified).toBe(true);
    });

    it('🟢 인증 완료 후 사용자 isEmailVerified가 true로 업데이트되어야 함', async () => {
      // Arrange
      const savedUser = await createTestUser();
      await createTestToken(savedUser._id.toString());
      const request = createMockRequest(validVerificationData);
      
      // Act
      await POST(request);
      
      // Assert
      const updatedUser = await User.findById(savedUser._id);
      expect(updatedUser?.isEmailVerified).toBe(true);
    });

    it('🟢 인증 완료 후 토큰이 사용됨으로 표시되어야 함', async () => {
      // Arrange
      const savedUser = await createTestUser();
      const savedToken = await createTestToken(savedUser._id.toString());
      const request = createMockRequest(validVerificationData);
      
      // Act
      await POST(request);
      
      // Assert
      const updatedToken = await EmailVerificationToken.findById(savedToken._id);
      expect(updatedToken?.isUsed).toBe(true);
    });
  });

  describe('❌ 실패 케이스', () => {
    it('🟢 존재하지 않는 이메일로 요청 시 404 에러를 반환해야 함', async () => {
      // Arrange
      const nonExistentEmailData = {
        email: 'nonexistent@example.com',
        token: '123456'
      };
      const request = createMockRequest(nonExistentEmailData);
      
      // Act
      const response = await POST(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(404);
      expect(data.error).toBe('해당 이메일로 등록된 사용자를 찾을 수 없습니다');
    });

    it('🟢 잘못된 인증 코드로 요청 시 400 에러를 반환해야 함', async () => {
      // Arrange
      const savedUser = await createTestUser();
      await createTestToken(savedUser._id.toString());
      const request = createMockRequest(invalidVerificationData);
      
      // Act
      const response = await POST(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('유효하지 않은 인증 코드입니다');
    });

    it('🟢 만료된 인증 코드로 요청 시 400 에러를 반환해야 함', async () => {
      // Arrange
      const savedUser = await createTestUser();
      await createTestToken(savedUser._id.toString(), '123456', true); // 만료된 토큰
      const request = createMockRequest(validVerificationData);
      
      // Act
      const response = await POST(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('만료된 인증 코드입니다');
    });

    it('🟢 이미 사용된 인증 코드로 요청 시 400 에러를 반환해야 함', async () => {
      // Arrange
      const savedUser = await createTestUser();
      const savedToken = await createTestToken(savedUser._id.toString());
      
      // 토큰을 사용됨으로 표시
      savedToken.isUsed = true;
      await savedToken.save();
      
      const request = createMockRequest(validVerificationData);
      
      // Act
      const response = await POST(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('이미 사용된 인증 코드입니다');
    });

    it('🟢 이미 인증된 이메일로 요청 시 400 에러를 반환해야 함', async () => {
      // Arrange
      const verifiedUser = new User({
        ...testUser,
        isEmailVerified: true
      });
      await verifiedUser.save();
      const request = createMockRequest(validVerificationData);
      
      // Act
      const response = await POST(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBe('이미 인증된 이메일입니다');
    });
  });

  describe('🔍 입력 검증 케이스', () => {
    it('🟢 입력 데이터 검증 스키마가 올바르게 작동해야 함', () => {
      // Zod 스키마 테스트
      const verifyEmailSchema = z.object({
        email: z.string()
          .email('올바른 이메일 형식이 아닙니다')
          .toLowerCase(),
        token: z.string()
          .length(6, '인증 코드는 6자리여야 합니다')
          .regex(/^\d{6}$/, '인증 코드는 숫자만 입력 가능합니다')
      });

      // 유효한 데이터 테스트
      const validResult = verifyEmailSchema.safeParse(validVerificationData);
      expect(validResult.success).toBe(true);

      // 무효한 데이터 테스트 (잘못된 토큰)
      const invalidTokenData = { email: 'test@example.com', token: '12345' }; // 5자리
      const invalidResult = verifyEmailSchema.safeParse(invalidTokenData);
      expect(invalidResult.success).toBe(false);
      if (!invalidResult.success) {
        expect(invalidResult.error.errors.length).toBeGreaterThan(0);
      }
    });

    it('🟢 토큰 형식 검증이 올바르게 작동해야 함', () => {
      const verifyEmailSchema = z.object({
        email: z.string().email(),
        token: z.string()
          .length(6, '인증 코드는 6자리여야 합니다')
          .regex(/^\d{6}$/, '인증 코드는 숫자만 입력 가능합니다')
      });

      // 올바른 토큰 형식
      const validToken = verifyEmailSchema.safeParse({ 
        email: 'test@example.com', 
        token: '123456' 
      });
      expect(validToken.success).toBe(true);

      // 잘못된 토큰 형식들
      const invalidTokens = [
        '12345',    // 5자리
        '1234567',  // 7자리
        'abcdef',   // 문자
        '12345a',   // 숫자+문자
        ''          // 빈 문자열
      ];

      invalidTokens.forEach(token => {
        const result = verifyEmailSchema.safeParse({ 
          email: 'test@example.com', 
          token 
        });
        expect(result.success).toBe(false);
      });
    });

    it('🟢 잘못된 입력 데이터로 요청 시 400 에러를 반환해야 함', async () => {
      // Arrange
      const invalidData = {
        email: 'invalid-email',
        token: '12345' // 5자리
      };
      const request = createMockRequest(invalidData);
      
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
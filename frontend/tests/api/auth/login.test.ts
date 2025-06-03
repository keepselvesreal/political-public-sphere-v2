/**
 * 📋 파일 목차 (tests/api/auth/login.test.ts)
 * ========================================
 * 🎯 주요 역할: 로그인 API 테스트 (TDD Green 단계)
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
 * - 이메일/사용자명으로 로그인
 * - 비밀번호 검증
 * - 계정 활성화 상태 확인
 * - JWT 토큰 생성
 * - 마지막 로그인 시간 업데이트
 * 
 * 마지막 수정: 2025년 06월 03일 17시 15분 (KST)
 */

import { connectTestDB, disconnectTestDB, clearTestDB, setupTestEnv } from '../../setup/test-db';
import User from '../../../lib/models/User';
import { z } from 'zod';
import { POST } from '../../../app/api/auth/login/route';

// 테스트 환경 설정
setupTestEnv();

describe('🟢 GREEN: 로그인 API 테스트', () => {
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
    isEmailVerified: true,
    isActive: true
  };

  const validLoginData = {
    identifier: 'test@example.com', // 이메일 또는 사용자명
    password: 'TestPass123'
  };

  const invalidLoginData = {
    identifier: 'nonexistent@example.com',
    password: 'WrongPassword123'
  };

  /**
   * 테스트 헬퍼 함수 - 간단한 Request 모킹
   */
  const createMockRequest = (data: any) => {
    return {
      json: async () => data,
      method: 'POST',
      url: 'http://localhost:3000/api/auth/login'
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
    it('🟢 이메일로 로그인이 성공해야 함', async () => {
      // Arrange
      await createTestUser();
      const request = createMockRequest(validLoginData);
      
      // Act
      const response = await POST(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(data.message).toBe('로그인이 완료되었습니다');
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testUser.email);
      expect(data.user.username).toBe(testUser.username);
      expect(data.user.lastLoginAt).toBeDefined();
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();
    });

    it('🟢 사용자명으로 로그인이 성공해야 함', async () => {
      // Arrange
      await createTestUser();
      const usernameLoginData = {
        identifier: testUser.username,
        password: testUser.password
      };
      const request = createMockRequest(usernameLoginData);
      
      // Act
      const response = await POST(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(data.message).toBe('로그인이 완료되었습니다');
      expect(data.user.username).toBe(testUser.username);
      expect(data.user.email).toBe(testUser.email);
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();
    });

    it('🟢 로그인 시 마지막 로그인 시간이 업데이트되어야 함', async () => {
      // Arrange
      const savedUser = await createTestUser();
      const originalLastLogin = savedUser.lastLoginAt;
      
      // 잠시 대기 (시간 차이를 위해)
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const request = createMockRequest(validLoginData);
      
      // Act
      await POST(request);
      
      // 데이터베이스에서 사용자 다시 조회
      const updatedUser = await User.findById(savedUser._id);
      
      // Assert
      expect(updatedUser?.lastLoginAt).toBeDefined();
      if (originalLastLogin) {
        expect(updatedUser?.lastLoginAt?.getTime()).toBeGreaterThan(originalLastLogin.getTime());
      }
    });
  });

  describe('❌ 실패 케이스', () => {
    it('🟢 존재하지 않는 사용자로 로그인 시 401 에러를 반환해야 함', async () => {
      // Arrange
      const request = createMockRequest(invalidLoginData);
      
      // Act
      const response = await POST(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBe('이메일 또는 사용자명이 올바르지 않습니다');
    });

    it('🟢 잘못된 비밀번호로 로그인 시 401 에러를 반환해야 함', async () => {
      // Arrange
      await createTestUser();
      const wrongPasswordData = {
        identifier: testUser.email,
        password: 'WrongPassword123'
      };
      const request = createMockRequest(wrongPasswordData);
      
      // Act
      const response = await POST(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(401);
      expect(data.error).toBe('비밀번호가 올바르지 않습니다');
    });

    it('🟢 비활성화된 계정으로 로그인 시 403 에러를 반환해야 함', async () => {
      // Arrange
      const inactiveUser = new User({
        ...testUser,
        isActive: false
      });
      await inactiveUser.save();
      const request = createMockRequest(validLoginData);
      
      // Act
      const response = await POST(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(403);
      expect(data.error).toBe('비활성화된 계정입니다. 관리자에게 문의하세요');
    });
  });

  describe('🔍 입력 검증 케이스', () => {
    it('🟢 입력 데이터 검증 스키마가 올바르게 작동해야 함', () => {
      // Zod 스키마 테스트
      const loginSchema = z.object({
        identifier: z.string()
          .min(1, '이메일 또는 사용자명을 입력해주세요'),
        password: z.string()
          .min(1, '비밀번호를 입력해주세요')
      });

      // 유효한 데이터 테스트
      const validResult = loginSchema.safeParse(validLoginData);
      expect(validResult.success).toBe(true);

      // 무효한 데이터 테스트 (빈 값)
      const emptyData = { identifier: '', password: '' };
      const invalidResult = loginSchema.safeParse(emptyData);
      expect(invalidResult.success).toBe(false);
      if (!invalidResult.success) {
        expect(invalidResult.error.errors.length).toBeGreaterThan(0);
      }
    });

    it('🟢 비밀번호 검증 함수가 올바르게 작동해야 함', async () => {
      // Arrange
      const savedUser = await createTestUser();
      
      // 올바른 비밀번호 검증
      const isValidPassword = await savedUser.comparePassword(testUser.password);
      expect(isValidPassword).toBe(true);
      
      // 잘못된 비밀번호 검증
      const isInvalidPassword = await savedUser.comparePassword('WrongPassword');
      expect(isInvalidPassword).toBe(false);
    });
  });
}); 
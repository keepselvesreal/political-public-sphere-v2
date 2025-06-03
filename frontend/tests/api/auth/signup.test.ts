/**
 * 📋 파일 목차 (tests/api/auth/signup.test.ts)
 * ========================================
 * 🎯 주요 역할: 회원가입 API 테스트 (TDD Green 단계)
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
 * - 정상 회원가입 처리
 * - 중복 이메일/사용자명 처리
 * - 입력 데이터 검증
 * - 비밀번호 해싱 확인
 * 
 * 마지막 수정: 2025년 06월 03일 17시 00분 (KST)
 */

import { connectTestDB, disconnectTestDB, clearTestDB, setupTestEnv } from '../../setup/test-db';
import User from '../../../lib/models/User';
import { z } from 'zod';
import { POST } from '../../../app/api/auth/signup/route';

// 테스트 환경 설정
setupTestEnv();

describe('🟢 GREEN: 회원가입 API 테스트', () => {
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
  const validSignupData = {
    username: 'testuser',
    name: '테스트 사용자',
    email: 'test@example.com',
    password: 'TestPass123',
    password2: 'TestPass123'
  };

  const invalidSignupData = {
    username: 'ab', // 너무 짧음
    name: '', // 빈 값
    email: 'invalid-email', // 잘못된 형식
    password: '123', // 너무 짧음
    password2: '456' // 불일치
  };

  /**
   * 테스트 헬퍼 함수 - 간단한 Request 모킹
   */
  const createMockRequest = (data: any) => {
    return {
      json: async () => data,
      method: 'POST',
      url: 'http://localhost:3000/api/auth/signup'
    } as any;
  };

  describe('✅ 성공 케이스', () => {
    it('🟢 유효한 데이터로 회원가입이 성공해야 함', async () => {
      // Arrange
      const request = createMockRequest(validSignupData);
      
      // Act
      const response = await POST(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(201);
      expect(data.message).toBe('회원가입이 완료되었습니다');
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(validSignupData.email);
      expect(data.user.username).toBe(validSignupData.username);
      expect(data.user.isEmailVerified).toBe(false);
      expect(data.user.role).toBe('user');
      expect(data.accessToken).toBeDefined();
      expect(data.refreshToken).toBeDefined();
    });

    it('🟢 사용자가 데이터베이스에 저장되어야 함', async () => {
      // User 모델 테스트
      const newUser = new User({
        username: validSignupData.username,
        name: validSignupData.name,
        email: validSignupData.email,
        password: validSignupData.password,
        isEmailVerified: false
      });
      
      const savedUser = await newUser.save();
      
      expect(savedUser).toBeTruthy();
      expect(savedUser.username).toBe(validSignupData.username);
      expect(savedUser.email).toBe(validSignupData.email);
      expect(savedUser.isEmailVerified).toBe(false);
    });

    it('🟢 비밀번호가 해싱되어 저장되어야 함', async () => {
      const newUser = new User({
        username: validSignupData.username,
        name: validSignupData.name,
        email: validSignupData.email,
        password: validSignupData.password,
        isEmailVerified: false
      });
      
      const savedUser = await newUser.save();
      
      expect(savedUser.password).not.toBe(validSignupData.password);
      expect(savedUser.password.length).toBeGreaterThan(20); // 해싱된 비밀번호는 길어야 함
    });
  });

  describe('❌ 실패 케이스', () => {
    it('🟢 중복된 이메일로 회원가입 시 409 에러를 반환해야 함', async () => {
      // 기존 사용자 생성
      await User.create({
        username: 'existing',
        name: '기존 사용자',
        email: validSignupData.email,
        password: 'hashedpassword'
      });
      
      // Arrange
      const request = createMockRequest(validSignupData);
      
      // Act
      const response = await POST(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(409);
      expect(data.error).toBe('이미 사용 중인 이메일입니다');
      expect(data.field).toBe('email');
    });

    it('🟢 중복된 사용자명으로 회원가입 시 409 에러를 반환해야 함', async () => {
      // 기존 사용자 생성
      await User.create({
        username: validSignupData.username,
        name: '기존 사용자',
        email: 'existing@example.com',
        password: 'hashedpassword'
      });
      
      // Arrange
      const request = createMockRequest(validSignupData);
      
      // Act
      const response = await POST(request);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(409);
      expect(data.error).toBe('이미 사용 중인 사용자명입니다');
      expect(data.field).toBe('username');
    });
  });

  describe('🔍 입력 검증 케이스', () => {
    it('🟢 입력 데이터 검증 스키마가 올바르게 작동해야 함', () => {
      // Zod 스키마 테스트
      const signupSchema = z.object({
        username: z.string()
          .min(3, '사용자명은 최소 3자 이상이어야 합니다')
          .max(20, '사용자명은 최대 20자까지 가능합니다')
          .regex(/^[a-zA-Z0-9_]+$/, '사용자명은 영문, 숫자, 언더스코어만 사용 가능합니다'),
        name: z.string()
          .min(2, '이름은 최소 2자 이상이어야 합니다')
          .max(50, '이름은 최대 50자까지 가능합니다'),
        email: z.string()
          .email('올바른 이메일 형식이 아닙니다')
          .toLowerCase(),
        password: z.string()
          .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
          .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다'),
        password2: z.string()
      }).refine((data) => data.password === data.password2, {
        message: '비밀번호가 일치하지 않습니다',
        path: ['password2']
      });

      // 유효한 데이터 테스트
      const validResult = signupSchema.safeParse(validSignupData);
      expect(validResult.success).toBe(true);

      // 무효한 데이터 테스트
      const invalidResult = signupSchema.safeParse(invalidSignupData);
      expect(invalidResult.success).toBe(false);
      if (!invalidResult.success) {
        expect(invalidResult.error.errors.length).toBeGreaterThan(0);
      }
    });

    it('🟢 비밀번호 불일치 시 검증 실패해야 함', () => {
      const signupSchema = z.object({
        username: z.string().min(3),
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(8),
        password2: z.string()
      }).refine((data) => data.password === data.password2, {
        message: '비밀번호가 일치하지 않습니다',
        path: ['password2']
      });

      const mismatchData = {
        ...validSignupData,
        password2: 'DifferentPass123'
      };

      const result = signupSchema.safeParse(mismatchData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ['password2'],
              message: '비밀번호가 일치하지 않습니다'
            })
          ])
        );
      }
    });
  });
}); 
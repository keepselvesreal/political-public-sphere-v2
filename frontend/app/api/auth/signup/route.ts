/**
 * 📋 파일 목차 (app/api/auth/signup/route.ts)
 * ========================================
 * 🎯 주요 역할: 사용자 회원가입 API 엔드포인트 (TDD Refactor 단계)
 * 
 * 📦 구성 요소:
 * - 라인 1-25: 필수 라이브러리 및 모델 임포트
 * - 라인 27-50: 회원가입 요청 데이터 검증 스키마
 * - 라인 52-70: JWT 토큰 생성 함수
 * - 라인 72-100: 중복 계정 확인 함수
 * - 라인 102-130: 사용자 생성 함수
 * - 라인 132-180: POST 핸들러 (회원가입 처리)
 * 
 * 🔵 TDD Refactor 단계:
 * - 코드 구조 개선 및 가독성 향상
 * - 함수 분리 및 재사용성 증대
 * - 에러 처리 개선
 * - 타입 안전성 강화
 * 
 * 🔧 주요 기능:
 * - 사용자 회원가입 처리
 * - 입력 데이터 검증 (이메일, 사용자명, 비밀번호)
 * - 중복 계정 확인
 * - 비밀번호 해싱 (User 모델에서 자동 처리)
 * - JWT 토큰 생성 및 반환
 * 
 * 마지막 수정: 2025년 06월 03일 17시 05분 (KST)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import User from '@/lib/models/User';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

/**
 * 회원가입 요청 데이터 검증 스키마
 */
export const signupSchema = z.object({
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

export type SignupRequest = z.infer<typeof signupSchema>;

/**
 * JWT 토큰 생성 함수
 */
export function generateTokens(userId: string) {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'test-jwt-secret',
    { expiresIn: '1h' }
  );
  
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret',
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
}

/**
 * 중복 계정 확인 함수
 */
export async function checkDuplicateUser(email: string, username: string) {
  const existingUser = await User.findOne({
    $or: [{ email }, { username }]
  });
  
  if (!existingUser) {
    return null;
  }
  
  const duplicateField = existingUser.email === email ? 'email' : 'username';
  const errorMessage = duplicateField === 'email' 
    ? '이미 사용 중인 이메일입니다' 
    : '이미 사용 중인 사용자명입니다';
    
  return { field: duplicateField, message: errorMessage };
}

/**
 * 새 사용자 생성 함수
 */
export async function createNewUser(userData: Omit<SignupRequest, 'password2'>) {
  const { username, name, email, password } = userData;
  
  const newUser = new User({
    username,
    name,
    email,
    password, // User 모델에서 자동으로 해싱됨
    isEmailVerified: false
  });
  
  const savedUser = await newUser.save();
  
  // 응답용 사용자 데이터 (비밀번호 제외)
  return {
    id: savedUser._id,
    username: savedUser.username,
    name: savedUser.name,
    email: savedUser.email,
    isEmailVerified: savedUser.isEmailVerified,
    role: savedUser.role,
    createdAt: savedUser.createdAt
  };
}

/**
 * POST /api/auth/signup
 * 사용자 회원가입 처리
 */
export async function POST(request: NextRequest) {
  try {
    // MongoDB 연결
    await connectDB();
    
    // 요청 데이터 파싱 및 검증
    const body = await request.json();
    const validationResult = signupSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: '입력 데이터가 올바르지 않습니다',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }
    
    const { username, name, email, password } = validationResult.data;
    
    // 중복 계정 확인
    const duplicateCheck = await checkDuplicateUser(email, username);
    if (duplicateCheck) {
      return NextResponse.json(
        { 
          error: duplicateCheck.message,
          field: duplicateCheck.field
        },
        { status: 409 }
      );
    }
    
    // 새 사용자 생성
    const userResponse = await createNewUser({ username, name, email, password });
    
    // JWT 토큰 생성
    const { accessToken, refreshToken } = generateTokens(userResponse.id.toString());
    
    return NextResponse.json(
      {
        message: '회원가입이 완료되었습니다',
        user: userResponse,
        accessToken,
        refreshToken
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('회원가입 처리 중 오류:', error);
    
    // MongoDB 중복 키 에러 처리 (인덱스 레벨에서 발생)
    if (error instanceof Error && 'code' in error && error.code === 11000) {
      return NextResponse.json(
        { error: '이미 사용 중인 이메일 또는 사용자명입니다' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: '회원가입 처리 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
} 
/**
 * 📋 파일 목차 (app/api/auth/login/route.ts)
 * ========================================
 * 🎯 주요 역할: 사용자 로그인 API 엔드포인트 (TDD Refactor 단계)
 * 
 * 📦 구성 요소:
 * - 라인 1-25: 필수 라이브러리 및 모델 임포트
 * - 라인 27-45: 로그인 요청 데이터 검증 스키마 및 타입
 * - 라인 47-65: 사용자 조회 함수
 * - 라인 67-85: 마지막 로그인 시간 업데이트 함수
 * - 라인 87-110: 로그인 검증 함수
 * - 라인 112-140: 사용자 응답 데이터 생성 함수
 * - 라인 142-190: POST 핸들러 (로그인 처리)
 * 
 * 🔵 TDD Refactor 단계:
 * - 코드 구조 개선 및 가독성 향상
 * - 함수 분리 및 재사용성 증대
 * - 에러 처리 개선
 * - 타입 안전성 강화
 * 
 * 🔧 주요 기능:
 * - 이메일/사용자명으로 로그인 지원
 * - 비밀번호 검증
 * - 계정 활성화 상태 확인
 * - JWT 토큰 생성
 * - 마지막 로그인 시간 업데이트
 * 
 * 마지막 수정: 2025년 06월 03일 17시 20분 (KST)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import User from '@/lib/models/User';
import { z } from 'zod';
import { generateTokens } from '../signup/route';

/**
 * 로그인 요청 데이터 검증 스키마
 */
export const loginSchema = z.object({
  identifier: z.string()
    .min(1, '이메일 또는 사용자명을 입력해주세요')
    .trim(),
  password: z.string()
    .min(1, '비밀번호를 입력해주세요')
});

export type LoginRequest = z.infer<typeof loginSchema>;

/**
 * 로그인 응답 타입
 */
export interface LoginResponse {
  message: string;
  user: {
    id: string;
    username: string;
    name: string;
    email: string;
    isEmailVerified: boolean;
    role: string;
    lastLoginAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}

/**
 * 사용자 조회 함수 (이메일 또는 사용자명으로)
 */
export async function findUserByIdentifier(identifier: string) {
  // 이메일 형식인지 확인 (더 정확한 검증)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmail = emailRegex.test(identifier);
  
  const query = isEmail 
    ? { email: identifier.toLowerCase() }
    : { username: identifier };
    
  return await User.findOne(query);
}

/**
 * 마지막 로그인 시간 업데이트 함수
 */
export async function updateLastLoginTime(userId: string): Promise<void> {
  await User.findByIdAndUpdate(userId, {
    lastLoginAt: new Date()
  });
}

/**
 * 로그인 검증 함수
 */
export async function validateLogin(identifier: string, password: string) {
  // 사용자 조회
  const user = await findUserByIdentifier(identifier);
  if (!user) {
    return { 
      success: false, 
      error: '이메일 또는 사용자명이 올바르지 않습니다',
      status: 401 
    };
  }
  
  // 비밀번호 검증
  const isValidPassword = await user.comparePassword(password);
  if (!isValidPassword) {
    return { 
      success: false, 
      error: '비밀번호가 올바르지 않습니다',
      status: 401 
    };
  }
  
  // 계정 활성화 상태 확인
  if (!user.isActive) {
    return { 
      success: false, 
      error: '비활성화된 계정입니다. 관리자에게 문의하세요',
      status: 403 
    };
  }
  
  return { success: true, user };
}

/**
 * 사용자 응답 데이터 생성 함수
 */
export function createUserResponse(user: any): LoginResponse['user'] {
  return {
    id: user._id.toString(),
    username: user.username,
    name: user.name,
    email: user.email,
    isEmailVerified: user.isEmailVerified,
    role: user.role,
    lastLoginAt: user.lastLoginAt
  };
}

/**
 * POST /api/auth/login
 * 사용자 로그인 처리
 */
export async function POST(request: NextRequest) {
  try {
    // MongoDB 연결
    await connectDB();
    
    // 요청 데이터 파싱 및 검증
    const body = await request.json();
    const validationResult = loginSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: '입력 데이터가 올바르지 않습니다',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }
    
    const { identifier, password } = validationResult.data;
    
    // 로그인 검증
    const loginResult = await validateLogin(identifier, password);
    if (!loginResult.success) {
      return NextResponse.json(
        { error: loginResult.error },
        { status: loginResult.status }
      );
    }
    
    const { user } = loginResult;
    
    // 마지막 로그인 시간 업데이트
    await updateLastLoginTime(user._id.toString());
    
    // 업데이트된 사용자 정보 다시 조회
    const updatedUser = await User.findById(user._id);
    if (!updatedUser) {
      throw new Error('사용자 정보를 찾을 수 없습니다');
    }
    
    // JWT 토큰 생성
    const { accessToken, refreshToken } = generateTokens(user._id.toString());
    
    // 응답 데이터 생성
    const userResponse = createUserResponse(updatedUser);
    
    const response: LoginResponse = {
      message: '로그인이 완료되었습니다',
      user: userResponse,
      accessToken,
      refreshToken
    };
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error) {
    console.error('로그인 처리 중 오류:', error);
    
    return NextResponse.json(
      { error: '로그인 처리 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
} 
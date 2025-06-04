/**
 * 📋 파일 목차 (app/api/auth/verify-email/route.ts)
 * ========================================
 * 🎯 주요 역할: 이메일 인증 확인 API 엔드포인트 (TDD Refactor 단계)
 * 
 * 📦 구성 요소:
 * - 라인 1-25: 필수 라이브러리 및 모델 임포트
 * - 라인 27-55: 요청/응답 데이터 검증 스키마 및 타입
 * - 라인 57-80: 사용자 검증 함수 (신규 사용자 지원)
 * - 라인 82-120: 토큰 검증 함수 (신규 사용자 지원)
 * - 라인 122-145: 이메일 인증 처리 함수
 * - 라인 147-200: POST 핸들러 (인증 확인 처리)
 * 
 * 🔵 TDD Refactor 단계:
 * - 코드 구조 개선 및 가독성 향상
 * - 함수 분리 및 재사용성 증대
 * - 에러 처리 개선
 * - 타입 안전성 강화
 * - 비즈니스 로직 분리
 * - 신규 사용자 인증 지원 추가
 * - 중복 에러 메시지 방지
 * 
 * 🔧 주요 기능:
 * - 6자리 인증 코드 검증
 * - 토큰 만료 시간 확인
 * - 토큰 사용 상태 확인
 * - 사용자 이메일 인증 상태 업데이트
 * - 신규 사용자 임시 토큰 검증
 * - 토큰 사용 처리
 * 
 * 마지막 수정: 2025년 06월 03일 20시 10분 (KST)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import User from '@/lib/models/User';
import EmailVerificationToken from '@/lib/models/EmailVerificationToken';
import { z } from 'zod';

/**
 * 이메일 인증 확인 요청 데이터 검증 스키마
 */
export const verifyEmailSchema = z.object({
  email: z.string()
    .email('올바른 이메일 형식이 아닙니다')
    .toLowerCase()
    .trim(),
  token: z.string()
    .length(6, '인증 코드는 6자리여야 합니다')
    .regex(/^\d{6}$/, '인증 코드는 숫자만 입력 가능합니다')
});

export type VerifyEmailRequest = z.infer<typeof verifyEmailSchema>;

/**
 * 이메일 인증 확인 응답 타입
 */
export interface VerifyEmailResponse {
  message: string;
  user: {
    id: string;
    email: string;
    isEmailVerified: boolean;
  };
}

/**
 * 에러 응답 타입
 */
export interface ErrorResponse {
  error: string;
  details?: any;
}

/**
 * 사용자 검증 함수 (신규 사용자 지원)
 */
export async function validateUserForEmailVerification(email: string) {
  // 사용자 조회
  const user = await User.findOne({ email });
  
  // 신규 사용자인 경우 - 회원가입 과정에서는 허용
  if (!user) {
    return { 
      success: true, 
      user: null, 
      isNewUser: true 
    };
  }
  
  // 기존 사용자이지만 이미 인증된 경우
  if (user.isEmailVerified) {
    return {
      success: false,
      error: '이미 인증된 이메일입니다',
      status: 400
    };
  }
  
  return { 
    success: true, 
    user, 
    isNewUser: false 
  };
}

/**
 * 토큰 검증 함수 (신규 사용자 지원)
 */
export async function validateVerificationToken(email: string, token: string, isNewUser: boolean = false) {
  // 신규 사용자의 경우 userId가 null인 토큰을 찾음
  const searchCondition = isNewUser 
    ? { email: email.toLowerCase(), token, userId: null, isUsed: false, expiresAt: { $gt: new Date() } }
    : { email: email.toLowerCase(), token, isUsed: false, expiresAt: { $gt: new Date() } };
  
  const verificationToken = await EmailVerificationToken.findOne(searchCondition);
  
  if (!verificationToken) {
    // 토큰이 존재하지만 만료되었는지 확인
    const expiredTokenCondition = isNewUser
      ? { email: email.toLowerCase(), token, userId: null }
      : { email: email.toLowerCase(), token };
      
    const expiredToken = await EmailVerificationToken.findOne(expiredTokenCondition);
    
    if (expiredToken) {
      if (expiredToken.isUsed) {
        return {
          success: false,
          error: '이미 사용된 인증 코드입니다',
          status: 400
        };
      } else if (expiredToken.expiresAt <= new Date()) {
        return {
          success: false,
          error: '만료된 인증 코드입니다',
          status: 400
        };
      }
    }
    
    return {
      success: false,
      error: '유효하지 않은 인증 코드입니다',
      status: 400
    };
  }
  
  return { success: true, token: verificationToken };
}

/**
 * 이메일 인증 처리 함수
 */
export async function processEmailVerification(userId: string, tokenId: string) {
  // 사용자 이메일 인증 상태 업데이트
  await User.findByIdAndUpdate(userId, {
    isEmailVerified: true
  });
  
  // 토큰을 사용됨으로 표시
  await EmailVerificationToken.findByIdAndUpdate(tokenId, {
    isUsed: true
  });
  
  // 업데이트된 사용자 정보 반환
  return await User.findById(userId);
}

/**
 * POST /api/auth/verify-email
 * 이메일 인증 확인 처리
 */
export async function POST(request: NextRequest) {
  try {
    // MongoDB 연결
    await connectDB();
    
    // 요청 데이터 파싱 및 검증
    const body = await request.json();
    const validationResult = verifyEmailSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errorResponse: ErrorResponse = {
        error: '입력 데이터가 올바르지 않습니다',
        details: validationResult.error.errors
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }
    
    const { email, token } = validationResult.data;
    
    // 사용자 검증
    const userValidation = await validateUserForEmailVerification(email);
    if (!userValidation.success) {
      const errorResponse: ErrorResponse = { error: userValidation.error! };
      return NextResponse.json(errorResponse, { status: userValidation.status! });
    }
    
    const { user, isNewUser } = userValidation;
    
    // 토큰 검증
    const tokenValidation = await validateVerificationToken(email, token, isNewUser);
    if (!tokenValidation.success) {
      const errorResponse: ErrorResponse = { error: tokenValidation.error! };
      return NextResponse.json(errorResponse, { status: tokenValidation.status! });
    }
    
    const { token: verificationToken } = tokenValidation;
    
    // 이메일 인증 처리 (신규 사용자와 기존 사용자 구분)
    if (isNewUser) {
      // 신규 사용자의 경우 토큰만 사용됨으로 표시
      await EmailVerificationToken.findByIdAndUpdate((verificationToken! as any)._id, {
        isUsed: true
      });
      
      // 응답 데이터 (신규 사용자)
      const response: VerifyEmailResponse = {
        message: '이메일 인증이 완료되었습니다',
        user: {
          id: 'new-user',
          email: email,
          isEmailVerified: true
        }
      };
      
      return NextResponse.json(response, { status: 200 });
    } else {
      // 기존 사용자의 경우 기존 로직 사용
      const updatedUser = await processEmailVerification(
        user._id.toString(),
        (verificationToken! as any)._id.toString()
      );
      
      if (!updatedUser) {
        throw new Error('사용자 정보를 업데이트할 수 없습니다');
      }
      
      // 응답 데이터 (기존 사용자)
      const response: VerifyEmailResponse = {
        message: '이메일 인증이 완료되었습니다',
        user: {
          id: updatedUser._id.toString(),
          email: updatedUser.email,
          isEmailVerified: updatedUser.isEmailVerified
        }
      };
      
      return NextResponse.json(response, { status: 200 });
    }
    
  } catch (error) {
    console.error('이메일 인증 확인 중 오류:', error);
    
    const errorResponse: ErrorResponse = {
      error: '이메일 인증 확인 중 오류가 발생했습니다'
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
} 
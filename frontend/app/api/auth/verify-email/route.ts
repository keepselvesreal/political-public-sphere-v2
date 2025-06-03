/**
 * 📋 파일 목차 (app/api/auth/verify-email/route.ts)
 * ========================================
 * 🎯 주요 역할: 이메일 인증 확인 API 엔드포인트 (TDD Green 단계)
 * 
 * 📦 구성 요소:
 * - 라인 1-25: 필수 라이브러리 및 모델 임포트
 * - 라인 27-50: 요청/응답 데이터 검증 스키마 및 타입
 * - 라인 52-75: 사용자 검증 함수
 * - 라인 77-100: 토큰 검증 함수
 * - 라인 102-125: 이메일 인증 처리 함수
 * - 라인 127-180: POST 핸들러 (인증 확인 처리)
 * 
 * 🟢 TDD Green 단계:
 * - 테스트를 통과시키는 최소한의 코드 작성
 * - 모든 테스트 케이스 만족
 * - 리팩토링은 다음 단계에서 진행
 * 
 * 🔧 주요 기능:
 * - 6자리 인증 코드 검증
 * - 토큰 만료 시간 확인
 * - 토큰 사용 상태 확인
 * - 사용자 이메일 인증 상태 업데이트
 * - 토큰 사용 처리
 * 
 * 마지막 수정: 2025년 06월 03일 17시 55분 (KST)
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
 * 사용자 검증 함수
 */
export async function validateUserForEmailVerification(email: string) {
  // 사용자 조회
  const user = await User.findOne({ email });
  if (!user) {
    return {
      success: false,
      error: '해당 이메일로 등록된 사용자를 찾을 수 없습니다',
      status: 404
    };
  }
  
  // 이미 인증된 이메일 확인
  if (user.isEmailVerified) {
    return {
      success: false,
      error: '이미 인증된 이메일입니다',
      status: 400
    };
  }
  
  return { success: true, user };
}

/**
 * 토큰 검증 함수
 */
export async function validateVerificationToken(email: string, token: string) {
  // 유효한 토큰 찾기 (미사용, 미만료)
  const verificationToken = await EmailVerificationToken.findOne({
    email: email.toLowerCase(),
    token,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  });
  
  if (!verificationToken) {
    // 토큰이 존재하지만 만료되었는지 확인
    const expiredToken = await EmailVerificationToken.findOne({
      email: email.toLowerCase(),
      token
    });
    
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
      return NextResponse.json(
        { 
          error: '입력 데이터가 올바르지 않습니다',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }
    
    const { email, token } = validationResult.data;
    
    // 사용자 검증
    const userValidation = await validateUserForEmailVerification(email);
    if (!userValidation.success) {
      return NextResponse.json(
        { error: userValidation.error },
        { status: userValidation.status }
      );
    }
    
    const { user } = userValidation;
    
    // 토큰 검증
    const tokenValidation = await validateVerificationToken(email, token);
    if (!tokenValidation.success) {
      return NextResponse.json(
        { error: tokenValidation.error },
        { status: tokenValidation.status }
      );
    }
    
    const { token: verificationToken } = tokenValidation;
    
    // 이메일 인증 처리
    const updatedUser = await processEmailVerification(
      user._id.toString(),
      (verificationToken! as any)._id.toString()
    );
    
    if (!updatedUser) {
      throw new Error('사용자 정보를 업데이트할 수 없습니다');
    }
    
    // 응답 데이터
    const response: VerifyEmailResponse = {
      message: '이메일 인증이 완료되었습니다',
      user: {
        id: updatedUser._id.toString(),
        email: updatedUser.email,
        isEmailVerified: updatedUser.isEmailVerified
      }
    };
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error) {
    console.error('이메일 인증 확인 중 오류:', error);
    
    return NextResponse.json(
      { error: '이메일 인증 확인 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
} 
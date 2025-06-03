/**
 * 📋 파일 목차 (app/api/auth/send-verification/route.ts)
 * ========================================
 * 🎯 주요 역할: 이메일 인증 발송 API 엔드포인트 (TDD Refactor 단계)
 * 
 * 📦 구성 요소:
 * - 라인 1-25: 필수 라이브러리 및 모델 임포트
 * - 라인 27-50: 요청/응답 데이터 검증 스키마 및 타입
 * - 라인 52-65: 6자리 인증 코드 생성 함수
 * - 라인 67-85: 발송 빈도 제한 확인 함수
 * - 라인 87-110: 인증 토큰 저장 함수
 * - 라인 112-140: 이메일 발송 시뮬레이션 함수
 * - 라인 142-170: 사용자 검증 함수
 * - 라인 172-220: POST 핸들러 (인증 발송 처리)
 * 
 * 🔵 TDD Refactor 단계:
 * - 코드 구조 개선 및 가독성 향상
 * - 함수 분리 및 재사용성 증대
 * - 에러 처리 개선
 * - 타입 안전성 강화
 * - 비즈니스 로직 분리
 * 
 * 🔧 주요 기능:
 * - 6자리 인증 코드 생성
 * - 발송 빈도 제한 (1분 간격)
 * - 인증 토큰 데이터베이스 저장
 * - 이메일 발송 시뮬레이션
 * - 24시간 만료 시간 설정
 * 
 * 마지막 수정: 2025년 06월 03일 17시 45분 (KST)
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import User from '@/lib/models/User';
import EmailVerificationToken from '@/lib/models/EmailVerificationToken';
import { z } from 'zod';

/**
 * 이메일 인증 발송 요청 데이터 검증 스키마
 */
export const sendVerificationSchema = z.object({
  email: z.string()
    .email('올바른 이메일 형식이 아닙니다')
    .toLowerCase()
    .trim()
});

export type SendVerificationRequest = z.infer<typeof sendVerificationSchema>;

/**
 * 이메일 인증 발송 응답 타입
 */
export interface SendVerificationResponse {
  message: string;
  email: string;
  expiresAt: Date;
}

/**
 * 에러 응답 타입
 */
export interface ErrorResponse {
  error: string;
  details?: any;
}

/**
 * 6자리 인증 코드 생성 함수
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 발송 빈도 제한 확인 함수 (1분 간격)
 */
export async function checkRateLimit(email: string): Promise<boolean> {
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  
  const recentToken = await EmailVerificationToken.findOne({
    email: email.toLowerCase(),
    createdAt: { $gte: oneMinuteAgo }
  });
  
  return recentToken !== null;
}

/**
 * 인증 토큰 저장 함수
 */
export async function saveVerificationToken(
  userId: string, 
  email: string, 
  token: string
): Promise<any> {
  // 기존 토큰 삭제 (같은 사용자의 이전 토큰)
  await EmailVerificationToken.deleteMany({ userId });
  
  // 새 토큰 생성 및 저장
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24시간 후
  
  const verificationToken = new EmailVerificationToken({
    userId,
    email: email.toLowerCase(),
    token,
    expiresAt,
    createdAt: new Date()
  });
  
  return await verificationToken.save();
}

/**
 * 이메일 발송 시뮬레이션 함수
 * 실제 프로덕션에서는 실제 이메일 서비스 연동
 */
export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  // 개발 환경에서는 콘솔에 출력
  console.log(`📧 이메일 인증 코드 발송 시뮬레이션:`);
  console.log(`   받는 사람: ${email}`);
  console.log(`   인증 코드: ${code}`);
  console.log(`   만료 시간: 24시간`);
  
  // 실제 이메일 발송 로직은 여기에 구현
  // 예: SendGrid, AWS SES, Nodemailer 등 사용
  
  // 이메일 템플릿 예시:
  // const emailTemplate = {
  //   to: email,
  //   subject: '이메일 인증 코드',
  //   html: `
  //     <h2>이메일 인증</h2>
  //     <p>아래 인증 코드를 입력하여 이메일 인증을 완료하세요:</p>
  //     <h3 style="color: #007bff;">${code}</h3>
  //     <p>이 코드는 24시간 후에 만료됩니다.</p>
  //   `
  // };
}

/**
 * 사용자 검증 함수
 */
export async function validateUserForVerification(email: string) {
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
 * POST /api/auth/send-verification
 * 이메일 인증 코드 발송 처리
 */
export async function POST(request: NextRequest) {
  try {
    // MongoDB 연결
    await connectDB();
    
    // 요청 데이터 파싱 및 검증
    const body = await request.json();
    const validationResult = sendVerificationSchema.safeParse(body);
    
    if (!validationResult.success) {
      const errorResponse: ErrorResponse = {
        error: '입력 데이터가 올바르지 않습니다',
        details: validationResult.error.errors
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }
    
    const { email } = validationResult.data;
    
    // 사용자 검증
    const userValidation = await validateUserForVerification(email);
    if (!userValidation.success) {
      const errorResponse: ErrorResponse = { error: userValidation.error! };
      return NextResponse.json(errorResponse, { status: userValidation.status! });
    }
    
    const { user } = userValidation;
    
    // 발송 빈도 제한 확인
    const isRateLimited = await checkRateLimit(email);
    if (isRateLimited) {
      const errorResponse: ErrorResponse = {
        error: '인증 코드는 1분에 한 번만 발송할 수 있습니다'
      };
      return NextResponse.json(errorResponse, { status: 429 });
    }
    
    // 6자리 인증 코드 생성
    const verificationCode = generateVerificationCode();
    
    // 인증 토큰 저장
    const savedToken = await saveVerificationToken(
      user._id.toString(), 
      email, 
      verificationCode
    );
    
    // 이메일 발송
    await sendVerificationEmail(email, verificationCode);
    
    // 응답 데이터
    const response: SendVerificationResponse = {
      message: '인증 코드가 이메일로 발송되었습니다',
      email,
      expiresAt: savedToken.expiresAt
    };
    
    return NextResponse.json(response, { status: 200 });
    
  } catch (error) {
    console.error('이메일 인증 발송 중 오류:', error);
    
    const errorResponse: ErrorResponse = {
      error: '이메일 인증 발송 중 오류가 발생했습니다'
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
} 
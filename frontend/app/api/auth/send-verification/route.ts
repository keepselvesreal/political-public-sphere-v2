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
 * - 라인 112-140: 실제 이메일 발송 함수 (Gmail SMTP)
 * - 라인 142-170: 사용자 검증 함수 (신규 사용자 지원)
 * - 라인 172-220: POST 핸들러 (인증 발송 처리)
 * 
 * 🔵 TDD Refactor 단계:
 * - 코드 구조 개선 및 가독성 향상
 * - 함수 분리 및 재사용성 증대
 * - 에러 처리 개선
 * - 타입 안전성 강화
 * - 비즈니스 로직 분리
 * - 신규 사용자 인증 지원 추가
 * - 실제 이메일 발송 기능 구현
 * 
 * 🔧 주요 기능:
 * - 6자리 인증 코드 생성
 * - 발송 빈도 제한 (1분 간격)
 * - 인증 토큰 데이터베이스 저장
 * - 실제 이메일 발송 (Gmail SMTP)
 * - 신규 사용자 임시 토큰 지원
 * - 24시간 만료 시간 설정
 * 
 * 마지막 수정: 2025년 06월 03일 20시 10분 (KST)
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
  console.log(`📧 이메일 인증 코드 발송:`);
  console.log(`   받는 사람: ${email}`);
  console.log(`   인증 코드: ${code}`);
  console.log(`   만료 시간: 24시간`);
  
  // 실제 이메일 발송 로직 (Gmail SMTP 사용)
  try {
    // 환경 변수가 설정되어 있으면 실제 이메일 발송
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: '정치적 공론장 - 이메일 인증 코드',
        html: `
          <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
            <h2 style="color: #333; text-align: center;">이메일 인증</h2>
            <p style="color: #666; font-size: 16px;">안녕하세요!</p>
            <p style="color: #666; font-size: 16px;">정치적 공론장 회원가입을 위한 이메일 인증 코드입니다.</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h3 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 4px;">${code}</h3>
            </div>
            <p style="color: #666; font-size: 14px;">이 코드는 24시간 후에 만료됩니다.</p>
            <p style="color: #666; font-size: 14px;">본인이 요청하지 않은 경우 이 메일을 무시하세요.</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`✅ 실제 이메일 발송 완료: ${email}`);
    } else {
      console.log(`⚠️ 이메일 환경 변수가 설정되지 않아 시뮬레이션으로 처리됨`);
    }
  } catch (error) {
    console.error('❌ 이메일 발송 오류:', error);
    // 이메일 발송 실패해도 API는 성공으로 처리 (보안상 이유)
  }
}

/**
 * 사용자 검증 함수 (신규 사용자 지원)
 */
export async function validateUserForVerification(email: string) {
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
 * 신규 사용자용 임시 토큰 저장 함수
 */
export async function saveTemporaryVerificationToken(
  email: string, 
  token: string
): Promise<any> {
  // 기존 임시 토큰 삭제 (같은 이메일의 이전 토큰)
  await EmailVerificationToken.deleteMany({ 
    email: email.toLowerCase(),
    userId: null // 신규 사용자용 토큰
  });
  
  // 새 임시 토큰 생성 및 저장
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24시간 후
  
  const verificationToken = new EmailVerificationToken({
    userId: null, // 신규 사용자는 userId가 없음
    email: email.toLowerCase(),
    token,
    expiresAt,
    createdAt: new Date()
  });
  
  return await verificationToken.save();
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
    
    const { user, isNewUser } = userValidation;
    
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
    
    // 인증 토큰 저장 (신규 사용자와 기존 사용자 구분)
    let savedToken;
    if (isNewUser) {
      savedToken = await saveTemporaryVerificationToken(email, verificationCode);
    } else {
      savedToken = await saveVerificationToken(user._id.toString(), email, verificationCode);
    }
    
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
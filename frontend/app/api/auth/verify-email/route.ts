/**
 * 📋 파일 목차 (app/api/auth/verify-email/route.ts)
 * ========================================
 * 🎯 주요 역할: 이메일 인증 코드 확인 API 엔드포인트
 * 
 * 📦 구성 요소:
 * - 라인 1-20: 필수 라이브러리 및 모델 임포트
 * - 라인 22-35: 요청 데이터 타입 정의
 * - 라인 37-120: POST 핸들러 (인증 코드 확인)
 * 
 * 🔧 주요 기능:
 * - 이메일 인증 코드 검증
 * - 사용자 이메일 인증 상태 업데이트
 * - 토큰 사용 처리
 * - 인증 완료 응답
 * 
 * 🔒 보안 기능:
 * - 토큰 유효성 검증
 * - 토큰 재사용 방지
 * - 만료 시간 확인
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import EmailVerificationToken from '@/lib/models/EmailVerificationToken';
import User from '@/lib/models/User';
import { z } from 'zod';

/**
 * 이메일 인증 확인 요청 데이터 검증 스키마
 */
const verifyEmailSchema = z.object({
  email: z.string()
    .email('올바른 이메일 형식이 아닙니다')
    .toLowerCase(),
  token: z.string()
    .length(6, '인증 코드는 6자리여야 합니다')
    .regex(/^\d{6}$/, '인증 코드는 숫자만 입력 가능합니다')
});

type VerifyEmailRequest = z.infer<typeof verifyEmailSchema>;

/**
 * POST /api/auth/verify-email
 * 이메일 인증 코드 확인 처리
 */
export async function POST(request: NextRequest) {
  try {
    // MongoDB 연결
    await connectDB();
    
    // 요청 데이터 파싱
    const body = await request.json();
    console.log('🔍 이메일 인증 확인 요청:', { 
      email: body.email, 
      token: body.token 
    });
    
    // 입력 데이터 검증
    const validationResult = verifyEmailSchema.safeParse(body);
    if (!validationResult.success) {
      console.log('❌ 입력 데이터 검증 실패:', validationResult.error.errors);
      return NextResponse.json(
        { 
          error: '입력 데이터가 올바르지 않습니다',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }
    
    const { email, token } = validationResult.data;
    
    // 토큰 검증 및 사용 처리
    const verificationToken = await EmailVerificationToken.verifyToken(email, token);
    
    if (!verificationToken) {
      console.log('❌ 유효하지 않은 인증 코드:', { email, token });
      return NextResponse.json(
        { error: '유효하지 않거나 만료된 인증 코드입니다' },
        { status: 400 }
      );
    }
    
    console.log('✅ 인증 코드 검증 성공:', { 
      email, 
      tokenId: verificationToken._id 
    });
    
    // 사용자 찾기 및 이메일 인증 상태 업데이트
    const user = await User.findOne({ email });
    
    if (user) {
      // 기존 사용자의 이메일 인증 상태 업데이트
      user.isEmailVerified = true;
      await user.save();
      
      console.log('✅ 기존 사용자 이메일 인증 완료:', { 
        userId: user._id,
        username: user.username 
      });
      
      return NextResponse.json(
        {
          message: '이메일 인증이 완료되었습니다',
          user: {
            id: user._id,
            username: user.username,
            name: user.name,
            email: user.email,
            isEmailVerified: user.isEmailVerified
          }
        },
        { status: 200 }
      );
    } else {
      // 신규 사용자의 경우 (회원가입 전 이메일 인증)
      console.log('✅ 신규 사용자 이메일 인증 완료:', { email });
      
      return NextResponse.json(
        {
          message: '이메일 인증이 완료되었습니다. 회원가입을 계속 진행하세요',
          email,
          isEmailVerified: true
        },
        { status: 200 }
      );
    }
    
  } catch (error) {
    console.error('💥 이메일 인증 확인 중 오류:', error);
    
    return NextResponse.json(
      { error: '이메일 인증 확인 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
} 
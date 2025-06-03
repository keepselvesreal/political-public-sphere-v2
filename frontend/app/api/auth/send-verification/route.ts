/**
 * 📋 파일 목차 (app/api/auth/send-verification/route.ts)
 * ========================================
 * 🎯 주요 역할: 이메일 인증 코드 발송 API 엔드포인트
 * 
 * 📦 구성 요소:
 * - 라인 1-20: 필수 라이브러리 및 모델 임포트
 * - 라인 22-35: 요청 데이터 타입 정의
 * - 라인 37-60: 이메일 발송 함수 (시뮬레이션)
 * - 라인 62-120: POST 핸들러 (인증 코드 발송)
 * 
 * 🔧 주요 기능:
 * - 이메일 인증 코드 생성 및 저장
 * - 이메일 발송 (현재는 콘솔 로그로 시뮬레이션)
 * - 기존 미사용 토큰 정리
 * - 발송 제한 (동일 이메일 1분 간격)
 * 
 * 🔒 보안 기능:
 * - 이메일 형식 검증
 * - 발송 빈도 제한
 * - 토큰 만료 시간 설정
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import EmailVerificationToken from '@/lib/models/EmailVerificationToken';
import { z } from 'zod';

/**
 * 이메일 인증 요청 데이터 검증 스키마
 */
const sendVerificationSchema = z.object({
  email: z.string()
    .email('올바른 이메일 형식이 아닙니다')
    .toLowerCase()
});

type SendVerificationRequest = z.infer<typeof sendVerificationSchema>;

/**
 * 이메일 발송 함수 (시뮬레이션)
 * 실제 환경에서는 SendGrid, AWS SES 등을 사용
 */
async function sendVerificationEmail(email: string, token: string): Promise<boolean> {
  try {
    // 실제 이메일 발송 로직을 여기에 구현
    // 현재는 콘솔 로그로 시뮬레이션
    console.log('📧 이메일 발송 시뮬레이션:');
    console.log(`  받는 사람: ${email}`);
    console.log(`  인증 코드: ${token}`);
    console.log(`  만료 시간: 24시간`);
    console.log('  내용: 아래 인증 코드를 입력하여 이메일 인증을 완료하세요.');
    
    // 실제 이메일 발송 서비스 호출
    // await emailService.send({
    //   to: email,
    //   subject: '이메일 인증 코드',
    //   template: 'verification',
    //   data: { token, expiresIn: '24시간' }
    // });
    
    return true;
  } catch (error) {
    console.error('이메일 발송 실패:', error);
    return false;
  }
}

/**
 * POST /api/auth/send-verification
 * 이메일 인증 코드 발송 처리
 */
export async function POST(request: NextRequest) {
  try {
    // MongoDB 연결
    await connectDB();
    
    // 요청 데이터 파싱
    const body = await request.json();
    console.log('🔍 이메일 인증 요청:', { email: body.email });
    
    // 입력 데이터 검증
    const validationResult = sendVerificationSchema.safeParse(body);
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
    
    const { email } = validationResult.data;
    
    // 최근 발송 이력 확인 (1분 간격 제한)
    const recentToken = await EmailVerificationToken.findOne({
      email,
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) } // 1분 전
    });
    
    if (recentToken) {
      console.log('❌ 발송 빈도 제한:', { email });
      return NextResponse.json(
        { error: '인증 코드는 1분에 한 번만 발송할 수 있습니다' },
        { status: 429 }
      );
    }
    
    // 새 인증 토큰 생성
    const verificationToken = await EmailVerificationToken.generateToken(email);
    console.log('✅ 인증 토큰 생성:', { 
      email, 
      token: verificationToken.token,
      expiresAt: verificationToken.expiresAt 
    });
    
    // 이메일 발송
    const emailSent = await sendVerificationEmail(email, verificationToken.token);
    
    if (!emailSent) {
      console.log('❌ 이메일 발송 실패:', { email });
      return NextResponse.json(
        { error: '이메일 발송 중 오류가 발생했습니다' },
        { status: 500 }
      );
    }
    
    console.log('🎉 인증 코드 발송 완료:', { 
      email,
      tokenId: verificationToken._id 
    });
    
    return NextResponse.json(
      {
        message: '인증 코드가 이메일로 발송되었습니다',
        email,
        expiresIn: '24시간'
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('💥 인증 코드 발송 중 오류:', error);
    
    return NextResponse.json(
      { error: '인증 코드 발송 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
} 
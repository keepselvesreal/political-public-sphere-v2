/**
 * 📋 파일 목차 (app/api/auth/login/route.ts)
 * ========================================
 * 🎯 주요 역할: 사용자 로그인 API 엔드포인트
 * 
 * 📦 구성 요소:
 * - 라인 1-20: 필수 라이브러리 및 모델 임포트
 * - 라인 22-35: 로그인 요청 데이터 타입 정의
 * - 라인 37-50: JWT 토큰 생성 함수
 * - 라인 52-120: POST 핸들러 (로그인 처리)
 * 
 * 🔧 주요 기능:
 * - 사용자 로그인 처리
 * - 이메일/사용자명으로 로그인 지원
 * - 비밀번호 검증
 * - JWT 토큰 생성 및 반환
 * - 마지막 로그인 시간 업데이트
 * 
 * 🔒 보안 기능:
 * - 입력 데이터 검증
 * - 비밀번호 해시 비교
 * - 계정 활성화 상태 확인
 * - 에러 정보 최소화
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import User from '@/lib/models/User';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

/**
 * 로그인 요청 데이터 검증 스키마
 */
const loginSchema = z.object({
  identifier: z.string()
    .min(1, '이메일 또는 사용자명을 입력해주세요'),
  password: z.string()
    .min(1, '비밀번호를 입력해주세요')
});

type LoginRequest = z.infer<typeof loginSchema>;

/**
 * JWT 토큰 생성 함수
 */
function generateTokens(userId: string) {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '1h' }
  );
  
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
}

/**
 * POST /api/auth/login
 * 사용자 로그인 처리
 */
export async function POST(request: NextRequest) {
  try {
    // MongoDB 연결
    await connectDB();
    
    // 요청 데이터 파싱
    const body = await request.json();
    console.log('🔍 로그인 요청:', { identifier: body.identifier });
    
    // 입력 데이터 검증
    const validationResult = loginSchema.safeParse(body);
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
    
    const { identifier, password } = validationResult.data;
    
    // 사용자 찾기 (이메일 또는 사용자명으로)
    const isEmail = identifier.includes('@');
    const user = await User.findOne(
      isEmail 
        ? { email: identifier.toLowerCase() }
        : { username: identifier }
    );
    
    if (!user) {
      console.log('❌ 사용자를 찾을 수 없음:', { identifier });
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다' },
        { status: 401 }
      );
    }
    
    // 계정 활성화 상태 확인
    if (!user.isActive) {
      console.log('❌ 비활성화된 계정:', { userId: user._id });
      return NextResponse.json(
        { error: '비활성화된 계정입니다. 관리자에게 문의하세요' },
        { status: 403 }
      );
    }
    
    // 비밀번호 검증
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log('❌ 비밀번호 불일치:', { userId: user._id });
      return NextResponse.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다' },
        { status: 401 }
      );
    }
    
    // 마지막 로그인 시간 업데이트
    user.lastLoginAt = new Date();
    await user.save();
    
    // JWT 토큰 생성
    const { accessToken, refreshToken } = generateTokens(user._id.toString());
    
    // 응답 데이터 (비밀번호 제외)
    const userResponse = {
      id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      role: user.role,
      profileImage: user.profileImage,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt
    };
    
    console.log('✅ 로그인 성공:', { 
      userId: user._id, 
      username: user.username,
      lastLoginAt: user.lastLoginAt 
    });
    
    return NextResponse.json(
      {
        message: '로그인이 완료되었습니다',
        user: userResponse,
        accessToken,
        refreshToken
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('💥 로그인 처리 중 오류:', error);
    
    return NextResponse.json(
      { error: '로그인 처리 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
} 
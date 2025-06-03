/**
 * 📋 파일 목차 (app/api/auth/me/route.ts)
 * ========================================
 * 🎯 주요 역할: 현재 로그인한 사용자 정보 조회 API 엔드포인트
 * 
 * 📦 구성 요소:
 * - 라인 1-20: 필수 라이브러리 및 모델 임포트
 * - 라인 22-40: JWT 토큰 검증 함수
 * - 라인 42-100: GET 핸들러 (사용자 정보 조회)
 * 
 * 🔧 주요 기능:
 * - JWT 토큰 검증
 * - 현재 사용자 정보 조회
 * - 인증 상태 확인
 * - 사용자 데이터 반환
 * 
 * 🔒 보안 기능:
 * - Authorization 헤더 검증
 * - JWT 토큰 유효성 확인
 * - 사용자 존재 여부 확인
 * - 비밀번호 필드 제외
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import User from '@/lib/models/User';
import jwt from 'jsonwebtoken';

/**
 * JWT 토큰에서 사용자 ID 추출
 */
function getUserIdFromToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as { userId: string };
    return decoded.userId;
  } catch (error) {
    console.error('JWT 토큰 검증 실패:', error);
    return null;
  }
}

/**
 * GET /api/auth/me
 * 현재 로그인한 사용자 정보 조회
 */
export async function GET(request: NextRequest) {
  try {
    // MongoDB 연결
    await connectDB();
    
    // Authorization 헤더에서 토큰 추출
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Authorization 헤더 없음');
      return NextResponse.json(
        { error: '인증 토큰이 필요합니다' },
        { status: 401 }
      );
    }
    
    const token = authHeader.substring(7); // 'Bearer ' 제거
    
    // JWT 토큰에서 사용자 ID 추출
    const userId = getUserIdFromToken(token);
    if (!userId) {
      console.log('❌ 유효하지 않은 토큰');
      return NextResponse.json(
        { error: '유효하지 않은 인증 토큰입니다' },
        { status: 401 }
      );
    }
    
    console.log('🔍 사용자 정보 조회 요청:', { userId });
    
    // 사용자 정보 조회
    const user = await User.findById(userId);
    if (!user) {
      console.log('❌ 사용자를 찾을 수 없음:', { userId });
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    // 계정 활성화 상태 확인
    if (!user.isActive) {
      console.log('❌ 비활성화된 계정:', { userId });
      return NextResponse.json(
        { error: '비활성화된 계정입니다' },
        { status: 403 }
      );
    }
    
    // 응답 데이터 (비밀번호 제외)
    const userResponse = {
      id: user._id,
      username: user.username,
      name: user.name,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      role: user.role,
      profileImage: user.profileImage,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    console.log('✅ 사용자 정보 조회 성공:', { 
      userId: user._id,
      username: user.username 
    });
    
    return NextResponse.json(
      {
        user: userResponse
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('💥 사용자 정보 조회 중 오류:', error);
    
    return NextResponse.json(
      { error: '사용자 정보 조회 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
} 
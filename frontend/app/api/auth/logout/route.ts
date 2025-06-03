/**
 * 📋 파일 목차 (app/api/auth/logout/route.ts)
 * ========================================
 * 🎯 주요 역할: 사용자 로그아웃 API 엔드포인트
 * 
 * 📦 구성 요소:
 * - 라인 1-15: 필수 라이브러리 임포트
 * - 라인 17-60: POST 핸들러 (로그아웃 처리)
 * 
 * 🔧 주요 기능:
 * - 클라이언트 사이드 로그아웃 처리
 * - 로그아웃 확인 응답
 * - 토큰 무효화 안내
 * 
 * 📝 참고사항:
 * - JWT는 stateless하므로 서버에서 토큰을 무효화할 수 없음
 * - 클라이언트에서 토큰을 삭제하는 것으로 로그아웃 처리
 * - 실제 환경에서는 토큰 블랙리스트 또는 짧은 만료시간 사용 권장
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 * 사용자 로그아웃 처리
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 로그아웃 요청 수신');
    
    // JWT는 stateless하므로 서버에서 토큰을 무효화할 수 없음
    // 클라이언트에서 토큰을 삭제하는 것으로 로그아웃 처리
    
    console.log('✅ 로그아웃 처리 완료');
    
    return NextResponse.json(
      {
        message: '로그아웃이 완료되었습니다',
        instructions: [
          '클라이언트에서 accessToken과 refreshToken을 삭제하세요',
          '로컬 스토리지 또는 쿠키에서 사용자 정보를 제거하세요'
        ]
      },
      { status: 200 }
    );
    
  } catch (error) {
    console.error('💥 로그아웃 처리 중 오류:', error);
    
    return NextResponse.json(
      { error: '로그아웃 처리 중 오류가 발생했습니다' },
      { status: 500 }
    );
  }
} 
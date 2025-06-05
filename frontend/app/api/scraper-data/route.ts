/*
스크래퍼 데이터 API 엔드포인트

주요 기능:
- POST: 스크래퍼에서 추출한 데이터 저장 (line 15-40)
- GET: 저장된 최신 데이터 조회 (line 40-60)
- 메모리 기반 임시 저장소 사용

작성자: AI Assistant
작성일: 2025년 6월 4일 16:40 (KST)
*/

import { NextRequest, NextResponse } from 'next/server';

// 메모리 기반 임시 저장소 (서버 재시작 시 초기화됨)
let latestScrapedData: any[] = [];

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // 데이터 검증
    if (!Array.isArray(data) && typeof data === 'object') {
      // 단일 객체인 경우 배열로 변환
      latestScrapedData = [data];
    } else if (Array.isArray(data)) {
      latestScrapedData = data;
    } else {
      return NextResponse.json(
        { error: '올바른 데이터 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    console.log(`📊 스크래퍼 데이터 수신: ${latestScrapedData.length}개 게시글`);
    
    return NextResponse.json({
      success: true,
      message: `${latestScrapedData.length}개 게시글 데이터가 저장되었습니다.`,
      count: latestScrapedData.length
    });
    
  } catch (error) {
    console.error('스크래퍼 데이터 저장 오류:', error);
    return NextResponse.json(
      { error: '데이터 저장 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: latestScrapedData,
      count: latestScrapedData.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('스크래퍼 데이터 조회 오류:', error);
    return NextResponse.json(
      { error: '데이터 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 
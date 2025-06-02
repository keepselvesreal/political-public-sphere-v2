import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    // 스크래핑 결과 파일 경로 (public 폴더에서 찾기)
    const projectRoot = process.cwd();
    const scrapingResultPath = path.join(projectRoot, 'public', 'fmkorea_test_result_20250602_161615.json');
    
    // 파일이 존재하는지 확인
    if (!fs.existsSync(scrapingResultPath)) {
      return NextResponse.json(
        { error: '스크래핑 결과 파일을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    
    // 파일 읽기
    const fileContent = fs.readFileSync(scrapingResultPath, 'utf-8');
    const scrapingData = JSON.parse(fileContent);
    
    return NextResponse.json(scrapingData);
    
  } catch (error) {
    console.error('스크래핑 데이터 로드 오류:', error);
    return NextResponse.json(
      { error: '스크래핑 데이터를 로드하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 
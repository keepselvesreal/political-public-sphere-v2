/*
스크래핑 데이터 조회 API

주요 기능:
- GET: scraping/data 폴더의 JSON 파일들을 읽어서 반환 (line 20-80)
- 파일 검증 및 데이터 정규화 (line 82-120)
- 에러 처리 및 로깅 (line 122-150)

작성자: AI Assistant
작성일: 2025년 6월 4일 22:45 (KST)
목적: WSL 환경에서 스크래핑 데이터를 웹 인터페이스로 전송
*/

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// 스크래핑 데이터 타입 정의
interface ScrapedPostData {
  post_id: string;
  post_url: string;
  scraped_at: string;
  metadata: {
    title: string;
    category?: string;
    author: string;
    date: string;
    view_count?: number;
    up_count?: number;
    down_count?: number;
    comment_count?: number;
  };
  content: Array<{
    type: 'image' | 'text' | 'video';
    order: number;
    data: any;
  }>;
  comments: Array<{
    comment_id: string;
    author: string;
    content: string;
    date: string;
    up_count?: number;
    down_count?: number;
    level?: number;
    is_reply?: boolean;
    parent_comment_id?: string;
  }>;
}

// 스크래핑 데이터 폴더 경로
const SCRAPING_DATA_PATH = path.join(process.cwd(), '..', 'scraping', 'data');

// 스크래핑 데이터 검증 함수
function validateScrapedData(data: any): data is ScrapedPostData[] {
  if (!Array.isArray(data)) {
    if (typeof data === 'object' && data !== null) {
      data = [data];
    } else {
      return false;
    }
  }
  
  return data.every((item: any) => 
    typeof item === 'object' &&
    typeof item.post_id === 'string' &&
    typeof item.post_url === 'string' &&
    typeof item.scraped_at === 'string' &&
    typeof item.metadata === 'object' &&
    Array.isArray(item.content) &&
    Array.isArray(item.comments)
  );
}

// JSON 파일 읽기 및 파싱
async function readJsonFile(filePath: string): Promise<ScrapedPostData[]> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const jsonData = JSON.parse(fileContent);
    
    if (!validateScrapedData(jsonData)) {
      console.warn(`Invalid data format in file: ${filePath}`);
      return [];
    }
    
    // 배열로 정규화
    return Array.isArray(jsonData) ? jsonData : [jsonData];
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return [];
  }
}

// GET: 스크래핑 데이터 조회
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 스크래핑 데이터 조회 요청 시작');
    console.log('📁 스크래핑 데이터 경로:', SCRAPING_DATA_PATH);
    
    // 스크래핑 데이터 폴더 존재 확인
    try {
      await fs.access(SCRAPING_DATA_PATH);
    } catch (error) {
      console.error('❌ 스크래핑 데이터 폴더를 찾을 수 없습니다:', SCRAPING_DATA_PATH);
      return NextResponse.json({
        success: false,
        error: '스크래핑 데이터 폴더를 찾을 수 없습니다.',
        data: []
      }, { status: 404 });
    }
    
    // 폴더 내 JSON 파일 목록 조회
    const files = await fs.readdir(SCRAPING_DATA_PATH);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    console.log(`📄 발견된 JSON 파일: ${jsonFiles.length}개`);
    jsonFiles.forEach(file => console.log(`  - ${file}`));
    
    if (jsonFiles.length === 0) {
      console.log('⚠️ JSON 파일이 없습니다.');
      return NextResponse.json({
        success: true,
        message: 'JSON 파일이 없습니다.',
        data: []
      });
    }
    
    // 모든 JSON 파일 읽기 및 병합
    const allData: ScrapedPostData[] = [];
    const processedFiles: string[] = [];
    const errorFiles: string[] = [];
    
    for (const file of jsonFiles) {
      const filePath = path.join(SCRAPING_DATA_PATH, file);
      try {
        const fileData = await readJsonFile(filePath);
        if (fileData.length > 0) {
          allData.push(...fileData);
          processedFiles.push(file);
          console.log(`✅ ${file}: ${fileData.length}개 게시글 로드`);
        } else {
          errorFiles.push(file);
          console.log(`⚠️ ${file}: 유효한 데이터 없음`);
        }
      } catch (error) {
        errorFiles.push(file);
        console.error(`❌ ${file} 처리 실패:`, error);
      }
    }
    
    // 중복 제거 (post_id 기준)
    const uniqueData = allData.filter((item, index, self) => 
      index === self.findIndex(t => t.post_id === item.post_id)
    );
    
    console.log(`📊 결과 요약:`);
    console.log(`  - 처리된 파일: ${processedFiles.length}개`);
    console.log(`  - 오류 파일: ${errorFiles.length}개`);
    console.log(`  - 전체 게시글: ${allData.length}개`);
    console.log(`  - 중복 제거 후: ${uniqueData.length}개`);
    
    return NextResponse.json({
      success: true,
      message: `${uniqueData.length}개의 게시글 데이터를 성공적으로 로드했습니다.`,
      data: uniqueData,
      meta: {
        total_files: jsonFiles.length,
        processed_files: processedFiles.length,
        error_files: errorFiles.length,
        total_posts: allData.length,
        unique_posts: uniqueData.length,
        processed_file_list: processedFiles,
        error_file_list: errorFiles
      }
    });
    
  } catch (error) {
    console.error('💥 스크래핑 데이터 조회 실패:', error);
    return NextResponse.json({
      success: false,
      error: '스크래핑 데이터 조회 중 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류',
      data: []
    }, { status: 500 });
  }
} 
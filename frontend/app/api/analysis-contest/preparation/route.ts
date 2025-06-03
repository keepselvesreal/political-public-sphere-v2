/*
목차:
- 천하제일 분석대회 준비 게시판 API
- GET: 게시글 목록 조회 (페이지네이션, 정렬)
- POST: 새 게시글 작성
- 초기 공지글 및 목업 데이터 포함
*/

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';

// 준비 게시판 목업 데이터 (개발용)
const mockPreparationPosts = [
  {
    _id: 'notice-1',
    title: '📢 천하제일 분석대회 준비 게시판 이용 안내',
    content: `
      <h2>천하제일 분석대회 준비 게시판에 오신 것을 환영합니다!</h2>
      
      <h3>📋 게시판 목적</h3>
      <ul>
        <li>분석에 필요한 정보와 자료 공유</li>
        <li>분석 방법론 및 도구 소개</li>
        <li>참가자 간 질문과 답변</li>
        <li>대회 관련 공지사항 전달</li>
      </ul>
      
      <h3>✅ 게시 가이드라인</h3>
      <ul>
        <li>건설적이고 도움이 되는 정보를 공유해주세요</li>
        <li>출처가 명확한 자료를 사용해주세요</li>
        <li>서로를 존중하는 댓글 문화를 만들어주세요</li>
        <li>스팸이나 광고성 게시글은 삭제됩니다</li>
      </ul>
      
      <p>함께 준비하여 더 나은 분석 결과를 만들어봅시다! 🚀</p>
    `,
    author: {
      name: '운영진',
      email: 'admin@political-sphere.com'
    },
    createdAt: new Date('2024-01-01').toISOString(),
    updatedAt: new Date('2024-01-01').toISOString(),
    views: 1250,
    likes: 89,
    comments: 12,
    isNotice: true,
    tags: ['공지', '안내', '가이드라인']
  },
  {
    _id: 'post-1',
    title: '📊 정치 여론조사 데이터 분석을 위한 Python 라이브러리 추천',
    content: `
      <h2>여론조사 데이터 분석에 유용한 Python 라이브러리들을 소개합니다</h2>
      
      <h3>1. 데이터 처리</h3>
      <ul>
        <li><strong>pandas</strong>: 데이터 조작 및 분석의 기본</li>
        <li><strong>numpy</strong>: 수치 계산 및 배열 처리</li>
        <li><strong>openpyxl</strong>: Excel 파일 읽기/쓰기</li>
      </ul>
      
      <h3>2. 시각화</h3>
      <ul>
        <li><strong>matplotlib</strong>: 기본 그래프 생성</li>
        <li><strong>seaborn</strong>: 통계 시각화</li>
        <li><strong>plotly</strong>: 인터랙티브 차트</li>
      </ul>
      
      <h3>3. 통계 분석</h3>
      <ul>
        <li><strong>scipy</strong>: 과학 계산 및 통계</li>
        <li><strong>statsmodels</strong>: 통계 모델링</li>
        <li><strong>scikit-learn</strong>: 머신러닝</li>
      </ul>
      
      <p>각 라이브러리의 설치 방법과 기본 사용법도 댓글로 공유해주세요!</p>
    `,
    author: {
      name: '데이터분석러',
      email: 'analyst@example.com'
    },
    createdAt: new Date('2024-01-10').toISOString(),
    updatedAt: new Date('2024-01-10').toISOString(),
    views: 456,
    likes: 23,
    comments: 8,
    isNotice: false,
    tags: ['Python', '데이터분석', '라이브러리', '도구']
  },
  {
    _id: 'post-2',
    title: '🗳️ 선거 데이터 수집 가능한 공개 API 및 웹사이트 정리',
    content: `
      <h2>선거 관련 데이터를 수집할 수 있는 공개 소스들을 정리했습니다</h2>
      
      <h3>🏛️ 공공기관</h3>
      <ul>
        <li><strong>중앙선거관리위원회</strong>: 선거 결과, 후보자 정보</li>
        <li><strong>국가통계포털(KOSIS)</strong>: 인구통계, 지역별 통계</li>
        <li><strong>공공데이터포털</strong>: 다양한 정부 데이터</li>
      </ul>
      
      <h3>📰 언론사 여론조사</h3>
      <ul>
        <li>한국갤럽: 정기 여론조사 결과</li>
        <li>리얼미터: 일일 여론조사</li>
        <li>각 언론사 여론조사 결과</li>
      </ul>
      
      <h3>⚠️ 주의사항</h3>
      <ul>
        <li>데이터 사용 시 출처를 명확히 표기해주세요</li>
        <li>저작권 및 이용약관을 확인해주세요</li>
        <li>데이터의 신뢰성을 검증해주세요</li>
      </ul>
    `,
    author: {
      name: '정보수집가',
      email: 'collector@example.com'
    },
    createdAt: new Date('2024-01-08').toISOString(),
    updatedAt: new Date('2024-01-08').toISOString(),
    views: 789,
    likes: 34,
    comments: 15,
    isNotice: false,
    tags: ['데이터수집', 'API', '공공데이터', '여론조사']
  },
  {
    _id: 'post-3',
    title: '📈 통계적 유의성 검정 방법과 해석 가이드',
    content: `
      <h2>여론조사 결과 분석 시 통계적 유의성을 올바르게 해석하는 방법</h2>
      
      <h3>1. 표본 크기와 오차범위</h3>
      <p>표본 크기가 클수록 오차범위는 작아집니다. 일반적으로 95% 신뢰수준에서:</p>
      <ul>
        <li>1,000명: ±3.1%</li>
        <li>1,500명: ±2.5%</li>
        <li>2,000명: ±2.2%</li>
      </ul>
      
      <h3>2. p-value 해석</h3>
      <ul>
        <li>p < 0.05: 통계적으로 유의함</li>
        <li>p < 0.01: 매우 유의함</li>
        <li>p < 0.001: 극도로 유의함</li>
      </ul>
      
      <h3>3. 실제 적용 예시</h3>
      <p>후보 A: 45%, 후보 B: 42%, 오차범위 ±3%인 경우</p>
      <p>→ 통계적으로 유의한 차이가 아님 (오차범위 내)</p>
    `,
    author: {
      name: '통계학도',
      email: 'stats@example.com'
    },
    createdAt: new Date('2024-01-05').toISOString(),
    updatedAt: new Date('2024-01-05').toISOString(),
    views: 623,
    likes: 41,
    comments: 19,
    isNotice: false,
    tags: ['통계', '유의성검정', '분석방법', '해석']
  }
];

// 게시글 목록 조회 (GET /api/analysis-contest/preparation)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get('skip') || '0');
    const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 50); // 최대 50개로 제한
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';

    // 목업 데이터 정렬
    let sortedPosts = [...mockPreparationPosts];
    
    // 공지글을 항상 맨 위에 표시
    const noticePosts = sortedPosts.filter(post => post.isNotice);
    const regularPosts = sortedPosts.filter(post => !post.isNotice);

    // 일반 게시글 정렬
    if (sortBy === 'likes') {
      regularPosts.sort((a, b) => order === 'asc' ? a.likes - b.likes : b.likes - a.likes);
    } else if (sortBy === 'views') {
      regularPosts.sort((a, b) => order === 'asc' ? a.views - b.views : b.views - a.views);
    } else if (sortBy === 'comments') {
      regularPosts.sort((a, b) => order === 'asc' ? a.comments - b.comments : b.comments - a.comments);
    } else {
      regularPosts.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return order === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }

    // 공지글 + 일반글 순서로 합치기
    const allPosts = [...noticePosts, ...regularPosts];

    // 페이지네이션 적용
    const paginatedPosts = allPosts.slice(skip, skip + limit);

    return NextResponse.json({
      posts: paginatedPosts,
      pagination: {
        skip,
        limit,
        total: allPosts.length,
        hasMore: skip + limit < allPosts.length
      }
    });

  } catch (error) {
    console.error('준비 게시판 API 오류:', error);
    
    return NextResponse.json(
      { 
        error: '게시글을 불러오는데 실패했습니다',
        message: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// 새 게시글 작성 (POST /api/analysis-contest/preparation)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, tags, authorId } = body;

    // 유효성 검사
    if (!title || !content || !authorId) {
      return NextResponse.json(
        { error: '제목, 내용, 작성자 정보는 필수입니다' },
        { status: 400 }
      );
    }

    if (title.length < 5 || title.length > 100) {
      return NextResponse.json(
        { error: '제목은 5자 이상 100자 이하여야 합니다' },
        { status: 400 }
      );
    }

    if (content.length < 10) {
      return NextResponse.json(
        { error: '내용은 10자 이상이어야 합니다' },
        { status: 400 }
      );
    }

    if (tags && tags.length > 10) {
      return NextResponse.json(
        { error: '태그는 최대 10개까지 가능합니다' },
        { status: 400 }
      );
    }

    // 새 게시글 생성 (실제로는 DB에 저장)
    const newPost = {
      _id: `post-${Date.now()}`,
      title: title.trim(),
      content: content.trim(),
      author: {
        name: '사용자', // 실제로는 세션에서 가져옴
        email: 'user@example.com'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      views: 0,
      likes: 0,
      comments: 0,
      isNotice: false,
      tags: tags || []
    };

    return NextResponse.json(
      { 
        message: '게시글이 성공적으로 작성되었습니다',
        post: newPost
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('게시글 작성 오류:', error);
    
    return NextResponse.json(
      { 
        error: '게시글 작성에 실패했습니다',
        message: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
} 
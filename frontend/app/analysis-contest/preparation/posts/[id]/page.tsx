/*
목차:
- 정보 공유 글 상세 페이지
- 동적 라우팅 지원
- 조회수 증가 기능
- 정보 출처 표시
- 마지막 수정: 2024년 12월 19일 18시 50분 (KST)
*/

import { notFound } from 'next/navigation';
import PreparationPostDetail from '@/components/analysis-contest/preparation/PreparationPostDetail';

// 정보 공유 글 타입 정의
interface PreparationPost {
  _id: string;
  title: string;
  content: string;
  source: '언론사' | '유튜브' | '카더라' | '개인 생각';
  author: {
    name: string;
    email: string;
  };
  tags: string[];
  views: number;
  likes: number;
  comments: number;
  createdAt: string;
  updatedAt: string;
}

// Mock 데이터 (개발용)
const MOCK_POSTS: Record<string, PreparationPost> = {
  '1': {
    _id: '1',
    title: '최신 여론조사 분석 방법론',
    content: `
      <h2>여론조사 분석의 핵심 포인트</h2>
      <p>여론조사를 분석할 때 가장 중요한 것은 표본의 대표성과 조사 방법론입니다.</p>
      
      <h3>1. 표본 설계</h3>
      <p>표본이 모집단을 얼마나 잘 대표하는지 확인해야 합니다. 연령, 성별, 지역별 분포를 체크하세요.</p>
      
      <h3>2. 조사 방법</h3>
      <p>전화조사, 온라인조사, 면접조사 등 각각의 장단점을 이해하고 결과를 해석해야 합니다.</p>
      
      <h3>3. 오차한계</h3>
      <p>95% 신뢰수준에서 ±3.1%p 등의 오차한계를 반드시 고려해야 합니다.</p>
      
      <h3>4. 시계열 분석</h3>
      <p>단일 조사보다는 여러 조사의 추세를 보는 것이 더 정확합니다.</p>
    `,
    source: '언론사',
    author: {
      name: '분석전문가',
      email: 'analyst@example.com'
    },
    tags: ['여론조사', '분석방법', '통계'],
    views: 1250,
    likes: 45,
    comments: 12,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  '2': {
    _id: '2',
    title: '유튜브 정치 채널 분석 팁',
    content: `
      <h2>유튜브 정치 콘텐츠 분석하기</h2>
      <p>유튜브의 정치 관련 콘텐츠를 분석할 때 주의해야 할 점들을 정리했습니다.</p>
      
      <h3>1. 채널의 성향 파악</h3>
      <p>채널 운영자의 정치적 성향과 과거 콘텐츠를 먼저 파악하세요.</p>
      
      <h3>2. 댓글 분석</h3>
      <p>댓글의 반응과 좋아요/싫어요 비율도 중요한 지표입니다.</p>
      
      <h3>3. 조회수 패턴</h3>
      <p>특정 주제에 대한 관심도를 조회수로 측정할 수 있습니다.</p>
    `,
    source: '유튜브',
    author: {
      name: '미디어분석가',
      email: 'media@example.com'
    },
    tags: ['유튜브', '미디어분석', '정치콘텐츠'],
    views: 890,
    likes: 32,
    comments: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
};

export default async function PreparationPostDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  
  try {
    // 실제 API 호출 (현재는 Mock 데이터 사용)
    // const response = await fetch(`/api/analysis-contest/preparation/${id}`);
    // if (!response.ok) throw new Error('게시글을 찾을 수 없습니다');
    // const post = await response.json();
    
    // Mock 데이터 사용
    const post = MOCK_POSTS[id];
    if (!post) {
      notFound();
    }
    
    return <PreparationPostDetail post={post} />;
    
  } catch (error) {
    console.error('게시글 조회 오류:', error);
    notFound();
  }
} 
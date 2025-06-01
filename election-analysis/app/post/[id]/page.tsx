/*
목차:
- Post Detail Page (게시글 상세 페이지)
- SSR 지원 및 동적 라우팅
- 투표 및 댓글 시스템 통합
- i18n 다국어 지원
- A11y 접근성 지원
*/

import { notFound } from 'next/navigation';
import PostDetailContent from '@/components/PostDetailContent';
import { connectDB } from '@/lib/mongoose';
import Post from '@/lib/models/Post';

// API 응답 데이터 타입 (MongoDB 스타일)
interface ApiPost {
  _id: string;
  title: string;
  winner: string;
  gap: number;
  content: string;
  keywords?: string[];
  votes?: { up: number; down: number };
  likes?: number;
  views?: number;
  createdAt?: string;
  authorId?: string;
}

// Mock 데이터 (MongoDB 연결 실패 시 사용)
const MOCK_POSTS: Record<string, ApiPost> = {
  '683c8a49fdaaf1442b1d3651': {
    _id: '683c8a49fdaaf1442b1d3651',
    title: '민노당의 기적',
    winner: '권영국',
    gap: 1,
    content: `
      <p>최신 여론조사 데이터에 따르면 권영국 후보가 예상외로 선전하며 1% 차이로 앞서고 있는 것으로 나타났습니다.</p>
      
      <h2>주요 발견사항</h2>
      <p>권영국 후보의 선전은 주로 젊은 유권자층의 지지에 기인한 것으로 분석됩니다. 특히 20-30대 유권자들 사이에서 기존 정치권에 대한 피로감이 작용한 것으로 보입니다.</p>
      
      <h2>지역별 분석</h2>
      <p>수도권에서는 여전히 접전 양상을 보이고 있으나, 일부 지방에서 권영국 후보에 대한 지지가 예상보다 높게 나타나고 있습니다.</p>
      
      <h2>결론</h2>
      <p>아직 선거까지 시간이 남아있어 변수가 많지만, 현재 추세로는 매우 접전이 예상됩니다.</p>
    `,
    keywords: ['민노당', '권영국', '젊은층'],
    votes: { up: 45, down: 8 },
    likes: 45,
    views: 1250,
    createdAt: new Date().toISOString(),
    authorId: 'mock-author'
  },
  '683c89dbfdaaf1442b1d3649': {
    _id: '683c89dbfdaaf1442b1d3649',
    title: '내란심판의 승리',
    winner: '리재명',
    gap: 5,
    content: `
      <p>최근 정치적 사건들이 여론에 미친 영향을 분석한 결과, 리재명 후보가 5% 차이로 앞서는 것으로 나타났습니다.</p>
      
      <h2>여론 변화</h2>
      <p>지난 한 달간의 여론 변화를 보면, 정치적 안정성을 중시하는 유권자들의 성향이 뚜렷하게 나타나고 있습니다.</p>
      
      <h2>지지층 분석</h2>
      <p>리재명 후보는 특히 중장년층과 진보 성향 유권자들로부터 강한 지지를 받고 있는 것으로 분석됩니다.</p>
      
      <h2>전망</h2>
      <p>현재 추세가 지속된다면 리재명 후보의 승리 가능성이 높아 보입니다.</p>
    `,
    keywords: ['리재명', '내란심판', '정치안정'],
    votes: { up: 67, down: 12 },
    likes: 67,
    views: 2100,
    createdAt: new Date().toISOString(),
    authorId: 'mock-author'
  }
};

// API 데이터를 PostDetailContent props로 변환하는 함수
const transformApiPostToDetailProps = (apiPost: ApiPost) => {
  return {
    id: apiPost._id,
    title: apiPost.title,
    predictedWinner: apiPost.winner,
    marginPercentage: apiPost.gap,
    mainQuote: apiPost.title,
    content: apiPost.content || '',
    candidates: undefined, // API에서 제공하지 않음
    tags: apiPost.keywords || [],
    analyst: undefined, // API에서 제공하지 않음
    votes: {
      up: apiPost.votes?.up || 0,
      down: apiPost.votes?.down || 0
    },
    comments: 0, // 실제로는 댓글 수를 계산해야 함
  };
};

// 서버 컴포넌트 - async 함수 사용 가능
export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Next.js 15에서는 params를 await로 처리해야 함
  const { id } = await params;
  
  try {
    // MongoDB에서 직접 조회 시도
    await connectDB();
    const mongoPost = await Post.findById(id);
    
    if (mongoPost) {
      // 조회수 증가
      await Post.findByIdAndUpdate(id, { $inc: { views: 1 } });
      
      // MongoDB 객체를 plain object로 변환
      const plainPost = JSON.parse(JSON.stringify(mongoPost));
      
      const apiPost: ApiPost = {
        _id: plainPost._id,
        title: plainPost.title,
        winner: plainPost.winner,
        gap: plainPost.gap,
        content: plainPost.content || '',
        keywords: plainPost.keywords,
        votes: plainPost.votes,
        likes: plainPost.likes,
        views: plainPost.views,
        createdAt: plainPost.createdAt,
        authorId: plainPost.authorId
      };
      
      const post = transformApiPostToDetailProps(apiPost);
      return <PostDetailContent post={post} />;
    }
    
  } catch (error) {
    console.error('MongoDB 조회 실패, Mock 데이터 사용:', error);
  }
  
  // MongoDB 실패 시 Mock 데이터 사용
  const mockPost = MOCK_POSTS[id];
  if (!mockPost) {
    notFound();
  }
  
  const post = transformApiPostToDetailProps(mockPost);
  return <PostDetailContent post={post} />;
}
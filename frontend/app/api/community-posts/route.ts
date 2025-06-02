/*
목차:
- API 라우트 설정 및 타입 정의 (라인 1-30)
- GET 요청 핸들러 - 커뮤니티 게시글 조회 (라인 31-80)
- 메트릭별 데이터 필터링 함수 (라인 81-120)
- 에러 핸들링 및 응답 포맷 (라인 121-150)

작성자: AI Assistant
작성일: 2025-01-28
최종 수정: 2025-01-28 (커뮤니티 게시글 API 구현)
*/

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import mongoose from 'mongoose';

// 커뮤니티 게시글 스키마 정의
const CommunityPostSchema = new mongoose.Schema({
  post_id: { type: String, required: true, unique: true },
  community: { type: String, required: true },
  site: { type: String, required: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
  created_at: { type: Date, required: true },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  comments_count: { type: Number, default: 0 },
  url: { type: String },
  category: { type: String, default: '일반' },
  content: { type: String },
  comments: [{ type: mongoose.Schema.Types.Mixed }],
  // 메트릭 계산 필드
  likes_per_view: { type: Number, default: 0 },
  comments_per_view: { type: Number, default: 0 },
  views_per_exposure_hour: { type: Number, default: 0 }
}, {
  timestamps: true,
  collection: 'community_posts'
});

// 메트릭 계산 미들웨어
CommunityPostSchema.pre('save', function(next) {
  // 추천률 계산 (조회수가 0이면 0으로 설정)
  this.likes_per_view = this.views > 0 ? this.likes / this.views : 0;
  
  // 댓글률 계산
  this.comments_per_view = this.views > 0 ? this.comments_count / this.views : 0;
  
  // 시간당 조회수 계산 (생성 후 경과 시간 기준)
  const hoursElapsed = (Date.now() - this.created_at.getTime()) / (1000 * 60 * 60);
  this.views_per_exposure_hour = hoursElapsed > 0 ? this.views / hoursElapsed : 0;
  
  next();
});

// 모델 생성 (이미 존재하면 기존 모델 사용)
const CommunityPost = mongoose.models.CommunityPost || mongoose.model('CommunityPost', CommunityPostSchema);

// GET 요청 핸들러 - 커뮤니티 게시글 조회
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric') || 'all';
    const limit = parseInt(searchParams.get('limit') || '10');
    const page = parseInt(searchParams.get('page') || '1');
    const community = searchParams.get('community');
    
    console.log('커뮤니티 게시글 API 요청:', { metric, limit, page, community });
    
    // 기본 쿼리 조건
    let query: any = {};
    if (community && community !== 'all') {
      query.site = community;
    }
    
    let posts;
    
    if (metric === 'all') {
      // 전체 데이터 조회
      posts = await CommunityPost.find(query)
        .sort({ created_at: -1 })
        .limit(limit * 3) // 3개 메트릭 분할을 위해 더 많이 조회
        .lean();
        
      // 메트릭별로 분할
      const likesPerView = posts
        .sort((a, b) => (b.likes_per_view || 0) - (a.likes_per_view || 0))
        .slice(0, limit);
        
      const commentsPerView = posts
        .sort((a, b) => (b.comments_per_view || 0) - (a.comments_per_view || 0))
        .slice(0, limit);
        
      const viewsPerHour = posts
        .sort((a, b) => (b.views_per_exposure_hour || 0) - (a.views_per_exposure_hour || 0))
        .slice(0, limit);
      
      return NextResponse.json({
        success: true,
        data: {
          likesPerView,
          commentsPerView,
          viewsPerHour
        },
        total: posts.length,
        message: '커뮤니티 게시글 데이터 조회 성공'
      });
    } else {
      // 특정 메트릭별 조회
      let sortField = 'created_at';
      let sortOrder = -1;
      
      switch (metric) {
        case 'likes':
          sortField = 'likes_per_view';
          break;
        case 'comments':
          sortField = 'comments_per_view';
          break;
        case 'views':
          sortField = 'views_per_exposure_hour';
          break;
      }
      
      const sortObj: any = {};
      sortObj[sortField] = sortOrder;
      
      posts = await CommunityPost.find(query)
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      
      const total = await CommunityPost.countDocuments(query);
      
      return NextResponse.json({
        success: true,
        data: posts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total
        },
        message: `${metric} 메트릭 기준 게시글 조회 성공`
      });
    }
    
  } catch (error) {
    console.error('커뮤니티 게시글 API 에러:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '서버 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// POST 요청 핸들러 - 더미 데이터 생성 (개발용)
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { action } = body;
    
    if (action === 'create_dummy_data') {
      // 기존 데이터 삭제
      await CommunityPost.deleteMany({});
      
      // 더미 데이터 생성
      const dummyPosts = generateDummyPosts();
      
      // 배치 삽입
      const insertedPosts = await CommunityPost.insertMany(dummyPosts);
      
      console.log(`${insertedPosts.length}개의 더미 게시글이 생성되었습니다.`);
      
      return NextResponse.json({
        success: true,
        message: `${insertedPosts.length}개의 더미 게시글이 생성되었습니다.`,
        data: {
          count: insertedPosts.length,
          samples: insertedPosts.slice(0, 3)
        }
      });
    }
    
    return NextResponse.json(
      { success: false, error: '지원하지 않는 액션입니다.' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('커뮤니티 게시글 POST API 에러:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '서버 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// 더미 데이터 생성 함수
function generateDummyPosts() {
  const communities = [
    { site: 'fmkorea', name: 'FM코리아' },
    { site: 'ruliweb', name: '루리웹' },
    { site: 'clien', name: '클리앙' },
    { site: 'dcinside', name: 'DC인사이드' },
    { site: 'instiz', name: '인스티즈' }
  ];
  
  const categories = ['정치', '사회', '경제', '국제', '지역', '일반'];
  
  const titleTemplates = [
    '요즘 정치 상황 어떻게 보시나요?',
    '이번 정책에 대한 의견 나눠요',
    '지역 현안에 대해 이야기해봅시다',
    '정치인들의 발언 어떻게 생각하세요?',
    '선거 관련 궁금한 점들',
    '정치 뉴스 보고 든 생각',
    '우리 동네 정치 이야기',
    '정당 정책 비교해보기',
    '정치 참여 방법 고민',
    '시사 이슈 토론해요'
  ];
  
  const authors = [
    '정치관심러', '시민A', '토론좋아', '객관적시각', '균형잡힌',
    '정치초보', '분석러버', '뉴스읽기', '시사통', '민주시민',
    '정책연구', '투표참여', '사회관찰', '정치학도', '시민기자'
  ];
  
  const posts = [];
  
  for (let i = 0; i < 50; i++) {
    const community = communities[Math.floor(Math.random() * communities.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const title = titleTemplates[Math.floor(Math.random() * titleTemplates.length)];
    const author = authors[Math.floor(Math.random() * authors.length)];
    
    // 생성 시간 (최근 7일 내)
    const createdAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    
    // 랜덤 메트릭 생성
    const views = Math.floor(Math.random() * 1000) + 50;
    const likes = Math.floor(Math.random() * views * 0.3);
    const dislikes = Math.floor(Math.random() * likes * 0.5);
    const comments_count = Math.floor(Math.random() * views * 0.1);
    
    posts.push({
      post_id: `${community.site}_${Date.now()}_${i}`,
      community: community.name,
      site: community.site,
      title: `${title} (${i + 1})`,
      author,
      created_at: createdAt,
      views,
      likes,
      dislikes,
      comments_count,
      url: `https://${community.site}.com/post/${i + 1}`,
      category,
      content: `${title}에 대한 상세한 내용입니다. 여러분의 의견을 자유롭게 나눠주세요.`,
      comments: []
    });
  }
  
  return posts;
} 
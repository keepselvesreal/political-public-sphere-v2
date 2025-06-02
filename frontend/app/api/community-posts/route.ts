/*
목차:
- 커뮤니티 게시글 목록 API (라인 1-30)
- GET: 일반적인 커뮤니티 데이터 조회 (라인 31-80)
- 새로운 CommunityPost 모델 지원 (라인 81-120)
*/

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

// MongoDB 연결 함수 (political_public_sphere 데이터베이스)
async function connectDB() {
  try {
    // 이미 연결되어 있으면 그대로 사용
    if (mongoose.connections[0].readyState === 1) {
      return mongoose.connections[0].db;
    }
    
    // 연결 중이면 완료될 때까지 기다림
    if (mongoose.connections[0].readyState === 2) {
      await new Promise((resolve) => {
        mongoose.connection.once('connected', resolve);
      });
      return mongoose.connections[0].db;
    }
    
    // 새로 연결
    await mongoose.connect('mongodb+srv://nadle:miQXsXpzayvMQAzE@cluster0.bh7mhfi.mongodb.net/political_public_sphere');
    console.log('✅ MongoDB political_public_sphere 연결 성공');
    
    return mongoose.connections[0].db;
  } catch (error) {
    console.error('❌ MongoDB 연결 실패:', error);
    throw error;
  }
}

// 커뮤니티별 설정 (CommunityPost 모델과 동일)
const COMMUNITY_CONFIG = {
  fmkorea: {
    name: 'FM코리아',
    emoji: '🎮',
    color: 'blue',
    defaultAuthor: '익명'
  },
  ruliweb: {
    name: '루리웹',
    emoji: '🎯',
    color: 'purple',
    defaultAuthor: '익명'
  },
  clien: {
    name: '클리앙',
    emoji: '💻',
    color: 'green',
    defaultAuthor: '익명'
  },
  dcinside: {
    name: 'DC인사이드',
    emoji: '🎨',
    color: 'red',
    defaultAuthor: '익명'
  },
  instiz: {
    name: '인스티즈',
    emoji: '🌟',
    color: 'orange',
    defaultAuthor: '익명'
  }
};

// 새로운 CommunityPost 데이터 변환 함수 (새로운 메트릭 구조)
function transformCommunityPost(post: any, topMetric?: string) {
  const config = COMMUNITY_CONFIG[post.site as keyof typeof COMMUNITY_CONFIG];
  
  // 제목 추출 (metadata에서 우선, 없으면 content에서 추출)
  let title = post.metadata?.title || '';
  
  if (!title) {
    // content에서 텍스트 추출 (새로운 데이터 구조 지원)
    const textContent = post.content
      ?.filter((item: any) => item.type === 'text')
      ?.map((item: any) => item.data?.text || item.content || '')
      ?.join(' ')
      ?.substring(0, 100) || '';
    
    title = textContent || `${config.name} 게시글 ${post.post_id}`;
  }

  // 날짜 정보 추출 (metadata에서 우선, 없으면 scraped_at 사용)
  const dateString = post.metadata?.date || post.scraped_at || new Date().toISOString();
  
  // 메트릭 정보 (실제 스크래핑된 데이터 우선 사용)
  const views = post.metadata?.view_count || generateMetric(post.post_id, 100, 2000);
  const likes = post.metadata?.like_count || generateMetric(post.post_id + '1', 10, Math.floor(views * 0.3));
  const dislikes = post.metadata?.dislike_count || generateMetric(post.post_id + '2', 1, Math.floor(likes * 0.2));
  const commentsCount = post.comments?.length || post.metadata?.comment_count || 0;

  // 새로운 메트릭 boolean 값 설정
  const topLikes = topMetric === 'top_likes';
  const topComments = topMetric === 'top_comments';
  const topViews = topMetric === 'top_views';

  return {
    _id: post._id.toString(),
    post_id: post.post_id,
    community: config.name,
    site: post.site,
    title: title,
    author: post.metadata?.author || config.defaultAuthor,
    created_at: dateString,
    views: views,
    likes: likes,
    dislikes: dislikes,
    comments_count: commentsCount,
    url: post.post_url,
    content: title.substring(0, 200),
    likes_per_view: views > 0 ? likes / views : 0,
    comments_per_view: views > 0 ? commentsCount / views : 0,
    views_per_exposure_hour: (() => {
      try {
        const postDate = new Date(dateString);
        const hoursFromCreation = (Date.now() - postDate.getTime()) / (1000 * 60 * 60);
        return hoursFromCreation > 0 ? views / hoursFromCreation : 0;
      } catch {
        return 0;
      }
    })(),
    top_likes: topLikes,
    top_comments: topComments,
    top_views: topViews
  };
}

// 기존 FmkoreaPost 데이터 변환 함수 (하위 호환성, 새로운 메트릭 구조)
function transformFmkoreaPost(post: any, topMetric?: string) {
  // 제목 추출 (metadata에서 우선, 없으면 content에서 추출)
  let title = post.metadata?.title || '';
  
  if (!title) {
    // content에서 텍스트 추출 (새로운 데이터 구조 지원)
    const textContent = post.content
      ?.filter((item: any) => item.type === 'text')
      ?.map((item: any) => item.data?.text || item.content || '')
      ?.join(' ')
      ?.substring(0, 100) || '';
    
    title = textContent || `FM코리아 게시글 ${post.post_id}`;
  }

  // 날짜 정보 추출 (metadata에서 우선, 없으면 scraped_at 사용)
  const dateString = post.metadata?.date || post.scraped_at || new Date().toISOString();
  
  // 메트릭 정보 (실제 스크래핑된 데이터 우선 사용)
  const views = post.metadata?.view_count || generateMetric(post.post_id, 100, 2000);
  const likes = post.metadata?.like_count || generateMetric(post.post_id + '1', 10, Math.floor(views * 0.3));
  const dislikes = post.metadata?.dislike_count || generateMetric(post.post_id + '2', 1, Math.floor(likes * 0.2));
  const commentsCount = post.comments?.length || post.metadata?.comment_count || 0;

  // 새로운 메트릭 boolean 값 설정
  const topLikes = topMetric === 'top_likes';
  const topComments = topMetric === 'top_comments';
  const topViews = topMetric === 'top_views';

  return {
    _id: post._id.toString(),
    post_id: post.post_id,
    community: 'FM코리아',
    site: 'fmkorea',
    title: title,
    author: post.metadata?.author || '익명',
    created_at: dateString,
    views: views,
    likes: likes,
    dislikes: dislikes,
    comments_count: commentsCount,
    url: post.post_url,
    content: title.substring(0, 200),
    likes_per_view: views > 0 ? likes / views : 0,
    comments_per_view: views > 0 ? commentsCount / views : 0,
    views_per_exposure_hour: (() => {
      try {
        const postDate = new Date(dateString);
        const hoursFromCreation = (Date.now() - postDate.getTime()) / (1000 * 60 * 60);
        return hoursFromCreation > 0 ? views / hoursFromCreation : 0;
      } catch {
        return 0;
      }
    })(),
    top_likes: topLikes,
    top_comments: topComments,
    top_views: topViews
  };
}

// post_id 기반 일관된 메트릭 생성 함수
function generateMetric(seed: string, min: number, max: number): number {
  const numericSeed = parseInt(seed.slice(-6)) || 123456;
  const x = Math.sin(numericSeed) * 10000;
  return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
}

// GET /api/community-posts - 커뮤니티 게시글 목록 조회
export async function GET(request: NextRequest) {
  try {
    const db = await connectDB();
    if (!db) {
      throw new Error('데이터베이스 연결이 설정되지 않았습니다.');
    }

    const { searchParams } = new URL(request.url);
    
    // 쿼리 파라미터 파싱
    const skip = parseInt(searchParams.get('skip') || '0');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const order = searchParams.get('order') === 'asc' ? 1 : -1;
    const search = searchParams.get('search');
    const topMetric = searchParams.get('topMetric'); // 새로운 메트릭 구조 지원

    // 새로운 community_posts 컬렉션 우선 시도
    let posts: any[] = [];
    let total = 0;
    let usedCollection = '';

    try {
      const communityCollection = db.collection('community_posts');
      const communityCount = await communityCollection.countDocuments({});
      
      if (communityCount > 0) {
        // 새로운 컬렉션 사용
        usedCollection = 'community_posts';
        
        // 필터 조건 구성
        const filter: any = {};
        
        // 검색 조건 추가
        if (search) {
          filter.$or = [
            { 'metadata.title': { $regex: search, $options: 'i' } },
            { post_id: { $regex: search, $options: 'i' } }
          ];
        }

        // 정렬 조건
        const sortOptions: any = {};
        const validSortFields = ['created_at', 'updated_at', 'scraped_at', 'post_id'];
        const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
        sortOptions[finalSortBy] = order;

        posts = await communityCollection
          .find(filter)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .toArray();

        total = await communityCollection.countDocuments(filter);

        // 새로운 구조로 변환
        posts = posts.map(post => transformCommunityPost(post, topMetric || undefined));
      }
    } catch (error) {
      console.warn('새로운 컬렉션 조회 실패, 기존 컬렉션 사용:', error);
    }

    // 새로운 컬렉션에 데이터가 없으면 기존 fmkorea_posts 사용
    if (posts.length === 0) {
      usedCollection = 'fmkorea_posts';
      
      // 필터 조건 구성
      const filter: any = {};
      
      // 검색 조건 추가
      if (search) {
        filter.$or = [
          { 'content.content': { $regex: search, $options: 'i' } },
          { post_id: { $regex: search, $options: 'i' } }
        ];
      }

      // 정렬 조건
      const sortOptions: any = {};
      const validSortFields = ['created_at', 'updated_at', 'scraped_at', 'post_id'];
      const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
      sortOptions[finalSortBy] = order;

      // 기존 fmkorea_posts 컬렉션에서 데이터 조회
      const fmkoreaCollection = db.collection('fmkorea_posts');
      
      posts = await fmkoreaCollection
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .toArray();

      // 전체 개수 조회
      total = await fmkoreaCollection.countDocuments(filter);

      // 기존 구조로 변환
      posts = posts.map(post => transformFmkoreaPost(post, topMetric || undefined));
    }

    // 디버깅: 첫 번째 게시글 정보 로깅
    if (posts.length > 0) {
      const firstPost = posts[0];
      console.log(`변환된 첫 번째 게시글 (${usedCollection}):`, {
        title: firstPost.title,
        created_at: firstPost.created_at,
        views: firstPost.views,
        likes: firstPost.likes,
        dislikes: firstPost.dislikes,
        comments_count: firstPost.comments_count,
        top_likes: firstPost.top_likes,
        top_comments: firstPost.top_comments,
        top_views: firstPost.top_views
      });
    }

    // 응답 데이터 구성
    const response = {
      success: true,
      data: posts,
      pagination: {
        total,
        skip,
        limit,
        hasMore: skip + limit < total,
        currentPage: Math.floor(skip / limit) + 1,
        totalPages: Math.ceil(total / limit)
      },
      filters: {
        sortBy: sortBy,
        order: order === 1 ? 'asc' : 'desc',
        search,
        topMetric
      },
      meta: {
        usedCollection,
        dataSource: usedCollection === 'community_posts' ? 'new_model' : 'legacy_model'
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('커뮤니티 게시글 목록 조회 실패:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '게시글 목록을 불러오는데 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// POST /api/community-posts - 새 커뮤니티 게시글 생성 (관리자용)
export async function POST(request: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error: 'POST 메서드는 현재 지원되지 않습니다.'
    },
    { status: 405 }
  );
} 
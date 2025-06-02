/*
목차:
- 커뮤니티 게시글 목록 API (라인 1-30)
- GET: 페이지네이션, 정렬, 필터링 지원 (라인 31-80)
- POST: 새 게시글 생성 (관리자용) (라인 81-120)
- 에러 처리 및 응답 형식 (라인 121-150)
*/

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import CommunityPost from '@/lib/models/CommunityPost';

// GET /api/community-posts - 커뮤니티 게시글 목록 조회
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    
    // 쿼리 파라미터 파싱
    const skip = parseInt(searchParams.get('skip') || '0');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50); // 최대 50개로 제한
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const order = searchParams.get('order') === 'asc' ? 1 : -1;
    const category = searchParams.get('category');
    const community = searchParams.get('community');
    const site = searchParams.get('site') || 'fmkorea';
    const search = searchParams.get('search');

    // 필터 조건 구성
    const filter: any = { site };
    
    if (category && category !== 'all') {
      filter.category = category;
    }
    
    if (community && community !== 'all') {
      filter.community = community;
    }

    // 검색 조건 추가
    if (search) {
      filter.$text = { $search: search };
    }

    // 정렬 조건 구성
    const sortOptions: any = {};
    
    // 유효한 정렬 필드 검증
    const validSortFields = ['created_at', 'views', 'likes', 'comments_count', 'title'];
    if (validSortFields.includes(sortBy)) {
      sortOptions[sortBy] = order;
    } else {
      sortOptions.created_at = -1; // 기본값: 최신순
    }

    // 검색 시 텍스트 점수도 정렬에 포함
    if (search) {
      sortOptions.score = { $meta: 'textScore' };
    }

    // 데이터 조회
    const posts = await CommunityPost.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .select({
        post_id: 1,
        title: 1,
        author: 1,
        created_at: 1,
        views: 1,
        likes: 1,
        dislikes: 1,
        comments_count: 1,
        category: 1,
        community: 1,
        site: 1,
        url: 1,
        likes_per_view: 1,
        comments_per_view: 1
      })
      .lean();

    // 전체 개수 조회 (페이지네이션을 위해)
    const total = await CommunityPost.countDocuments(filter);

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
        sortBy,
        order: order === 1 ? 'asc' : 'desc',
        category,
        community,
        site,
        search
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
  try {
    await connectDB();

    const body = await request.json();
    
    // 필수 필드 검증
    const requiredFields = ['post_id', 'title', 'author', 'created_at', 'category'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: '필수 필드가 누락되었습니다.',
          missingFields
        },
        { status: 400 }
      );
    }

    // 중복 post_id 검사
    const existingPost = await CommunityPost.findOne({ post_id: body.post_id });
    if (existingPost) {
      return NextResponse.json(
        {
          success: false,
          error: '이미 존재하는 게시글 ID입니다.'
        },
        { status: 409 }
      );
    }

    // 새 게시글 생성
    const newPost = new CommunityPost({
      ...body,
      site: body.site || 'fmkorea',
      views: body.views || 0,
      likes: body.likes || 0,
      dislikes: body.dislikes || 0,
      comments_count: body.comments_count || 0,
      scraped_at: new Date()
    });

    // 메트릭 계산
    newPost.updateMetrics();
    
    await newPost.save();

    return NextResponse.json(
      {
        success: true,
        data: newPost,
        message: '게시글이 성공적으로 생성되었습니다.'
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('커뮤니티 게시글 생성 실패:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '게시글 생성에 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
} 
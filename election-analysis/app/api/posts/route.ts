/*
목차:
- Posts API 라우트 핸들러
- GET: 게시글 목록 조회 (페이지네이션, 정렬)
- POST: 새 게시글 작성 (유효성 검사)
*/

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Post from '@/lib/models/Post';

// 목업 데이터 (개발용)
const mockPosts = [
  {
    id: '1',
    predictedWinner: 'Lee Jae-myung',
    marginPercentage: 12.5,
    mainQuote: 'Government judgment outweighed fear of criminals.',
    candidates: [
      { name: 'Lee Jae-myung', percentage: 52, color: 'bg-blue-500' },
      { name: 'Kim Moon-soo', percentage: 40, color: 'bg-red-500' },
      { name: 'Others', percentage: 8, color: 'bg-gray-500' },
    ],
    tags: ['대선', '여론조사', '정치분석'],
    analyst: {
      name: 'Dr. Kim Analysis',
      avatar: '/avatars/analyst1.jpg',
      institute: 'Political Research Center',
      date: '2024-01-15',
    },
    votes: { up: 45, down: 8 },
    createdAt: new Date('2024-01-15').toISOString(),
    likes: 45,
    views: 1250
  },
  {
    id: '2',
    predictedWinner: 'Kim Moon-soo',
    marginPercentage: 8.3,
    mainQuote: 'Economic concerns drive conservative shift among voters.',
    candidates: [
      { name: 'Kim Moon-soo', percentage: 48, color: 'bg-red-500' },
      { name: 'Lee Jae-myung', percentage: 40, color: 'bg-blue-500' },
      { name: 'Others', percentage: 12, color: 'bg-gray-500' },
    ],
    tags: ['지방선거', '수도권', '트렌드'],
    analyst: {
      name: 'Prof. Park Institute',
      avatar: '/avatars/analyst2.jpg',
      institute: 'Economic Policy Institute',
      date: '2024-01-14',
    },
    votes: { up: 32, down: 12 },
    createdAt: new Date('2024-01-14').toISOString(),
    likes: 32,
    views: 890
  },
  {
    id: '3',
    predictedWinner: 'Lee Jae-myung',
    marginPercentage: 15.7,
    mainQuote: 'Youth turnout surge favors progressive candidate.',
    candidates: [
      { name: 'Lee Jae-myung', percentage: 56, color: 'bg-blue-500' },
      { name: 'Kim Moon-soo', percentage: 34, color: 'bg-red-500' },
      { name: 'Others', percentage: 10, color: 'bg-gray-500' },
    ],
    tags: ['국회의원', '예측모델', '검증'],
    analyst: {
      name: 'Seoul Polling Center',
      avatar: '/avatars/analyst3.jpg',
      institute: 'Demographics Research',
      date: '2024-01-13',
    },
    votes: { up: 67, down: 5 },
    createdAt: new Date('2024-01-13').toISOString(),
    likes: 67,
    views: 2100
  }
];

// 게시글 목록 조회 (GET /api/posts)
export async function GET(request: NextRequest) {
  try {
    // MongoDB 연결 시도
    await connectDB();

    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get('skip') || '0');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50); // 최대 50개로 제한
    const sortBy = searchParams.get('sortBy') || 'createdAt'; // createdAt, likes, views
    const order = searchParams.get('order') === 'asc' ? 1 : -1;

    // 정렬 옵션 검증
    const allowedSortFields = ['createdAt', 'likes', 'views'];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const posts = await Post.find({})
      .sort({ [sortField]: order })
      .skip(skip)
      .limit(limit)
      .select('-content') // 목록에서는 내용 제외
      .lean();

    const total = await Post.countDocuments({});

    return NextResponse.json({
      posts,
      pagination: {
        skip,
        limit,
        total,
        hasMore: skip + limit < total
      }
    });

  } catch (error) {
    console.error('MongoDB 연결 실패, 목업 데이터 사용:', error);
    
    // MongoDB 연결 실패 시 목업 데이터 반환
    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get('skip') || '0');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';

    // 목업 데이터 정렬
    let sortedPosts = [...mockPosts];
    if (sortBy === 'likes') {
      sortedPosts.sort((a, b) => order === 'asc' ? a.likes - b.likes : b.likes - a.likes);
    } else if (sortBy === 'views') {
      sortedPosts.sort((a, b) => order === 'asc' ? a.views - b.views : b.views - a.views);
    } else {
      sortedPosts.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return order === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }

    // 페이지네이션 적용
    const paginatedPosts = sortedPosts.slice(skip, skip + limit);

    return NextResponse.json({
      posts: paginatedPosts,
      pagination: {
        skip,
        limit,
        total: mockPosts.length,
        hasMore: skip + limit < mockPosts.length
      }
    });
  }
}

// 새 게시글 작성 (POST /api/posts)
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { title, winner, gap, votes, keywords, content, authorId } = body;

    // 유효성 검사
    if (!title || !winner || gap === undefined || !content || !authorId) {
      return NextResponse.json(
        { error: '필수 필드가 누락되었습니다', status: 400 },
        { status: 400 }
      );
    }

    if (typeof gap !== 'number' || gap < 0 || gap > 100) {
      return NextResponse.json(
        { error: '득표율 격차는 0-100 사이의 숫자여야 합니다', status: 400 },
        { status: 400 }
      );
    }

    // votes 필드 유효성 검사
    if (votes && typeof votes === 'object') {
      const { candidate1, candidate2 } = votes;
      if (typeof candidate1 !== 'number' || typeof candidate2 !== 'number' ||
          candidate1 < 0 || candidate1 > 100 || candidate2 < 0 || candidate2 > 100) {
        return NextResponse.json(
          { error: '득표율은 0-100 사이의 숫자여야 합니다', status: 400 },
          { status: 400 }
        );
      }
      
      const total = candidate1 + candidate2;
      if (Math.abs(total - 100) > 0.1) {
        return NextResponse.json(
          { error: '득표율 합계는 100%여야 합니다', status: 400 },
          { status: 400 }
        );
      }
    }

    if (title.length > 100) { // Task Breakdown에 따라 100자로 제한
      return NextResponse.json(
        { error: '제목은 100자를 초과할 수 없습니다', status: 400 },
        { status: 400 }
      );
    }

    if (content.length < 10) {
      return NextResponse.json(
        { error: '내용은 최소 10자 이상이어야 합니다', status: 400 },
        { status: 400 }
      );
    }

    // 키워드 배열 검증 (최대 5개)
    const validKeywords = Array.isArray(keywords) 
      ? keywords.filter(k => typeof k === 'string' && k.trim().length > 0).slice(0, 5)
      : [];

    const newPost = new Post({
      title: title.trim(),
      winner: winner.trim(),
      gap,
      votes: votes || { candidate1: 50, candidate2: 50 }, // votes 필드 추가
      keywords: validKeywords,
      content: content.trim(),
      authorId,
      likes: 0,
      views: 0
    });

    const savedPost = await newPost.save();

    return NextResponse.json(savedPost, { status: 201 });

  } catch (error) {
    console.error('게시글 작성 오류:', error);
    
    // MongoDB 유효성 검사 오류 처리
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json(
        { error: '입력 데이터가 유효하지 않습니다', status: 400 },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '게시글 작성에 실패했습니다', status: 500 },
      { status: 500 }
    );
  }
} 
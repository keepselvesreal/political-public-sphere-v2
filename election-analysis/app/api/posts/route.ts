/*
목차:
- Posts API 라우트 핸들러
- GET: 게시글 목록 조회 (페이지네이션, 정렬)
- POST: 새 게시글 작성 (유효성 검사)
*/

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Post from '@/lib/models/Post';

// 게시글 목록 조회 (GET /api/posts)
export async function GET(request: NextRequest) {
  try {
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
    console.error('게시글 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '게시글 목록을 불러오는데 실패했습니다', status: 500 },
      { status: 500 }
    );
  }
}

// 새 게시글 작성 (POST /api/posts)
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { title, winner, gap, keywords, content, authorId } = body;

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

    if (title.length > 200) {
      return NextResponse.json(
        { error: '제목은 200자를 초과할 수 없습니다', status: 400 },
        { status: 400 }
      );
    }

    if (content.length < 10) {
      return NextResponse.json(
        { error: '내용은 최소 10자 이상이어야 합니다', status: 400 },
        { status: 400 }
      );
    }

    // 키워드 배열 검증
    const validKeywords = Array.isArray(keywords) 
      ? keywords.filter(k => typeof k === 'string' && k.trim().length > 0)
      : [];

    const newPost = new Post({
      title: title.trim(),
      winner: winner.trim(),
      gap,
      keywords: validKeywords,
      content: content.trim(),
      authorId,
      votes: { up: 0, down: 0 },
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
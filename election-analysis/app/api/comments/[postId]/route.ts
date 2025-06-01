/*
목차:
- 댓글 API 라우트 핸들러
- GET: 특정 게시글의 댓글 목록 조회
- POST: 새 댓글 작성 (인증된 사용자만)
*/

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Comment from '@/lib/models/Comment';
import Post from '@/lib/models/Post';

// 댓글 목록 조회 (GET /api/comments/[postId])
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    await connectDB();
    const { postId } = await params;

    // 게시글 존재 확인
    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json(
        { error: '게시글을 찾을 수 없습니다', status: 404 },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get('skip') || '0');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100); // 최대 100개로 제한

    const comments = await Comment.find({ postId })
      .sort({ createdAt: -1 }) // 최신 댓글부터
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Comment.countDocuments({ postId });

    return NextResponse.json({
      comments,
      pagination: {
        skip,
        limit,
        total,
        hasMore: skip + limit < total
      }
    });

  } catch (error) {
    console.error('댓글 목록 조회 오류:', error);
    return NextResponse.json(
      { error: '댓글 목록을 불러오는데 실패했습니다', status: 500 },
      { status: 500 }
    );
  }
}

// 새 댓글 작성 (POST /api/comments/[postId])
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    await connectDB();
    const { postId } = await params;
    const body = await request.json();
    const { content, authorId } = body;

    // 유효성 검사
    if (!content || !authorId) {
      return NextResponse.json(
        { error: '댓글 내용과 작성자 ID가 필요합니다', status: 400 },
        { status: 400 }
      );
    }

    if (content.trim().length === 0) {
      return NextResponse.json(
        { error: '댓글 내용을 입력해주세요', status: 400 },
        { status: 400 }
      );
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { error: '댓글은 1000자를 초과할 수 없습니다', status: 400 },
        { status: 400 }
      );
    }

    // 게시글 존재 확인
    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json(
        { error: '게시글을 찾을 수 없습니다', status: 404 },
        { status: 404 }
      );
    }

    // 새 댓글 생성
    const newComment = new Comment({
      postId,
      content: content.trim(),
      authorId
    });

    const savedComment = await newComment.save();

    return NextResponse.json(savedComment, { status: 201 });

  } catch (error) {
    console.error('댓글 작성 오류:', error);
    
    // MongoDB 유효성 검사 오류 처리
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json(
        { error: '입력 데이터가 유효하지 않습니다', status: 400 },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '댓글 작성에 실패했습니다', status: 500 },
      { status: 500 }
    );
  }
} 
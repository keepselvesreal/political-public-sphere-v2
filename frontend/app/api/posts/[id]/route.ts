/*
목차:
- 개별 게시글 API 라우트 핸들러
- GET: 게시글 상세 조회 (조회수 증가, lean() 최적화)
- PUT: 게시글 수정 (작성자 권한 확인)
- DELETE: 게시글 삭제 (작성자 권한 확인)
*/

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Post from '@/lib/models/Post';

// 게시글 상세 조회 (GET /api/posts/[id]) - 성능 최적화 적용
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    // 성능 최적화: lean() 사용으로 빠른 조회
    const post = await Post.findById(id).lean();

    if (!post) {
      return NextResponse.json(
        { error: '게시글을 찾을 수 없습니다', status: 404 },
        { status: 404 }
      );
    }

    // 조회수 증가를 별도 쿼리로 분리 (응답 속도 향상)
    // 백그라운드에서 실행되도록 await 없이 처리
    Post.findByIdAndUpdate(id, { $inc: { views: 1 } }).exec().catch(err => {
      console.error('조회수 업데이트 실패:', err);
    });

    return NextResponse.json(post);

  } catch (error) {
    console.error('게시글 조회 오류:', error);
    return NextResponse.json(
      { error: '게시글을 불러오는데 실패했습니다', status: 500 },
      { status: 500 }
    );
  }
}

// 게시글 수정 (PUT /api/posts/[id])
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const { title, winner, gap, keywords, content, authorId } = body;

    // 기존 게시글 확인
    const existingPost = await Post.findById(id);
    if (!existingPost) {
      return NextResponse.json(
        { error: '게시글을 찾을 수 없습니다', status: 404 },
        { status: 404 }
      );
    }

    // 작성자 권한 확인
    if (existingPost.authorId !== authorId) {
      return NextResponse.json(
        { error: '게시글을 수정할 권한이 없습니다', status: 403 },
        { status: 403 }
      );
    }

    // 유효성 검사
    if (!title || !winner || gap === undefined || !content) {
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

    // 키워드 배열 검증
    const validKeywords = Array.isArray(keywords) 
      ? keywords.filter(k => typeof k === 'string' && k.trim().length > 0)
      : [];

    const updatedPost = await Post.findByIdAndUpdate(
      id,
      {
        title: title.trim(),
        winner: winner.trim(),
        gap,
        keywords: validKeywords,
        content: content.trim(),
      },
      { new: true, runValidators: true }
    );

    return NextResponse.json(updatedPost);

  } catch (error) {
    console.error('게시글 수정 오류:', error);
    
    if (error instanceof Error && error.name === 'ValidationError') {
      return NextResponse.json(
        { error: '입력 데이터가 유효하지 않습니다', status: 400 },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: '게시글 수정에 실패했습니다', status: 500 },
      { status: 500 }
    );
  }
}

// 게시글 삭제 (DELETE /api/posts/[id])
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const authorId = searchParams.get('authorId');

    if (!authorId) {
      return NextResponse.json(
        { error: '작성자 ID가 필요합니다', status: 400 },
        { status: 400 }
      );
    }

    // 기존 게시글 확인
    const existingPost = await Post.findById(id);
    if (!existingPost) {
      return NextResponse.json(
        { error: '게시글을 찾을 수 없습니다', status: 404 },
        { status: 404 }
      );
    }

    // 작성자 권한 확인
    if (existingPost.authorId !== authorId) {
      return NextResponse.json(
        { error: '게시글을 삭제할 권한이 없습니다', status: 403 },
        { status: 403 }
      );
    }

    await Post.findByIdAndDelete(id);

    return NextResponse.json({ message: '게시글이 삭제되었습니다' });

  } catch (error) {
    console.error('게시글 삭제 오류:', error);
    return NextResponse.json(
      { error: '게시글 삭제에 실패했습니다', status: 500 },
      { status: 500 }
    );
  }
} 
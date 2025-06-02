/*
목차:
- 댓글 좋아요 API 라우트 핸들러
- POST: 댓글에 좋아요 추가/제거
- 중복 좋아요 방지
*/

import { NextRequest, NextResponse } from 'next/server';

// 댓글 좋아요 처리 (POST /api/comments/like)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { commentId, userId } = body;

    // 유효성 검사
    if (!commentId) {
      return NextResponse.json(
        { error: '댓글 ID가 필요합니다', status: 400 },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: '사용자 인증이 필요합니다', status: 401 },
        { status: 401 }
      );
    }

    // 실제로는 데이터베이스에서 좋아요 처리
    // const existingLike = await CommentLike.findOne({ commentId, userId });
    // 
    // if (existingLike) {
    //   // 좋아요 취소
    //   await CommentLike.findByIdAndDelete(existingLike._id);
    //   await Comment.findByIdAndUpdate(commentId, { $inc: { likes: -1 } });
    //   return NextResponse.json({ message: '좋아요가 취소되었습니다', action: 'removed' });
    // } else {
    //   // 좋아요 추가
    //   const newLike = new CommentLike({ commentId, userId });
    //   await newLike.save();
    //   await Comment.findByIdAndUpdate(commentId, { $inc: { likes: 1 } });
    //   return NextResponse.json({ message: '좋아요가 추가되었습니다', action: 'added' });
    // }

    // Mock 응답
    return NextResponse.json({
      message: '좋아요가 처리되었습니다',
      action: 'added',
    });

  } catch (error) {
    console.error('댓글 좋아요 처리 오류:', error);
    return NextResponse.json(
      { error: '좋아요 처리에 실패했습니다', status: 500 },
      { status: 500 }
    );
  }
} 
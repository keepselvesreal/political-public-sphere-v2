/*
목차:
- 댓글 삭제 API 라우트 핸들러
- DELETE: 댓글 삭제 (작성자만 가능)
- 자식 댓글이 있는 경우 내용만 삭제하고 구조 유지
- 인증 및 권한 검사
*/

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectDB } from '@/lib/mongoose';
import Comment from '@/lib/models/Comment';
import CommentVote from '@/lib/models/CommentVote';

// 댓글 삭제 (DELETE /api/comments/delete/[commentId])
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params;
    
    // 인증 확인
    const session = await auth();
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: '로그인이 필요합니다', status: 401 },
        { status: 401 }
      );
    }
    
    // MongoDB 연결
    await connectDB();
    
    // 댓글 조회
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return NextResponse.json(
        { error: '댓글을 찾을 수 없습니다', status: 404 },
        { status: 404 }
      );
    }
    
    // 작성자 권한 확인
    if (comment.authorId !== session.user.id) {
      return NextResponse.json(
        { error: '본인이 작성한 댓글만 삭제할 수 있습니다', status: 403 },
        { status: 403 }
      );
    }
    
    // 이미 삭제된 댓글인지 확인
    if (comment.content === '[삭제된 댓글입니다]') {
      return NextResponse.json(
        { error: '이미 삭제된 댓글입니다', status: 400 },
        { status: 400 }
      );
    }
    
    // 자식 댓글이 있는지 확인
    const hasReplies = await Comment.countDocuments({ parentId: commentId }) > 0;
    
    if (hasReplies) {
      // 자식 댓글이 있는 경우: 내용만 삭제하고 구조 유지
      comment.content = '[삭제된 댓글입니다]';
      await comment.save();
      
      return NextResponse.json({
        message: '댓글이 삭제되었습니다 (답글이 있어 구조는 유지됩니다)',
        action: 'content_deleted',
        commentId
      });
    } else {
      // 자식 댓글이 없는 경우: 완전 삭제
      await Comment.findByIdAndDelete(commentId);
      
      // 관련 투표도 삭제
      await CommentVote.deleteMany({ commentId });
      
      return NextResponse.json({
        message: '댓글이 완전히 삭제되었습니다',
        action: 'completely_deleted',
        commentId
      });
    }
    
  } catch (error: any) {
    console.error('댓글 삭제 오류:', error);
    return NextResponse.json(
      { error: '댓글 삭제에 실패했습니다', status: 500 },
      { status: 500 }
    );
  }
} 
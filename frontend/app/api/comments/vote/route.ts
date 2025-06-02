/*
목차:
- 댓글 투표 API 라우트 핸들러
- POST: 댓글에 좋아요/비추천 투표
- GET: 댓글의 투표 현황 조회
- 인증 및 유효성 검사
- 중복 투표 방지 로직
*/

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectDB } from '@/lib/mongoose';
import CommentVote from '@/lib/models/CommentVote';
import Comment from '@/lib/models/Comment';

// 댓글 투표 현황 조회 (GET /api/comments/[commentId]/vote)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params;
    
    // MongoDB 연결
    await connectDB();
    
    // 댓글 존재 여부 확인
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return NextResponse.json(
        { error: '댓글을 찾을 수 없습니다', status: 404 },
        { status: 404 }
      );
    }
    
    // 투표 현황 조회
    const voteCounts = await (CommentVote as any).getVoteCounts(commentId);
    
    // 사용자의 투표 상태 조회 (로그인한 경우)
    let userVote = null;
    const session = await auth();
    if (session?.user?.id) {
      userVote = await (CommentVote as any).getUserVote(commentId, session.user.id);
    }
    
    return NextResponse.json({
      commentId,
      likes: voteCounts.likes,
      dislikes: voteCounts.dislikes,
      userVote,
      total: voteCounts.likes + voteCounts.dislikes
    });
    
  } catch (error: any) {
    console.error('댓글 투표 현황 조회 오류:', error);
    return NextResponse.json(
      { error: '투표 현황을 불러오는데 실패했습니다', status: 500 },
      { status: 500 }
    );
  }
}

// 댓글 투표 (POST /api/comments/[commentId]/vote)
export async function POST(
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
    
    // 요청 본문 파싱
    const body = await request.json();
    const { voteType } = body;
    
    // 유효성 검사
    if (!voteType || !['like', 'dislike'].includes(voteType)) {
      return NextResponse.json(
        { error: '투표 타입은 like 또는 dislike여야 합니다', status: 400 },
        { status: 400 }
      );
    }
    
    // MongoDB 연결
    await connectDB();
    
    // 댓글 존재 여부 확인
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return NextResponse.json(
        { error: '댓글을 찾을 수 없습니다', status: 404 },
        { status: 404 }
      );
    }
    
    // 자신의 댓글에는 투표할 수 없음
    if (comment.authorId === session.user.id) {
      return NextResponse.json(
        { error: '자신의 댓글에는 투표할 수 없습니다', status: 400 },
        { status: 400 }
      );
    }
    
    // 투표 토글 처리
    const voteResult = await (CommentVote as any).toggleVote(commentId, session.user.id, voteType);
    
    // 업데이트된 투표 현황 조회
    const voteCounts = await (CommentVote as any).getVoteCounts(commentId);
    
    let message = '';
    switch (voteResult.action) {
      case 'added':
        message = voteType === 'like' ? '좋아요를 눌렀습니다' : '비추천을 눌렀습니다';
        break;
      case 'changed':
        message = voteType === 'like' ? '좋아요로 변경했습니다' : '비추천으로 변경했습니다';
        break;
      case 'removed':
        message = '투표를 취소했습니다';
        break;
    }
    
    return NextResponse.json({
      message,
      action: voteResult.action,
      commentId,
      likes: voteCounts.likes,
      dislikes: voteCounts.dislikes,
      userVote: voteResult.voteType,
      total: voteCounts.likes + voteCounts.dislikes
    });
    
  } catch (error: any) {
    console.error('댓글 투표 오류:', error);
    
    // 중복 투표 오류 처리
    if (error.code === 11000) {
      return NextResponse.json(
        { error: '이미 투표하셨습니다', status: 400 },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: '투표 처리에 실패했습니다', status: 500 },
      { status: 500 }
    );
  }
} 
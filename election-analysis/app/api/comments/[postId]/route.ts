/*
목차:
- 댓글 API 라우트 핸들러 (중첩 댓글 지원)
- GET: 게시글의 댓글 트리 구조 조회 (실제 DB 연동)
- POST: 새 댓글/답글 추가 (실제 DB 연동)
- 인증 및 유효성 검사
- 에러 처리 및 로깅
*/

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectDB } from '@/lib/mongoose';
import Comment from '@/lib/models/Comment';
import Post from '@/lib/models/Post';

// 댓글 목록 조회 (GET /api/comments/[postId])
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    
    // MongoDB 연결
    await connectDB();
    
    // 게시글 존재 여부 확인
    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json(
        { error: '게시글을 찾을 수 없습니다', status: 404 },
        { status: 404 }
      );
    }
    
    // URL 쿼리 파라미터 처리
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // 댓글 트리 구조 조회 (새로운 스태틱 메서드 사용)
    let commentsTree;
    try {
      commentsTree = await (Comment as any).getCommentTree(postId, page, limit);
    } catch (error) {
      // 스태틱 메서드가 없는 경우 기본 조회 방식 사용
      console.warn('getCommentTree 메서드를 사용할 수 없어 기본 조회 방식을 사용합니다:', error);
      
      // 기본 방식: 최상위 댓글만 조회
      const rootComments = await Comment.find({ 
        postId, 
        $or: [{ parentId: null }, { parentId: { $exists: false } }]
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
      
      // 각 최상위 댓글에 대해 자식 댓글들을 조회
      commentsTree = await Promise.all(
        rootComments.map(async (comment: any) => {
          const replies = await Comment.find({ parentId: comment._id.toString() })
            .sort({ createdAt: 1 })
            .lean();
          return { ...comment, replies };
        })
      );
    }
    
    // 전체 댓글 수 조회
    const total = await Comment.countDocuments({ postId });
    
    // 댓글 데이터 포맷팅 (프론트엔드 형식에 맞춤)
    const formattedComments = formatCommentsForFrontend(commentsTree);
    
    return NextResponse.json({
      comments: formattedComments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: (page - 1) * limit + formattedComments.length < total
    });
    
  } catch (error: any) {
    console.error('댓글 조회 오류:', error);
    return NextResponse.json(
      { error: '댓글을 불러오는데 실패했습니다', status: 500 },
      { status: 500 }
    );
  }
}

// 새 댓글/답글 추가 (POST /api/comments/[postId])
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    
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
    const { content, parentId } = body;
    
    // 유효성 검사
    if (!content || typeof content !== 'string' || !content.trim()) {
      return NextResponse.json(
        { error: '댓글 내용이 필요합니다', status: 400 },
        { status: 400 }
      );
    }
    
    if (content.trim().length > 1000) {
      return NextResponse.json(
        { error: '댓글은 1000자를 초과할 수 없습니다', status: 400 },
        { status: 400 }
      );
    }
    
    // MongoDB 연결
    await connectDB();
    
    // 게시글 존재 여부 확인
    const post = await Post.findById(postId);
    if (!post) {
      return NextResponse.json(
        { error: '게시글을 찾을 수 없습니다', status: 404 },
        { status: 404 }
      );
    }
    
    // 부모 댓글 존재 여부 확인 (답글인 경우)
    let depth = 0;
    if (parentId) {
      const parentComment = await Comment.findById(parentId);
      if (!parentComment) {
        return NextResponse.json(
          { error: '부모 댓글을 찾을 수 없습니다', status: 404 },
          { status: 404 }
        );
      }
      if (parentComment.postId !== postId) {
        return NextResponse.json(
          { error: '다른 게시글의 댓글에는 답글을 달 수 없습니다', status: 400 },
          { status: 400 }
        );
      }
      depth = (parentComment.depth || 0) + 1;
      
      // 최대 깊이 제한
      if (depth > 5) {
        return NextResponse.json(
          { error: '댓글 깊이가 최대 허용 깊이를 초과했습니다', status: 400 },
          { status: 400 }
        );
      }
    }
    
    // 새 댓글 생성
    let newComment;
    try {
      // 스태틱 메서드 사용 시도
      newComment = await (Comment as any).createComment({
        postId,
        content: content.trim(),
        authorId: session.user.id,
        parentId: parentId || null
      });
    } catch (error) {
      // 스태틱 메서드가 없는 경우 기본 생성 방식 사용
      console.warn('createComment 메서드를 사용할 수 없어 기본 생성 방식을 사용합니다:', error);
      
      newComment = new Comment({
        postId,
        content: content.trim(),
        authorId: session.user.id,
        parentId: parentId || null,
        depth,
        createdAt: new Date()
      });
      
      await newComment.save();
    }
    
    // 응답용 댓글 데이터 포맷팅
    const formattedComment = {
      id: newComment._id.toString(),
      author: {
        name: session.user.name || `사용자 ${session.user.id.slice(-4)}`,
        avatar: session.user.image || '/avatars/default.jpg',
      },
      content: newComment.content,
      date: '방금 전',
      likes: 0,
      replies: [],
      createdAt: newComment.createdAt,
      authorId: newComment.authorId,
      parentId: newComment.parentId,
      depth: newComment.depth || 0
    };
    
    return NextResponse.json({
      message: parentId ? '답글이 성공적으로 추가되었습니다' : '댓글이 성공적으로 추가되었습니다',
      comment: formattedComment,
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('댓글 추가 오류:', error);
    
    // Mongoose 유효성 검사 오류 처리
    if (error.name === 'ValidationError') {
      const firstError = Object.values(error.errors)[0] as any;
      return NextResponse.json(
        { error: firstError.message, status: 400 },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: '댓글 추가에 실패했습니다', status: 500 },
      { status: 500 }
    );
  }
}

// 댓글 데이터를 프론트엔드 형식으로 포맷팅하는 유틸리티 함수
function formatCommentsForFrontend(comments: any[]): any[] {
  return comments.map(comment => ({
    id: comment._id.toString(),
    author: {
      name: `사용자 ${comment.authorId.slice(-4)}`, // 임시 사용자명
      avatar: '/avatars/default.jpg',
    },
    content: comment.content,
    date: getRelativeTime(comment.createdAt),
    likes: 0, // 추후 좋아요 기능 구현 시 업데이트
    replies: comment.replies ? formatCommentsForFrontend(comment.replies) : [],
    createdAt: comment.createdAt,
    authorId: comment.authorId,
    parentId: comment.parentId,
    depth: comment.depth || 0
  }));
}

// 상대 시간 계산 유틸리티 함수
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return '방금 전';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}분 전`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}시간 전`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}일 전`;
  } else {
    return date.toLocaleDateString('ko-KR');
  }
} 
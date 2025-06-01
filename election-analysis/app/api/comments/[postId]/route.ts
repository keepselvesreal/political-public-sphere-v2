/*
목차:
- 댓글 API 라우트 핸들러
- GET: 게시글의 댓글 목록 조회
- POST: 새 댓글 추가
- 인증 및 유효성 검사
*/

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Comment from '@/lib/models/Comment';
import Post from '@/lib/models/Post';

// Mock 댓글 데이터
const MOCK_COMMENTS = [
  {
    id: '1',
    author: {
      name: 'Min-ji Kim',
      avatar: '/avatars/user1.jpg',
    },
    content: 'This analysis seems thorough. I agree with the assessment that economic policies are driving the shift in voter sentiment.',
    date: '1 day ago',
    likes: 24,
    replies: [],
  },
  {
    id: '2',
    author: {
      name: 'Joon Park',
      avatar: '/avatars/user2.jpg',
    },
    content: 'I disagree with the margin prediction. I think it will be much closer based on recent events that weren\'t accounted for in this analysis.',
    date: '2 days ago',
    likes: 8,
    replies: [
      {
        id: '21',
        author: {
          name: 'Su-jin Lee',
          avatar: '/avatars/user3.jpg',
        },
        content: 'What recent events are you referring to? The analysis seems to cover most major developments.',
        date: '1 day ago',
        likes: 5,
      },
    ],
  },
];

// 댓글 목록 조회 (GET /api/comments/[postId])
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    
    // 실제로는 데이터베이스에서 댓글을 조회
    // const comments = await Comment.find({ postId }).populate('author');
    
    return NextResponse.json({
      comments: MOCK_COMMENTS,
      total: MOCK_COMMENTS.length,
    });
  } catch (error) {
    console.error('댓글 조회 오류:', error);
    return NextResponse.json(
      { error: '댓글을 불러오는데 실패했습니다', status: 500 },
      { status: 500 }
    );
  }
}

// 새 댓글 추가 (POST /api/comments/[postId])
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const body = await request.json();
    const { content, userId } = body;

    // 유효성 검사
    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: '댓글 내용이 필요합니다', status: 400 },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: '사용자 인증이 필요합니다', status: 401 },
        { status: 401 }
      );
    }

    // 실제로는 데이터베이스에 댓글 저장
    // const newComment = new Comment({
    //   postId,
    //   userId,
    //   content: content.trim(),
    //   createdAt: new Date(),
    // });
    // await newComment.save();

    const newComment = {
      id: Date.now().toString(),
      author: {
        name: 'Current User',
        avatar: '/avatars/current-user.jpg',
      },
      content: content.trim(),
      date: 'Just now',
      likes: 0,
      replies: [],
    };

    return NextResponse.json({
      message: '댓글이 성공적으로 추가되었습니다',
      comment: newComment,
    }, { status: 201 });

  } catch (error) {
    console.error('댓글 추가 오류:', error);
    return NextResponse.json(
      { error: '댓글 추가에 실패했습니다', status: 500 },
      { status: 500 }
    );
  }
} 
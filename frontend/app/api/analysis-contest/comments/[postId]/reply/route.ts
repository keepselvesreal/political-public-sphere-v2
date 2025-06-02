/*
목차:
- 답글 API 라우트 핸들러
- POST: 댓글에 대한 답글 추가
- 인증 및 유효성 검사
*/

import { NextRequest, NextResponse } from 'next/server';

// 답글 추가 (POST /api/comments/[postId]/reply)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const body = await request.json();
    const { content, parentId, userId } = body;

    // 유효성 검사
    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: '답글 내용이 필요합니다', status: 400 },
        { status: 400 }
      );
    }

    if (!parentId) {
      return NextResponse.json(
        { error: '부모 댓글 ID가 필요합니다', status: 400 },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: '사용자 인증이 필요합니다', status: 401 },
        { status: 401 }
      );
    }

    // 실제로는 데이터베이스에 답글 저장
    // const newReply = new Comment({
    //   postId,
    //   parentId,
    //   userId,
    //   content: content.trim(),
    //   createdAt: new Date(),
    // });
    // await newReply.save();

    const newReply = {
      id: Date.now().toString(),
      author: {
        name: 'Current User',
        avatar: '/avatars/current-user.jpg',
      },
      content: content.trim(),
      date: 'Just now',
      likes: 0,
    };

    return NextResponse.json({
      message: '답글이 성공적으로 추가되었습니다',
      reply: newReply,
    }, { status: 201 });

  } catch (error) {
    console.error('답글 추가 오류:', error);
    return NextResponse.json(
      { error: '답글 추가에 실패했습니다', status: 500 },
      { status: 500 }
    );
  }
} 
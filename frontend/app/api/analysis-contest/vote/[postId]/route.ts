/*
목차:
- 투표 API 라우트 핸들러
- POST: 게시글에 대한 추천/비추천 투표
- 중복 투표 방지 및 투표 변경 처리
*/

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import Post from '@/lib/models/Post';
import Vote from '@/lib/models/Vote';

// 투표 처리 (POST /api/vote/[postId])
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    await connectDB();
    const { postId } = await params;
    const body = await request.json();
    const { userId, type } = body;

    // 유효성 검사
    if (!userId || !type) {
      return NextResponse.json(
        { error: '사용자 ID와 투표 타입이 필요합니다', status: 400 },
        { status: 400 }
      );
    }

    if (!['up', 'down'].includes(type)) {
      return NextResponse.json(
        { error: '투표 타입은 up 또는 down이어야 합니다', status: 400 },
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

    // 기존 투표 확인
    const existingVote = await Vote.findOne({ postId, userId });

    if (existingVote) {
      // 같은 타입의 투표인 경우 투표 취소
      if (existingVote.type === type) {
        await Vote.findByIdAndDelete(existingVote._id);
        
        // 게시글의 투표 수 감소
        const updateField = type === 'up' ? 'votes.up' : 'votes.down';
        await Post.findByIdAndUpdate(postId, { $inc: { [updateField]: -1 } });

        return NextResponse.json({ 
          message: '투표가 취소되었습니다',
          action: 'removed',
          type 
        });
      } else {
        // 다른 타입의 투표인 경우 투표 변경
        await Vote.findByIdAndUpdate(existingVote._id, { type });
        
        // 게시글의 투표 수 업데이트 (기존 투표 -1, 새 투표 +1)
        const oldField = existingVote.type === 'up' ? 'votes.up' : 'votes.down';
        const newField = type === 'up' ? 'votes.up' : 'votes.down';
        
        await Post.findByIdAndUpdate(postId, { 
          $inc: { 
            [oldField]: -1,
            [newField]: 1 
          } 
        });

        return NextResponse.json({ 
          message: '투표가 변경되었습니다',
          action: 'changed',
          from: existingVote.type,
          to: type 
        });
      }
    } else {
      // 새로운 투표 생성
      const newVote = new Vote({
        postId,
        userId,
        type
      });

      await newVote.save();

      // 게시글의 투표 수 증가
      const updateField = type === 'up' ? 'votes.up' : 'votes.down';
      await Post.findByIdAndUpdate(postId, { $inc: { [updateField]: 1 } });

      return NextResponse.json({ 
        message: '투표가 등록되었습니다',
        action: 'added',
        type 
      });
    }

  } catch (error) {
    console.error('투표 처리 오류:', error);
    
    // MongoDB 중복 키 오류 처리
    if (error instanceof Error && 'code' in error && error.code === 11000) {
      return NextResponse.json(
        { error: '이미 투표하셨습니다', status: 409 },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: '투표 처리에 실패했습니다', status: 500 },
      { status: 500 }
    );
  }
} 
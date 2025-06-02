/*
목차:
- 개별 커뮤니티 게시글 조회 API (라인 1-30)
- GET: 게시글 상세 정보 조회 및 조회수 증가 (라인 31-80)
- 에러 처리 및 404 처리 (라인 81-100)
*/

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import CommunityPost from '@/lib/models/CommunityPost';

// GET /api/community-posts/[id] - 개별 커뮤니티 게시글 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    // MongoDB ObjectId 또는 post_id로 조회 시도
    let post;
    
    // ObjectId 형식인지 확인 (24자리 hex 문자열)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    
    if (isObjectId) {
      // MongoDB ObjectId로 조회
      post = await CommunityPost.findById(id).lean();
    } else {
      // post_id로 조회
      post = await CommunityPost.findOne({ post_id: id }).lean();
    }

    if (!post) {
      return NextResponse.json(
        {
          success: false,
          error: '게시글을 찾을 수 없습니다.'
        },
        { status: 404 }
      );
    }

    // 조회수 증가 (비동기로 처리하여 응답 속도 향상)
    if (isObjectId) {
      CommunityPost.findByIdAndUpdate(id, { $inc: { views: 1 } }).exec();
    } else {
      CommunityPost.findOneAndUpdate({ post_id: id }, { $inc: { views: 1 } }).exec();
    }

    // 응답 데이터 구성
    const response = {
      success: true,
      data: {
        ...post,
        views: (post as any).views + 1 // 증가된 조회수 반영
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('커뮤니티 게시글 조회 실패:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '게시글을 불러오는데 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// PUT /api/community-posts/[id] - 게시글 수정 (관리자용)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await request.json();

    // 수정 불가능한 필드 제거
    const { _id, post_id, scraped_at, createdAt, updatedAt, ...updateData } = body;

    // ObjectId 형식인지 확인
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    
    let updatedPost;
    if (isObjectId) {
      updatedPost = await CommunityPost.findByIdAndUpdate(
        id,
        { 
          ...updateData,
          last_updated: new Date()
        },
        { new: true, runValidators: true }
      ).lean();
    } else {
      updatedPost = await CommunityPost.findOneAndUpdate(
        { post_id: id },
        { 
          ...updateData,
          last_updated: new Date()
        },
        { new: true, runValidators: true }
      ).lean();
    }

    if (!updatedPost) {
      return NextResponse.json(
        {
          success: false,
          error: '게시글을 찾을 수 없습니다.'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: updatedPost,
        message: '게시글이 성공적으로 수정되었습니다.'
      }
    );

  } catch (error) {
    console.error('커뮤니티 게시글 수정 실패:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '게시글 수정에 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/community-posts/[id] - 게시글 삭제 (관리자용)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    // ObjectId 형식인지 확인
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    
    let deletedPost;
    if (isObjectId) {
      deletedPost = await CommunityPost.findByIdAndDelete(id).lean();
    } else {
      deletedPost = await CommunityPost.findOneAndDelete({ post_id: id }).lean();
    }

    if (!deletedPost) {
      return NextResponse.json(
        {
          success: false,
          error: '게시글을 찾을 수 없습니다.'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: deletedPost,
        message: '게시글이 성공적으로 삭제되었습니다.'
      }
    );

  } catch (error) {
    console.error('커뮤니티 게시글 삭제 실패:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: '게시글 삭제에 실패했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
} 
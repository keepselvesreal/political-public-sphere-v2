/*
목차:
- 개별 커뮤니티 게시글 조회 API (라인 1-50)
- MongoDB 연결 및 데이터 조회 (라인 51-100)
- 에러 핸들링 및 응답 포맷 (라인 101-150)

작성자: AI Assistant
작성일: 2025-01-28
최종 수정: 2025-01-28 (개별 게시글 조회 API 구현)
*/

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import mongoose from 'mongoose';

// 커뮤니티 게시글 스키마 (기존과 동일)
const CommunityPostSchema = new mongoose.Schema({
  post_id: { type: String, required: true, unique: true },
  community: { type: String, required: true },
  site: { type: String, required: true },
  title: { type: String, required: true },
  author: { type: String, required: true },
  created_at: { type: Date, required: true },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  comments_count: { type: Number, default: 0 },
  url: { type: String },
  category: { type: String, default: '일반' },
  content: { type: String },
  comments: [{ type: mongoose.Schema.Types.Mixed }],
  // 메트릭 계산 필드
  likes_per_view: { type: Number, default: 0 },
  comments_per_view: { type: Number, default: 0 },
  views_per_exposure_hour: { type: Number, default: 0 }
}, {
  timestamps: true,
  collection: 'community_posts'
});

// 메트릭 계산 미들웨어
CommunityPostSchema.pre('save', function(next) {
  // 추천률 계산 (조회수가 0이면 0으로 설정)
  this.likes_per_view = this.views > 0 ? this.likes / this.views : 0;
  
  // 댓글률 계산
  this.comments_per_view = this.views > 0 ? this.comments_count / this.views : 0;
  
  // 시간당 조회수 계산 (생성 후 경과 시간 기준)
  const hoursElapsed = (Date.now() - this.created_at.getTime()) / (1000 * 60 * 60);
  this.views_per_exposure_hour = hoursElapsed > 0 ? this.views / hoursElapsed : 0;
  
  next();
});

// 모델 생성 (이미 존재하면 기존 모델 사용)
const CommunityPost = mongoose.models.CommunityPost || mongoose.model('CommunityPost', CommunityPostSchema);

// GET 요청 핸들러 - 개별 게시글 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    
    const { id } = await params;
    
    console.log('개별 게시글 조회 요청:', id);
    
    // MongoDB ObjectId 유효성 검사
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { 
          success: false, 
          error: '유효하지 않은 게시글 ID입니다.' 
        },
        { status: 400 }
      );
    }
    
    // 게시글 조회
    const post = await CommunityPost.findById(id).lean();
    
    if (!post) {
      return NextResponse.json(
        { 
          success: false, 
          error: '게시글을 찾을 수 없습니다.' 
        },
        { status: 404 }
      );
    }
    
    // 조회수 증가 (실제 서비스에서는 중복 조회 방지 로직 필요)
    await CommunityPost.findByIdAndUpdate(
      id, 
      { $inc: { views: 1 } },
      { new: true }
    );
    
    // 메트릭 재계산
    const updatedPost = await CommunityPost.findById(id).lean();
    
    console.log('게시글 조회 성공:', (updatedPost as any)?.title);
    
    return NextResponse.json({
      success: true,
      data: updatedPost,
      message: '게시글 조회 성공'
    });
    
  } catch (error) {
    console.error('개별 게시글 조회 API 에러:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: '서버 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
} 
/*
목차:
- CommunityPost 모델 정의 (라인 1-30)
- 스크래핑 데이터 구조에 맞는 스키마 설계 (라인 31-80)
- 인덱스 및 검색 최적화 설정 (라인 81-100)
*/

import mongoose, { Schema, Document } from 'mongoose';

// CommunityPost 인터페이스 정의
export interface ICommunityPost extends Document {
  _id: string;
  post_id: string;
  community: string;
  site: string;
  title: string;
  author: string;
  created_at: Date;
  views: number;
  likes: number;
  dislikes: number;
  comments_count: number;
  url?: string;
  category: string;
  content?: string;
  content_data?: any[]; // 원본 content 배열 데이터
  
  // 계산된 메트릭 필드들
  likes_per_view?: number;
  comments_per_view?: number;
  views_per_exposure_hour?: number;
  
  // 메타데이터
  scraped_at?: Date;
  last_updated?: Date;
}

// CommunityPost 스키마 정의
const CommunityPostSchema = new Schema<ICommunityPost>({
  post_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  community: {
    type: String,
    required: true,
    index: true
  },
  site: {
    type: String,
    required: true,
    default: 'fmkorea',
    index: true
  },
  title: {
    type: String,
    required: true,
    index: 'text' // 텍스트 검색을 위한 인덱스
  },
  author: {
    type: String,
    required: true,
    index: true
  },
  created_at: {
    type: Date,
    required: true,
    index: -1 // 최신순 정렬을 위한 내림차순 인덱스
  },
  views: {
    type: Number,
    required: true,
    default: 0,
    index: -1 // 조회수 정렬을 위한 인덱스
  },
  likes: {
    type: Number,
    required: true,
    default: 0,
    index: -1 // 추천수 정렬을 위한 인덱스
  },
  dislikes: {
    type: Number,
    required: true,
    default: 0
  },
  comments_count: {
    type: Number,
    required: true,
    default: 0,
    index: -1 // 댓글수 정렬을 위한 인덱스
  },
  url: {
    type: String,
    sparse: true // null 값 허용하면서 인덱스 생성
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  content: {
    type: String,
    index: 'text' // 텍스트 검색을 위한 인덱스
  },
  content_data: [{
    type: Schema.Types.Mixed // 원본 content 배열 데이터 저장
  }],
  
  // 계산된 메트릭 필드들
  likes_per_view: {
    type: Number,
    default: 0
  },
  comments_per_view: {
    type: Number,
    default: 0
  },
  views_per_exposure_hour: {
    type: Number,
    default: 0
  },
  
  // 메타데이터
  scraped_at: {
    type: Date,
    default: Date.now
  },
  last_updated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // createdAt, updatedAt 자동 생성
  collection: 'community_posts'
});

// 복합 인덱스 생성
CommunityPostSchema.index({ site: 1, category: 1 });
CommunityPostSchema.index({ created_at: -1, likes: -1 });
CommunityPostSchema.index({ views: -1, comments_count: -1 });

// 텍스트 검색을 위한 복합 인덱스
CommunityPostSchema.index({ 
  title: 'text', 
  content: 'text', 
  author: 'text' 
}, {
  weights: {
    title: 10,
    content: 5,
    author: 1
  },
  name: 'text_search_index'
});

// 가상 필드 정의
CommunityPostSchema.virtual('engagement_score').get(function() {
  // 참여도 점수 계산 (좋아요 + 댓글수) / 조회수
  if (this.views === 0) return 0;
  return (this.likes + this.comments_count) / this.views;
});

// 메서드 정의
CommunityPostSchema.methods.updateMetrics = function() {
  if (this.views > 0) {
    this.likes_per_view = this.likes / this.views;
    this.comments_per_view = this.comments_count / this.views;
  }
  
  // 노출 시간당 조회수 계산 (24시간 기준)
  const hoursFromCreation = (Date.now() - this.created_at.getTime()) / (1000 * 60 * 60);
  if (hoursFromCreation > 0) {
    this.views_per_exposure_hour = this.views / hoursFromCreation;
  }
  
  this.last_updated = new Date();
};

// 정적 메서드 정의
CommunityPostSchema.statics.findByCategory = function(category: string, limit: number = 10) {
  return this.find({ category })
    .sort({ created_at: -1 })
    .limit(limit)
    .lean();
};

CommunityPostSchema.statics.searchPosts = function(query: string, limit: number = 10) {
  return this.find(
    { $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .lean();
};

// 모델 생성 및 내보내기
const CommunityPost = mongoose.models.CommunityPost || 
  mongoose.model<ICommunityPost>('CommunityPost', CommunityPostSchema);

export default CommunityPost; 
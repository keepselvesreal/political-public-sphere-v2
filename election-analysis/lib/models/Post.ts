/*
목차:
- Post 모델 스키마 정의
- 필드: title, winner, gap, votes, keywords, content, authorId, createdAt, likes, views
- 인덱스: createdAt, likes, views
*/

import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  title: string;
  winner: string;
  gap: number;
  votes: {
    up: number;
    down: number;
  };
  keywords: string[];
  content: string;
  authorId: string;
  createdAt: Date;
  likes: number;
  views: number;
}

const PostSchema: Schema = new Schema({
  title: {
    type: String,
    required: [true, '제목은 필수입니다'],
    trim: true,
    maxlength: [200, '제목은 200자를 초과할 수 없습니다']
  },
  winner: {
    type: String,
    required: [true, '예측 당선자는 필수입니다'],
    trim: true,
    maxlength: [100, '당선자 이름은 100자를 초과할 수 없습니다']
  },
  gap: {
    type: Number,
    required: [true, '득표율 격차는 필수입니다'],
    min: [0, '득표율 격차는 0 이상이어야 합니다'],
    max: [100, '득표율 격차는 100을 초과할 수 없습니다']
  },
  votes: {
    up: {
      type: Number,
      default: 0,
      min: [0, '추천 수는 0 이상이어야 합니다']
    },
    down: {
      type: Number,
      default: 0,
      min: [0, '비추천 수는 0 이상이어야 합니다']
    }
  },
  keywords: [{
    type: String,
    trim: true,
    maxlength: [50, '키워드는 50자를 초과할 수 없습니다']
  }],
  content: {
    type: String,
    required: [true, '내용은 필수입니다'],
    minlength: [10, '내용은 최소 10자 이상이어야 합니다']
  },
  authorId: {
    type: String,
    required: [true, '작성자 ID는 필수입니다'],
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  likes: {
    type: Number,
    default: 0,
    min: [0, '좋아요 수는 0 이상이어야 합니다'],
    index: true
  },
  views: {
    type: Number,
    default: 0,
    min: [0, '조회수는 0 이상이어야 합니다'],
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 복합 인덱스 생성
PostSchema.index({ createdAt: -1, likes: -1 });
PostSchema.index({ views: -1, createdAt: -1 });

// 가상 필드: 총 투표 수
PostSchema.virtual('totalVotes').get(function(this: IPost) {
  return this.votes.up + this.votes.down;
});

// 가상 필드: 추천 비율
PostSchema.virtual('upvoteRatio').get(function(this: IPost) {
  const total = this.votes.up + this.votes.down;
  return total > 0 ? (this.votes.up / total) * 100 : 0;
});

export default mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema); 
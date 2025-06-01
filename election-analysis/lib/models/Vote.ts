/*
목차:
- Vote 모델 스키마 정의
- 필드: postId, userId, type
- 유니크 인덱스: postId + userId
*/

import mongoose, { Schema, Document } from 'mongoose';

export interface IVote extends Document {
  postId: string;
  userId: string;
  type: 'up' | 'down';
  createdAt: Date;
}

const VoteSchema: Schema = new Schema({
  postId: {
    type: String,
    required: [true, '게시글 ID는 필수입니다'],
    index: true
  },
  userId: {
    type: String,
    required: [true, '사용자 ID는 필수입니다'],
    index: true
  },
  type: {
    type: String,
    required: [true, '투표 타입은 필수입니다'],
    enum: {
      values: ['up', 'down'],
      message: '투표 타입은 up 또는 down이어야 합니다'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 유니크 복합 인덱스: 한 사용자는 하나의 게시글에 하나의 투표만 가능
VoteSchema.index({ postId: 1, userId: 1 }, { unique: true });

export default mongoose.models.Vote || mongoose.model<IVote>('Vote', VoteSchema); 
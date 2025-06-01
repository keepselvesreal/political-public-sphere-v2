/*
목차:
- Comment 모델 스키마 정의
- 필드: postId, content, authorId, createdAt
- 인덱스: postId, createdAt
*/

import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  postId: string;
  content: string;
  authorId: string;
  createdAt: Date;
}

const CommentSchema: Schema = new Schema({
  postId: {
    type: String,
    required: [true, '게시글 ID는 필수입니다'],
    index: true
  },
  content: {
    type: String,
    required: [true, '댓글 내용은 필수입니다'],
    trim: true,
    minlength: [1, '댓글은 최소 1자 이상이어야 합니다'],
    maxlength: [1000, '댓글은 1000자를 초과할 수 없습니다']
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
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 복합 인덱스 생성
CommentSchema.index({ postId: 1, createdAt: -1 });

export default mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema); 
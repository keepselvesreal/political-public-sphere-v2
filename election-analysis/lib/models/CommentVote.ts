/*
목차:
- CommentVote 모델 스키마 정의
- 필드: commentId, userId, voteType (like/dislike), createdAt
- 인덱스: commentId, userId (복합 유니크 인덱스)
- 중복 투표 방지 로직
*/

import mongoose, { Schema, Document } from 'mongoose';

export interface ICommentVote extends Document {
  commentId: string;
  userId: string;
  voteType: 'like' | 'dislike';
  createdAt: Date;
}

const CommentVoteSchema: Schema = new Schema({
  commentId: {
    type: String,
    required: [true, '댓글 ID는 필수입니다'],
    index: true
  },
  userId: {
    type: String,
    required: [true, '사용자 ID는 필수입니다'],
    index: true
  },
  voteType: {
    type: String,
    required: [true, '투표 타입은 필수입니다'],
    enum: {
      values: ['like', 'dislike'],
      message: '투표 타입은 like 또는 dislike만 가능합니다'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// 복합 유니크 인덱스: 한 사용자는 하나의 댓글에 하나의 투표만 가능
CommentVoteSchema.index({ commentId: 1, userId: 1 }, { unique: true });

// 스태틱 메서드: 댓글의 좋아요/비추천 개수 조회
CommentVoteSchema.statics.getVoteCounts = async function(commentId: string) {
  const [likeCount, dislikeCount] = await Promise.all([
    this.countDocuments({ commentId, voteType: 'like' }),
    this.countDocuments({ commentId, voteType: 'dislike' })
  ]);
  
  return { likes: likeCount, dislikes: dislikeCount };
};

// 스태틱 메서드: 사용자의 투표 상태 조회
CommentVoteSchema.statics.getUserVote = async function(commentId: string, userId: string) {
  const vote = await this.findOne({ commentId, userId });
  return vote ? vote.voteType : null;
};

// 스태틱 메서드: 투표 토글 (좋아요/비추천 전환 또는 취소)
CommentVoteSchema.statics.toggleVote = async function(commentId: string, userId: string, voteType: 'like' | 'dislike') {
  const existingVote = await this.findOne({ commentId, userId });
  
  if (existingVote) {
    if (existingVote.voteType === voteType) {
      // 같은 타입의 투표를 다시 누르면 취소
      await this.deleteOne({ commentId, userId });
      return { action: 'removed', voteType: null };
    } else {
      // 다른 타입의 투표로 변경
      existingVote.voteType = voteType;
      await existingVote.save();
      return { action: 'changed', voteType };
    }
  } else {
    // 새로운 투표 생성
    await this.create({ commentId, userId, voteType });
    return { action: 'added', voteType };
  }
};

export default mongoose.models.CommentVote || mongoose.model<ICommentVote>('CommentVote', CommentVoteSchema); 
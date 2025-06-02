/*
목차:
- Comment 모델 스키마 정의 (중첩 댓글 지원)
- 필드: postId, content, authorId, parentId, createdAt, depth
- 인덱스: postId, createdAt, parentId
- 가상 필드: replies (자식 댓글들)
- 스태틱 메서드: 댓글 트리 구조 생성
*/

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IComment extends Document {
  postId: string;
  content: string;
  authorId: string;
  parentId?: string; // 부모 댓글 ID (null이면 최상위 댓글)
  depth: number; // 댓글 깊이 (0: 최상위, 1: 대댓글, 2: 대대댓글...)
  createdAt: Date;
  replies?: IComment[]; // 가상 필드
}

// 스태틱 메서드들의 타입 정의
interface ICommentModel extends Model<IComment> {
  getCommentTree(postId: string, page?: number, limit?: number): Promise<any[]>;
  getRepliesRecursively(parentId: string): Promise<any[]>;
  createComment(commentData: {
    postId: string;
    content: string;
    authorId: string;
    parentId?: string;
  }): Promise<IComment>;
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
  parentId: {
    type: String,
    default: null,
    index: true
  },
  depth: {
    type: Number,
    default: 0,
    min: [0, '댓글 깊이는 0 이상이어야 합니다'],
    max: [5, '댓글 깊이는 최대 5까지 허용됩니다'] // 무한 중첩 방지
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
CommentSchema.index({ postId: 1, parentId: 1, createdAt: 1 });

// 가상 필드: 자식 댓글들
CommentSchema.virtual('replies', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentId',
  options: { sort: { createdAt: 1 } } // 자식 댓글은 시간순 정렬
});

// 스태틱 메서드: 특정 게시글의 댓글 트리 구조 조회
CommentSchema.statics.getCommentTree = async function(postId: string, page: number = 1, limit: number = 20) {
  // 최상위 댓글들만 조회 (parentId가 null인 것들)
  const rootComments = await this.find({ 
    postId, 
    parentId: null 
  })
  .sort({ createdAt: -1 })
  .skip((page - 1) * limit)
  .limit(limit)
  .lean();

  // 각 최상위 댓글에 대해 모든 자식 댓글들을 재귀적으로 조회
  const commentsWithReplies = await Promise.all(
    rootComments.map(async (comment: any) => {
      // @ts-ignore
      const replies = await this.getRepliesRecursively(comment._id.toString());
      return { ...comment, replies };
    })
  );

  return commentsWithReplies;
};

// 스태틱 메서드: 재귀적으로 자식 댓글들 조회
CommentSchema.statics.getRepliesRecursively = async function(parentId: string): Promise<any[]> {
  const replies = await this.find({ parentId })
    .sort({ createdAt: 1 })
    .lean();

  // 각 자식 댓글에 대해서도 재귀적으로 자식들을 조회
  const repliesWithChildren = await Promise.all(
    replies.map(async (reply: any) => {
      // @ts-ignore
      const childReplies = await this.getRepliesRecursively(reply._id.toString());
      return { ...reply, replies: childReplies };
    })
  );

  return repliesWithChildren;
};

// 스태틱 메서드: 댓글 생성 시 depth 자동 계산
CommentSchema.statics.createComment = async function(commentData: {
  postId: string;
  content: string;
  authorId: string;
  parentId?: string;
}) {
  let depth = 0;
  
  // 부모 댓글이 있는 경우 depth 계산
  if (commentData.parentId) {
    const parentComment = await this.findById(commentData.parentId);
    if (!parentComment) {
      throw new Error('부모 댓글을 찾을 수 없습니다');
    }
    if (parentComment.postId !== commentData.postId) {
      throw new Error('다른 게시글의 댓글에는 답글을 달 수 없습니다');
    }
    depth = parentComment.depth + 1;
    
    // 최대 깊이 제한
    if (depth > 5) {
      throw new Error('댓글 깊이가 최대 허용 깊이를 초과했습니다');
    }
  }

  const newComment = new this({
    ...commentData,
    depth
  });

  return await newComment.save();
};

export default (mongoose.models.Comment as ICommentModel) || mongoose.model<IComment, ICommentModel>('Comment', CommentSchema); 
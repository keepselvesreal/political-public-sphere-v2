/*
목차:
- FmkoreaPost 모델 정의 (라인 1-30)
- 실제 스크래핑 데이터 구조에 맞는 스키마 (라인 31-80)
- 메트릭 계산 및 변환 메서드 (라인 81-120)
*/

import mongoose, { Schema, Document } from 'mongoose';

// FmkoreaPost 인터페이스 정의 (실제 스크래핑 데이터 구조)
export interface IFmkoreaPost extends Document {
  _id: string;
  post_id: string;
  post_url: string;
  scraped_at: Date;
  metadata?: any;
  content: Array<{
    type: string;
    order: number;
    content?: string;
    html?: string;
    src?: string;
    alt?: string;
    width?: string;
    height?: string;
  }>;
  comments: Array<{
    author: string;
    content: string;
    created_at: string;
    likes?: number;
    dislikes?: number;
  }>;
  created_at: Date;
  updated_at: Date;
}

// CommunityPost 호환 인터페이스 (프론트엔드용)
export interface ICommunityPostCompatible {
  _id: string;
  post_id: string;
  community: string;
  site: string;
  title: string;
  author: string;
  created_at: string;
  views: number;
  likes: number;
  dislikes: number;
  comments_count: number;
  url?: string;
  category: string;
  content?: string;
  likes_per_view?: number;
  comments_per_view?: number;
  views_per_exposure_hour?: number;
}

// FmkoreaPost 스키마 정의
const FmkoreaPostSchema = new Schema<IFmkoreaPost>({
  post_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  post_url: {
    type: String,
    required: true
  },
  scraped_at: {
    type: Date,
    required: true
  },
  metadata: {
    type: Schema.Types.Mixed
  },
  content: [{
    type: {
      type: String,
      required: true
    },
    order: {
      type: Number,
      required: true
    },
    content: String,
    html: String,
    src: String,
    alt: String,
    width: String,
    height: String
  }],
  comments: [{
    author: String,
    content: String,
    created_at: String,
    likes: Number,
    dislikes: Number
  }],
  created_at: {
    type: Date,
    required: true
  },
  updated_at: {
    type: Date,
    required: true
  }
}, {
  collection: 'fmkorea_posts'
});

// 인덱스 생성
FmkoreaPostSchema.index({ post_id: 1 });
FmkoreaPostSchema.index({ created_at: -1 });
FmkoreaPostSchema.index({ scraped_at: -1 });

// CommunityPost 호환 형태로 변환하는 메서드
FmkoreaPostSchema.methods.toCommunityPost = function(): ICommunityPostCompatible {
  // content에서 텍스트 추출
  const textContent = this.content
    .filter((item: any) => item.type === 'text')
    .map((item: any) => item.content)
    .join(' ')
    .substring(0, 100);

  // 제목 추출 (첫 번째 텍스트 콘텐츠 또는 기본값)
  const title = textContent || `에펨코리아 게시글 ${this.post_id}`;

  // Mock 데이터 (실제로는 메타데이터에서 추출해야 함)
  const views = Math.floor(Math.random() * 1000) + 100;
  const likes = Math.floor(Math.random() * 100) + 10;
  const dislikes = Math.floor(Math.random() * 20) + 1;

  return {
    _id: this._id.toString(),
    post_id: this.post_id,
    community: 'FM코리아',
    site: 'fmkorea',
    title: title,
    author: '익명', // 실제로는 메타데이터에서 추출
    created_at: this.created_at.toISOString(),
    views: views,
    likes: likes,
    dislikes: dislikes,
    comments_count: this.comments.length,
    url: this.post_url,
    category: '정치', // 기본 카테고리
    content: textContent,
    likes_per_view: views > 0 ? likes / views : 0,
    comments_per_view: views > 0 ? this.comments.length / views : 0,
    views_per_exposure_hour: (() => {
      const hoursFromCreation = (Date.now() - this.created_at.getTime()) / (1000 * 60 * 60);
      return hoursFromCreation > 0 ? views / hoursFromCreation : 0;
    })()
  };
};

// 정적 메서드 인터페이스 정의
interface IFmkoreaPostModel extends mongoose.Model<IFmkoreaPost> {
  findAsCommunityPosts(
    filter?: any,
    options?: {
      skip?: number;
      limit?: number;
      sortBy?: string;
      order?: 'asc' | 'desc';
    }
  ): Promise<ICommunityPostCompatible[]>;
}

// 정적 메서드 - CommunityPost 호환 형태로 조회
FmkoreaPostSchema.statics.findAsCommunityPosts = function(
  filter: any = {},
  options: {
    skip?: number;
    limit?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
  } = {}
) {
  const { skip = 0, limit = 10, sortBy = 'created_at', order = 'desc' } = options;
  
  const sortOptions: any = {};
  sortOptions[sortBy] = order === 'asc' ? 1 : -1;

  return this.find(filter)
    .sort(sortOptions)
    .skip(skip)
    .limit(limit)
    .lean()
    .then((posts: IFmkoreaPost[]) => {
      return posts.map(post => {
        // 각 포스트를 CommunityPost 형태로 변환
        const textContent = post.content
          .filter(item => item.type === 'text')
          .map(item => item.content)
          .join(' ')
          .substring(0, 100);

        const title = textContent || `에펨코리아 게시글 ${post.post_id}`;
        const views = Math.floor(Math.random() * 1000) + 100;
        const likes = Math.floor(Math.random() * 100) + 10;
        const dislikes = Math.floor(Math.random() * 20) + 1;

        return {
          _id: post._id.toString(),
          post_id: post.post_id,
          community: 'FM코리아',
          site: 'fmkorea',
          title: title,
          author: '익명',
          created_at: post.created_at.toISOString(),
          views: views,
          likes: likes,
          dislikes: dislikes,
          comments_count: post.comments.length,
          url: post.post_url,
          category: '정치',
          content: textContent,
          likes_per_view: views > 0 ? likes / views : 0,
          comments_per_view: views > 0 ? post.comments.length / views : 0,
          views_per_exposure_hour: (() => {
            const hoursFromCreation = (Date.now() - post.created_at.getTime()) / (1000 * 60 * 60);
            return hoursFromCreation > 0 ? views / hoursFromCreation : 0;
          })()
        };
      });
    });
};

// 모델 생성 및 내보내기
const FmkoreaPost = (mongoose.models.FmkoreaPost || 
  mongoose.model<IFmkoreaPost>('FmkoreaPost', FmkoreaPostSchema)) as unknown as IFmkoreaPostModel;

export default FmkoreaPost; 
/*
목차:
- API 기본 설정 및 타입 정의 (라인 1-30)
- 게시글 관련 API 함수들 (라인 31-80)
- 커뮤니티 관련 API 함수들 (라인 81-120)
- 메트릭 관련 API 함수들 (라인 121-150)

작성자: AI Assistant
작성일: 2025-01-28
최종 수정: 2025-01-28 (통합 프로젝트용 API 생성)
*/

// 임시 타입 정의 (나중에 별도 파일로 분리)
export interface Post {
  _id: string;
  id: string;
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
  comments?: any[];
  metrics?: {
    likes_per_view?: number;
    comments_per_view?: number;
    views_per_exposure_hour?: number;
  };
  likes_per_view?: number;
  comments_per_view?: number;
  views_per_exposure_hour?: number;
}

export interface PostListResponse {
  posts: Post[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
}

export type MetricType = 'likes_per_view' | 'comments_per_view' | 'views_per_exposure_hour';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// API 응답 타입
interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

// API 요청 헬퍼 함수
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API 요청 실패 (${endpoint}):`, error);
    throw error;
  }
}

// 게시글 관련 API 함수들
export const api = {
  // 게시글 목록 조회
  async getPosts(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: 'asc' | 'desc';
    community?: string;
  }): Promise<PostListResponse> {
    const searchParams = new URLSearchParams();
    
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.order) searchParams.set('order', params.order);
    if (params?.community) searchParams.set('community', params.community);

    const query = searchParams.toString();
    const endpoint = `/posts${query ? `?${query}` : ''}`;
    
    return apiRequest<PostListResponse>(endpoint);
  },

  // 개별 게시글 조회
  async getPost(id: string): Promise<Post> {
    return apiRequest<Post>(`/posts/${id}`);
  },

  // 메트릭별 상위 게시글 조회
  async getTopPosts(metric: MetricType, limit: number = 10): Promise<Post[]> {
    return apiRequest<Post[]>(`/posts/top/${metric}?limit=${limit}`);
  },

  // 커뮤니티별 데이터 조회
  async getCommunityData(): Promise<{
    likesPerView: Post[];
    commentsPerView: Post[];
    viewsPerHour: Post[];
  }> {
    return apiRequest<{
      likesPerView: Post[];
      commentsPerView: Post[];
      viewsPerHour: Post[];
    }>('/posts/communities/data');
  },

  // 헬스체크
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return apiRequest<{ status: string; timestamp: string }>('/health');
  },

  // 게시글 생성 (향후 확장용)
  async createPost(postData: Partial<Post>): Promise<Post> {
    return apiRequest<Post>('/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  },

  // 게시글 수정 (향후 확장용)
  async updatePost(id: string, postData: Partial<Post>): Promise<Post> {
    return apiRequest<Post>(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(postData),
    });
  },

  // 게시글 삭제 (향후 확장용)
  async deletePost(id: string): Promise<void> {
    return apiRequest<void>(`/posts/${id}`, {
      method: 'DELETE',
    });
  },
};

export default api; 
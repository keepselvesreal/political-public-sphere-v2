/*
목차:
- 메인 페이지 (게시글 목록)
- SWR infinite를 활용한 무한 스크롤
- 반응형 그리드 레이아웃 (데스크톱 3x3, 모바일 1열)
- 정렬 필터 및 접근성 지원
*/

"use client";

import React, { useState, useCallback } from 'react';
import useSWRInfinite from 'swr/infinite';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import SortFilter, { SortOption, SortOrder } from '@/components/SortFilter';
import PostCard, { PostCardProps } from '@/components/PostCard';
import InfiniteScrollWrapper from '@/components/InfiniteScrollWrapper';
import { Button } from '@/components/ui/button';
import { ChevronRight, Plus } from 'lucide-react';
import Link from 'next/link';

// i18n 초기화
import '@/lib/i18n';

interface PostsResponse {
  posts: PostCardProps[];
  pagination: {
    skip: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// API 응답 데이터 타입 (MongoDB 스타일)
interface ApiPost {
  _id: string;
  title: string;
  winner: string;
  gap: number;
  keywords?: string[];
  votes?: { up: number; down: number };
  likes?: number;
  views?: number;
  createdAt?: string;
  authorId?: string;
  content?: string;
}

// API 데이터를 PostCard props로 변환하는 함수
const transformApiPostToCardProps = (apiPost: ApiPost): PostCardProps => {
  return {
    id: apiPost._id,
    predictedWinner: apiPost.winner,
    marginPercentage: apiPost.gap,
    mainQuote: apiPost.title, // title을 mainQuote로 사용
    candidates: undefined, // API에서 제공하지 않음
    tags: apiPost.keywords,
    analyst: undefined, // API에서 제공하지 않음
  };
};

const POSTS_PER_PAGE = 9; // 데스크톱 3x3 그리드

export default function Home() {
  const { t } = useTranslation('common');
  const [sortBy, setSortBy] = useState<SortOption>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // SWR fetcher 함수
  const fetcher = async (url: string): Promise<PostsResponse> => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('게시글을 불러오는데 실패했습니다');
    }
    const apiResponse = await response.json();
    
    // API 응답 데이터를 PostCard props 형식으로 변환
    const transformedPosts = apiResponse.posts.map((apiPost: ApiPost) => 
      transformApiPostToCardProps(apiPost)
    );
    
    return {
      posts: transformedPosts,
      pagination: apiResponse.pagination
    };
  };

  // SWR infinite key 생성 함수
  const getKey = (pageIndex: number, previousPageData: PostsResponse | null) => {
    // 이전 페이지 데이터가 있고 더 이상 데이터가 없으면 null 반환
    if (previousPageData && !previousPageData.pagination.hasMore) return null;
    
    const skip = pageIndex * POSTS_PER_PAGE;
    return `/api/posts?skip=${skip}&limit=${POSTS_PER_PAGE}&sortBy=${sortBy}&order=${sortOrder}`;
  };

  // SWR infinite 훅 사용
  const {
    data,
    error,
    size,
    setSize,
    isValidating,
    mutate
  } = useSWRInfinite<PostsResponse>(getKey, fetcher, {
    revalidateFirstPage: true,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
    refreshInterval: 30000,
  });

  // 데이터 평탄화
  const posts = data ? data.flatMap(page => page.posts) : [];
  
  const hasMore = data ? data[data.length - 1]?.pagination.hasMore ?? true : true;
  const isLoading = !data && !error;
  const isLoadingMore = isValidating && data && data.length > 0;

  // 더 많은 데이터 로드
  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      setSize(size + 1);
    }
  }, [size, setSize, isLoadingMore, hasMore]);

  // 정렬 변경 핸들러
  const handleSortChange = useCallback((newSortBy: SortOption, newSortOrder: SortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    // 데이터 초기화 및 재로드
    mutate();
    setSize(1);
  }, [mutate, setSize]);

  // 에러 메시지
  const errorMessage = error?.message || null;

  return (
    <div className="container mx-auto px-4 py-8 md:py-16">
      {/* 헤더 섹션 */}
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">
          Election Analysis Hub
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          전문가들의 선거 예측과 분석을 비교해보세요. 카드를 클릭하면 상세한 분석을 확인할 수 있습니다.
        </p>
        
        <Link href="/write">
          <Button 
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2 px-6 rounded-full transition-all duration-300 shadow-md hover:shadow-lg"
            aria-label={t('writePost')}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            <span>{t('writePost')}</span>
            <ChevronRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
      </div>
      
      {/* 정렬 필터 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold">
            {t('postList')}
          </h2>
          {data && data[0] && (
            <span className="text-sm text-muted-foreground">
              총 {data[0].pagination.total}개의 게시글
            </span>
          )}
        </div>
        <SortFilter 
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
        />
      </div>
      
      {/* 게시글 목록 */}
      <InfiniteScrollWrapper
        hasMore={hasMore}
        loadMore={loadMore}
        loading={isLoading || isLoadingMore}
        error={errorMessage}
        dataLength={posts.length}
        className="w-full"
      >
        <div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          role="feed"
          aria-label={t('postList')}
        >
          {posts.map((post, index) => (
            <div key={`${post.id}-${index}`} className="w-full">
              <PostCard {...post} />
            </div>
          ))}
        </div>
        
        {/* 빈 상태 */}
        {!isLoading && posts.length === 0 && !error && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">아직 게시글이 없습니다</h3>
            <p className="text-muted-foreground mb-6">
              첫 번째 선거 분석을 작성해보세요!
            </p>
            <Link href="/write">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t('writePost')}
              </Button>
            </Link>
          </div>
        )}
      </InfiniteScrollWrapper>
    </div>
  );
}
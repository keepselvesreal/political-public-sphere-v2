/*
목차:
- 천하제일 분석대회 메인 페이지 (기존 메인 페이지 내용)
- SWR infinite를 활용한 무한 스크롤
- 반응형 그리드 레이아웃 (데스크톱 3x3, 모바일 1열)
- 정렬 필터 및 접근성 지원
- "나도 분석해보기" 버튼 (글쓰기 화면 연결)
*/

"use client";

import React, { useState, useCallback, useMemo } from 'react';
import useSWRInfinite from 'swr/infinite';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import SortFilter, { SortOption, SortOrder } from '@/components/analysis-contest/SortFilter';
import PostCard, { PostCardProps } from '@/components/analysis-contest/PostCard';
import InfiniteScrollWrapper from '@/components/analysis-contest/InfiniteScrollWrapper';
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

// API 데이터를 PostCard props로 변환하는 함수 (메모이제이션)
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

const POSTS_PER_PAGE = 10; // Task Breakdown 요구사항에 따라 10개로 설정

export default function Home() {
  const { t } = useTranslation('common');
  const [sortBy, setSortBy] = useState<SortOption>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // SWR fetcher 함수 (성능 최적화)
  const fetcher = useCallback(async (url: string): Promise<PostsResponse> => {
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
  }, []);

  // SWR infinite key 생성 함수 (메모이제이션)
  const getKey = useCallback((pageIndex: number, previousPageData: PostsResponse | null) => {
    // 이전 페이지 데이터가 있고 더 이상 데이터가 없으면 null 반환
    if (previousPageData && !previousPageData.pagination.hasMore) return null;
    
    const skip = pageIndex * POSTS_PER_PAGE;
    return `/api/analysis-contest?skip=${skip}&limit=${POSTS_PER_PAGE}&sortBy=${sortBy}&order=${sortOrder}`;
  }, [sortBy, sortOrder]);

  // SWR infinite 훅 사용 (성능 최적화 설정)
  const {
    data,
    error,
    size,
    setSize,
    isValidating,
    mutate
  } = useSWRInfinite<PostsResponse>(getKey, fetcher, {
    revalidateFirstPage: false, // 첫 페이지 재검증 비활성화로 성능 향상
    revalidateOnFocus: false, // 포커스 시 재검증 비활성화
    revalidateOnReconnect: true, // 재연결 시에만 재검증
    dedupingInterval: 10000, // 중복 요청 방지 간격 증가 (10초)
    refreshInterval: 0, // 자동 새로고침 비활성화
    errorRetryCount: 3, // 오류 재시도 횟수 제한
    errorRetryInterval: 5000, // 오류 재시도 간격
    keepPreviousData: true, // 이전 데이터 유지로 UX 향상
  });

  // 데이터 평탄화 (메모이제이션)
  const posts = useMemo(() => {
    return data ? data.flatMap(page => page.posts) : [];
  }, [data]);
  
  const hasMore = useMemo(() => {
    return data ? data[data.length - 1]?.pagination.hasMore ?? true : true;
  }, [data]);

  const isLoading = !data && !error;
  const isLoadingMore = isValidating && data && data.length > 0;

  // 정렬 변경 핸들러 (메모이제이션)
  const handleSortChange = useCallback((newSortBy: SortOption, newSortOrder: SortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    // 정렬 변경 시 캐시 초기화
    mutate();
  }, [mutate]);

  // 더 많은 데이터 로드 (메모이제이션)
  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      setSize(size + 1);
    }
  }, [isLoadingMore, hasMore, size, setSize]);

  // 오류 메시지 처리
  const errorMessage = error ? '게시글을 불러오는데 실패했습니다. 새로고침해주세요.' : null;

  // 로딩 상태 처리
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">게시글을 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 나도 분석해보기 버튼 */}
      <div className="flex justify-center mb-8">
        <Link href="/write">
          <Button size="lg" className="flex items-center space-x-2 px-8 py-3">
            <Plus className="h-5 w-5" />
            <span className="text-lg font-medium">{t('analyzeMyself')}</span>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </Link>
      </div>

      {/* 정렬 필터와 통계 */}
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
                {t('analyzeMyself')}
              </Button>
            </Link>
          </div>
        )}
      </InfiniteScrollWrapper>
    </div>
  );
}
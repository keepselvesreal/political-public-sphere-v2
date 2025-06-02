/*
목차:
- 정치 마실?! 커뮤니티 메인 페이지
- 일상적인 정치 이야기 공간
- 커뮤니티 게시글 목록
- 편안한 토론 환경
*/

"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, AlertCircle, Search, Eye, ThumbsUp, MessageSquare, Calendar, User, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import useSWRInfinite from 'swr/infinite';

// 커뮤니티 게시글 타입 정의
interface CommunityPost {
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
  likes_per_view?: number;
  comments_per_view?: number;
}

// API 응답 타입
interface ApiResponse {
  success: boolean;
  data: CommunityPost[];
  pagination: {
    total: number;
    skip: number;
    limit: number;
    hasMore: boolean;
    currentPage: number;
    totalPages: number;
  };
  filters: {
    sortBy: string;
    order: string;
    category?: string;
    community?: string;
    site: string;
    search?: string;
  };
}

// 데이터 fetcher 함수
const fetcher = async (url: string): Promise<ApiResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export default function CommunityPosts() {
  // 상태 관리
  const [sortBy, setSortBy] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // API 키 생성 함수
  const getKey = (pageIndex: number, previousPageData: ApiResponse | null) => {
    // 마지막 페이지에 도달했으면 null 반환
    if (previousPageData && !previousPageData.pagination.hasMore) return null;
    
    const skip = pageIndex * 10;
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: '10',
      sortBy,
      order,
      site: 'fmkorea'
    });

    if (category !== 'all') params.append('category', category);
    if (search) params.append('search', search);

    return `/api/community-posts?${params.toString()}`;
  };

  // SWR Infinite 훅 사용
  const {
    data,
    error,
    size,
    setSize,
    isValidating,
    mutate
  } = useSWRInfinite<ApiResponse>(getKey, fetcher, {
    revalidateFirstPage: false,
    revalidateOnFocus: false
  });

  // 데이터 평탄화
  const posts = data ? data.flatMap(page => page.data) : [];
  const isLoading = !data && !error;
  const isLoadingMore = isValidating && data && data[data.length - 1];
  const isEmpty = data?.[0]?.data.length === 0;
  const isReachingEnd = isEmpty || (data && data[data.length - 1]?.pagination.hasMore === false);

  // 검색 실행
  const handleSearch = () => {
    setSearch(searchInput);
    mutate();
  };

  // 정렬 변경
  const handleSortChange = (newSortBy: string) => {
    setSortBy(newSortBy);
    mutate();
  };

  // 순서 변경
  const handleOrderChange = (newOrder: string) => {
    setOrder(newOrder);
    mutate();
  };

  // 카테고리 변경
  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    mutate();
  };

  // 더 많은 데이터 로드
  const loadMore = () => {
    setSize(size + 1);
  };

  // 커뮤니티별 색상 설정
  const getCommunityColor = (site: string) => {
    switch (site) {
      case 'fmkorea':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'ruliweb':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'clien':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'dcinside':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      {/* 헤더 섹션 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          정치 마실?!
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          일상적인 정치 이야기를 편안하게 나누는 커뮤니티 공간입니다.
        </p>
      </div>

      {/* 검색 및 필터 섹션 */}
      <div className="mb-8 space-y-4">
        {/* 검색바 */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="게시글 제목, 내용, 작성자 검색..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch}>검색</Button>
        </div>

        {/* 필터 및 정렬 */}
        <div className="flex flex-wrap gap-4">
          <Select value={sortBy} onValueChange={handleSortChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="정렬 기준" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">최신순</SelectItem>
              <SelectItem value="views">조회수순</SelectItem>
              <SelectItem value="likes">추천순</SelectItem>
              <SelectItem value="comments_count">댓글순</SelectItem>
            </SelectContent>
          </Select>

          <Select value={order} onValueChange={handleOrderChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="순서" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">내림차순</SelectItem>
              <SelectItem value="asc">오름차순</SelectItem>
            </SelectContent>
          </Select>

          <Select value={category} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="카테고리" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="정치">정치</SelectItem>
              <SelectItem value="사회">사회</SelectItem>
              <SelectItem value="경제">경제</SelectItem>
              <SelectItem value="일반">일반</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">커뮤니티 게시글을 불러오는 중...</p>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="text-center bg-red-50 dark:bg-red-950/20 rounded-lg p-8 mb-8">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2">
            데이터 로딩 실패
          </h2>
          <p className="text-red-600 dark:text-red-300 mb-4">
            {error.message}
          </p>
          <Button onClick={() => mutate()} variant="outline">
            다시 시도
          </Button>
        </div>
      )}

      {/* 빈 상태 */}
      {isEmpty && !isLoading && (
        <div className="text-center bg-gray-50 dark:bg-gray-900 rounded-lg p-12">
          <h2 className="text-2xl font-bold mb-4">📝 게시글이 없습니다</h2>
          <p className="text-gray-600 dark:text-gray-300">
            검색 조건에 맞는 게시글이 없습니다.
          </p>
        </div>
      )}

      {/* 게시글 목록 */}
      {posts.length > 0 && (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post._id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Badge className={getCommunityColor(post.site)}>
                      {post.community || post.site}
                    </Badge>
                    <Badge variant="outline">
                      {post.category}
                    </Badge>
                  </div>
                  {post.url && (
                    <a 
                      href={post.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
                
                <CardTitle className="text-lg">
                  <Link 
                    href={`/community-posts/posts/${post._id}`}
                    className="hover:text-blue-600 transition-colors"
                  >
                    {post.title}
                  </Link>
                </CardTitle>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center">
                    <User className="h-4 w-4 mr-1" />
                    {post.author}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(post.created_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center">
                      <Eye className="h-4 w-4 mr-1" />
                      {post.views.toLocaleString()}
                    </div>
                    <div className="flex items-center">
                      <ThumbsUp className="h-4 w-4 mr-1 text-green-600" />
                      {post.likes.toLocaleString()}
                    </div>
                    <div className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-1 text-blue-600" />
                      {post.comments_count.toLocaleString()}
                    </div>
                  </div>
                  
                  {/* 메트릭 표시 */}
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    {post.likes_per_view && (
                      <span>추천률: {(post.likes_per_view * 100).toFixed(1)}%</span>
                    )}
                    {post.comments_per_view && (
                      <span>댓글률: {(post.comments_per_view * 100).toFixed(1)}%</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* 더 보기 버튼 */}
          <div className="text-center py-8">
            {isLoadingMore ? (
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            ) : isReachingEnd ? (
              <p className="text-gray-500">모든 게시글을 불러왔습니다.</p>
            ) : (
              <Button onClick={loadMore} variant="outline">
                더 보기
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 
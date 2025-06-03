/*
목차:
- 천하제일 분석대회 준비 게시판 컴포넌트
- 게시글 목록 표시 (25개/페이지)
- 페이지네이션 구현
- 게시글 작성 버튼
- 현대적이고 단순한 디자인
*/

"use client";

import React, { useState, useCallback, useMemo } from 'react';
import useSWRInfinite from 'swr/infinite';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, MessageSquare, Eye, ThumbsUp, Calendar, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// 게시글 타입 정의
interface PreparationPost {
  _id: string;
  title: string;
  content: string;
  author: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  views: number;
  likes: number;
  comments: number;
  isNotice: boolean;
  tags?: string[];
}

interface PostsResponse {
  posts: PreparationPost[];
  pagination: {
    skip: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

const POSTS_PER_PAGE = 25; // 요구사항에 따라 25개로 설정

export default function PreparationBoard() {
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  // SWR fetcher 함수
  const fetcher = useCallback(async (url: string): Promise<PostsResponse> => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('게시글을 불러오는데 실패했습니다');
    }
    return response.json();
  }, []);

  // SWR infinite key 생성 함수
  const getKey = useCallback((pageIndex: number, previousPageData: PostsResponse | null) => {
    if (previousPageData && !previousPageData.pagination.hasMore) return null;
    
    const skip = pageIndex * POSTS_PER_PAGE;
    return `/api/analysis-contest/preparation?skip=${skip}&limit=${POSTS_PER_PAGE}`;
  }, []);

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
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
    refreshInterval: 0,
    errorRetryCount: 3,
    errorRetryInterval: 2000,
    keepPreviousData: true,
  });

  // 데이터 평탄화
  const posts = useMemo(() => {
    return data ? data.flatMap(page => page.posts) : [];
  }, [data]);

  const totalPosts = useMemo(() => {
    return data && data[0] ? data[0].pagination.total : 0;
  }, [data]);

  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);
  const isLoading = !data && !error;

  // 날짜 포맷팅 함수
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffTime = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return date.toLocaleTimeString('ko-KR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } else if (diffDays < 7) {
        return `${diffDays}일 전`;
      } else {
        return date.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    } catch (error) {
      return dateStr;
    }
  };

  // 숫자 포맷팅 함수
  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setSize(page);
  };

  // 로딩 상태
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

  // 에러 상태
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-semibold mb-2">게시글을 불러올 수 없습니다</h3>
          <p className="text-muted-foreground mb-6">
            네트워크 연결을 확인하고 새로고침해주세요.
          </p>
          <Button onClick={() => mutate()}>
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            천하제일 분석대회 - 준비
          </h1>
          <p className="text-sm text-muted-foreground">
            분석 기법과 노하우를 공유하고 함께 성장하는 공간입니다.
          </p>
        </div>
        <Link href="/analysis-contest/preparation/write">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            글쓰기
          </Button>
        </Link>
      </div>

      {/* 통계 정보 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Badge variant="secondary" className="text-sm">
            총 {totalPosts.toLocaleString()}개의 게시글
          </Badge>
          <Badge variant="outline" className="text-sm">
            {currentPage} / {totalPages} 페이지
          </Badge>
        </div>
      </div>

      {/* 게시글 목록 */}
      <div className="space-y-2">
        {posts.map((post) => (
          <Card 
            key={post._id} 
            className="hover:shadow-md transition-all duration-200 cursor-pointer hover:bg-muted/30"
            onClick={() => router.push(`/analysis-contest/preparation/posts/${post._id}`)}
          >
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  {/* 제목과 공지 배지 */}
                  <div className="flex items-center gap-2 mb-1">
                    {post.isNotice && (
                      <Badge variant="destructive" className="text-xs px-1.5 py-0.5 h-5">
                        공지
                      </Badge>
                    )}
                    <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">
                      {post.title}
                    </h3>
                  </div>

                  {/* 메타 정보와 태그를 한 줄에 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{post.author.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(post.createdAt)}</span>
                      </div>
                    </div>

                    {/* 태그 (최대 2개만 표시) */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex gap-1">
                        {post.tags.slice(0, 2).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs px-1.5 py-0 h-4">
                            #{tag}
                          </Badge>
                        ))}
                        {post.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 h-4">
                            +{post.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 통계 정보 */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground ml-3">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    <span>{formatNumber(post.views)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ThumbsUp className="h-3 w-3" />
                    <span>{formatNumber(post.likes)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    <span>{formatNumber(post.comments)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 빈 상태 */}
      {posts.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold mb-2">아직 게시글이 없습니다</h3>
          <p className="text-muted-foreground mb-6">
            첫 번째 정보 공유 글을 작성해보세요!
          </p>
          <Link href="/analysis-contest/preparation/write">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              글쓰기
            </Button>
          </Link>
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="h-8 px-3"
          >
            이전
          </Button>
          
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  className="h-8 w-8 p-0"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="h-8 px-3"
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
} 
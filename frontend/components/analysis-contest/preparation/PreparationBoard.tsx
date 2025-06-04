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
import { Plus, MessageSquare, Eye, ThumbsUp, Calendar, User, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// 게시글 타입 정의
interface PreparationPost {
  _id: string;
  title: string;
  content: string;
  source: '언론사' | '유튜브' | '카더라' | '개인 생각';
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
    // Mock 데이터 생성 (20개)
    const mockPosts: PreparationPost[] = [
      {
        _id: '1',
        title: '최신 여론조사 분석 방법론',
        content: '여론조사 분석의 핵심 포인트를 정리했습니다.',
        source: '언론사',
        author: { name: '분석전문가', email: 'analyst@example.com' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
        views: 1250, likes: 45, comments: 12, isNotice: false,
        tags: ['여론조사', '분석방법', '통계']
      },
      {
        _id: '2',
        title: '유튜브 정치 채널 분석 팁',
        content: '유튜브의 정치 관련 콘텐츠를 분석할 때 주의해야 할 점들을 정리했습니다.',
        source: '유튜브',
        author: { name: '미디어분석가', email: 'media@example.com' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
        views: 890, likes: 32, comments: 8, isNotice: false,
        tags: ['유튜브', '미디어분석', '정치콘텐츠']
      },
      {
        _id: '3',
        title: '카더라 통신으로 들은 내부 정보',
        content: '지인을 통해 들은 선거 캠프 내부 분위기입니다.',
        source: '카더라',
        author: { name: '정보수집가', email: 'info@example.com' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
        views: 2100, likes: 78, comments: 45, isNotice: false,
        tags: ['내부정보', '선거캠프', '루머']
      },
      {
        _id: '4',
        title: '개인적인 선거 분석 관점',
        content: '개인적으로 선거를 분석할 때 중요하게 생각하는 요소들을 정리했습니다.',
        source: '개인 생각',
        author: { name: '정치관찰자', email: 'observer@example.com' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
        views: 567, likes: 23, comments: 15, isNotice: false,
        tags: ['개인분석', '선거전략', '투표패턴']
      },
      {
        _id: '5',
        title: 'KBS 여론조사 결과 심층 분석',
        content: '최근 발표된 KBS 여론조사 결과를 자세히 분석해보겠습니다.',
        source: '언론사',
        author: { name: 'KBS기자', email: 'kbs@example.com' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
        views: 3200, likes: 89, comments: 34, isNotice: false,
        tags: ['KBS', '여론조사', '지지율']
      },
      {
        _id: '6',
        title: '정치유튜버 김용호의 최신 분석',
        content: '정치유튜버 김용호의 최신 분석 영상 내용을 정리했습니다.',
        source: '유튜브',
        author: { name: '유튜브팬', email: 'fan@example.com' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
        views: 1890, likes: 67, comments: 28, isNotice: false,
        tags: ['김용호', '정치유튜브', '분석']
      },
      {
        _id: '7',
        title: '선거 관련 찌라시 정보 모음',
        content: '최근 SNS와 커뮤니티에서 돌아다니는 선거 관련 소문들을 모아봤습니다.',
        source: '카더라',
        author: { name: '소문수집가', email: 'rumor@example.com' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
        views: 4500, likes: 156, comments: 89, isNotice: false,
        tags: ['소문', '찌라시', 'SNS']
      },
      {
        _id: '8',
        title: '나의 선거 예측 모델',
        content: '여러 데이터를 종합해서 만든 나만의 선거 예측 모델입니다.',
        source: '개인 생각',
        author: { name: '데이터분석가', email: 'data@example.com' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
        views: 2300, likes: 78, comments: 42, isNotice: false,
        tags: ['예측모델', '데이터분석', '통계']
      },
      {
        _id: '9',
        title: 'MBC 뉴스데스크 선거 특집',
        content: '어제 방송된 MBC 뉴스데스크 선거 특집의 주요 내용을 정리했습니다.',
        source: '언론사',
        author: { name: 'MBC기자', email: 'mbc@example.com' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
        views: 2800, likes: 95, comments: 38, isNotice: false,
        tags: ['MBC', '뉴스데스크', '전문가분석']
      },
      {
        _id: '10',
        title: '가로세로연구소 최신 분석',
        content: '유튜브 채널 가로세로연구소의 최신 선거 분석 영상을 요약했습니다.',
        source: '유튜브',
        author: { name: '가세연팬', email: 'gaseyon@example.com' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
        views: 5600, likes: 234, comments: 67, isNotice: false,
        tags: ['가로세로연구소', '김세의', '정치분석']
      },
      {
        _id: '11',
        title: '선거 관련 내부 정보 (미확인)',
        content: '정치권 내부에서 들리는 여러 소문들을 정리해봤습니다.',
        source: '카더라',
        author: { name: '정치통', email: 'politics@example.com' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 11).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 11).toISOString(),
        views: 3400, likes: 123, comments: 78, isNotice: false,
        tags: ['내부정보', '정치권', '소문']
      },
      {
        _id: '12',
        title: '선거 결과 예측을 위한 개인적 고찰',
        content: '개인적으로 선거를 예측할 때 사용하는 방법론을 공유합니다.',
        source: '개인 생각',
        author: { name: '선거분석가', email: 'election@example.com' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
        views: 1200, likes: 45, comments: 23, isNotice: false,
        tags: ['예측방법', '분석기법', '개인견해']
      },
      {
        _id: '13',
        title: 'SBS 8뉴스 여론조사 분석',
        content: 'SBS에서 발표한 최신 여론조사 결과를 상세히 분석했습니다.',
        source: '언론사',
        author: { name: 'SBS기자', email: 'sbs@example.com' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 13).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 13).toISOString(),
        views: 2100, likes: 67, comments: 29, isNotice: false,
        tags: ['SBS', '8뉴스', '여론조사']
      },
      {
        _id: '14',
        title: '신의한수 채널 선거 분석',
        content: '유튜브 채널 신의한수의 선거 분석 영상을 정리했습니다.',
        source: '유튜브',
        author: { name: '신한수팬', email: 'shinhansu@example.com' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
        views: 4200, likes: 178, comments: 56, isNotice: false,
        tags: ['신의한수', '정치유튜브', '선거분석']
      },
      {
        _id: '15',
        title: '커뮤니티에서 돌아다니는 이야기들',
        content: '각종 온라인 커뮤니티에서 돌아다니는 선거 관련 이야기들을 모았습니다.',
        source: '카더라',
        author: { name: '커뮤니티러', email: 'community@example.com' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
        views: 6700, likes: 289, comments: 134, isNotice: false,
        tags: ['커뮤니티', '온라인여론', '디시']
      },
      {
        _id: '16',
        title: '선거 결과 예측을 위한 나만의 지표',
        content: '여러 선거를 지켜보면서 개발한 나만의 예측 지표를 공유합니다.',
        source: '개인 생각',
        author: { name: '예측전문가', email: 'predict@example.com' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 16).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 16).toISOString(),
        views: 1800, likes: 62, comments: 31, isNotice: false,
        tags: ['예측지표', '개인분석', '선거예측']
      },
      {
        _id: '17',
        title: 'JTBC 뉴스룸 선거 분석',
        content: 'JTBC 뉴스룸에서 다룬 선거 특집 내용을 정리했습니다.',
        source: '언론사',
        author: { name: 'JTBC기자', email: 'jtbc@example.com' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 17).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 17).toISOString(),
        views: 3100, likes: 98, comments: 44, isNotice: false,
        tags: ['JTBC', '뉴스룸', '전문가분석']
      },
      {
        _id: '18',
        title: '정치유튜버 이준석TV 분석',
        content: '이준석의 개인 유튜브 채널에서 다룬 선거 관련 내용을 정리했습니다.',
        source: '유튜브',
        author: { name: '이준석팬', email: 'leejunseok@example.com' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString(),
        views: 7800, likes: 345, comments: 89, isNotice: false,
        tags: ['이준석TV', '정치인유튜브', '개인방송']
      },
      {
        _id: '19',
        title: '선거 관련 찌라시 모음집',
        content: 'SNS와 메신저를 통해 돌아다니는 각종 찌라시들을 모아봤습니다.',
        source: '카더라',
        author: { name: '찌라시수집가', email: 'jjirashi@example.com' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 19).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 19).toISOString(),
        views: 8900, likes: 456, comments: 234, isNotice: false,
        tags: ['찌라시', 'SNS소문', '미확인정보']
      },
      {
        _id: '20',
        title: '선거 예측을 위한 종합적 분석',
        content: '여러 요소들을 종합해서 선거 결과를 예측해보는 개인적인 분석입니다.',
        source: '개인 생각',
        author: { name: '종합분석가', email: 'comprehensive@example.com' },
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
        views: 2400, likes: 87, comments: 52, isNotice: false,
        tags: ['종합분석', '선거예측', '개인견해']
      }
    ];

    // 페이지네이션 처리
    const urlParams = new URLSearchParams(url.split('?')[1] || '');
    const skip = parseInt(urlParams.get('skip') || '0');
    const limit = parseInt(urlParams.get('limit') || '25');
    
    const paginatedPosts = mockPosts.slice(skip, skip + limit);
    
    return {
      posts: paginatedPosts,
      pagination: {
        skip,
        limit,
        total: mockPosts.length,
        hasMore: skip + limit < mockPosts.length
      }
    };
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

  // 정보 출처 배경색 반환 함수
  const getSourceBadgeColor = (source: string): string => {
    switch (source) {
      case '언론사':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case '유튜브':
        return 'bg-red-100 text-red-800 border-red-200';
      case '카더라':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case '개인 생각':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
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
      <div className="flex flex-col items-center mb-6">
        <div className="text-center mb-4">
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

      {/* 게시글 목록 */}
      <div className="space-y-2">
        {posts.map((post) => (
          <Card 
            key={post._id} 
            className="hover:shadow-md transition-all duration-200 cursor-pointer hover:bg-muted/30"
            onClick={() => router.push(`/analysis-contest/preparation/posts/${post._id}`)}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* 제목과 공지 배지 */}
                  <div className="flex items-center gap-2 mb-2">
                    {/* 정보 출처 배지 (이모지 대신) */}
                    <Badge 
                      variant="outline" 
                      className={`text-xs px-2 py-0.5 h-5 border ${getSourceBadgeColor(post.source)}`}
                    >
                      {post.source}
                    </Badge>
                    {post.isNotice && (
                      <Badge variant="destructive" className="text-xs px-1.5 py-0.5 h-5">
                        공지
                      </Badge>
                    )}
                    <h3 className="text-base font-medium text-gray-900 dark:text-white truncate">
                      {post.title}
                    </h3>
                  </div>

                  {/* 작성자와 태그를 한 줄에 */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{post.author.name}</span>
                    </div>
                    
                    {/* 태그 (아이디 옆으로 이동, 최대 3개만 표시) */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex gap-1">
                        {post.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs px-1.5 py-0 h-4">
                            #{tag}
                          </Badge>
                        ))}
                        {post.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 h-4">
                            +{post.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 우측 통계 정보 영역 */}
                <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground min-w-0">
                  {/* 통계 정보 */}
                  <div className="flex items-center gap-3">
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
                  
                  {/* 날짜 (통계 정보 밑에 배치) */}
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(post.createdAt)}</span>
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
      <div className="flex flex-col items-center space-y-4 mt-8">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </Button>
          
          <div className="flex items-center space-x-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className="w-8 h-8"
              >
                {page}
              </Button>
            ))}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            다음
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* 페이지 정보 */}
        <div className="text-sm text-muted-foreground">
          {currentPage}/{totalPages} 페이지
        </div>
      </div>
    </div>
  );
} 
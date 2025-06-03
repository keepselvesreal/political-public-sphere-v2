/*
커뮤니티별 게시글 목록 컴포넌트 (실제 스크래핑 데이터 기반)
주요 기능: 메트릭 드롭다운, 선택된 메트릭만 표시, 내부 페이지 이동
라인 구성: 1-30(imports&types), 31-80(유틸함수), 81-150(컴포넌트렌더링)

작성자: AI Assistant
작성일: 2025-01-28
최종 수정: 2025-01-28 (실제 스크래핑 데이터 구조 적용)
*/

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// 실제 스크래핑 데이터 기반 Post 타입 정의
interface Post {
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
  // 메트릭 분류 필드
  top_likes: boolean;
  top_comments: boolean;
  top_views: boolean;
}

interface CommunityPostListProps {
  likesPerView: Post[];
  commentsPerView: Post[];
  viewsPerHour: Post[];
}

type MetricType = 'likes' | 'comments' | 'views' | 'default';

interface CommunitySection {
  name: string;
  emoji: string;
  color: string;
  posts: Post[];
  allPosts: Post[];
}

export function CommunityPostList({ 
  likesPerView, 
  commentsPerView, 
  viewsPerHour 
}: CommunityPostListProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('default');
  const [expandedCommunities, setExpandedCommunities] = useState<Set<string>>(new Set());
  const router = useRouter();

  // 안전한 날짜 포맷팅 함수 (실제 데이터 형식 고려)
  const formatDate = (dateStr: string): string => {
    try {
      if (!dateStr) return '날짜 없음';
      
      // 실제 스크래핑 데이터에서 오는 형식들 처리
      // "03:18", "2019.03.24", "25.06.03 03:16" 등
      if (dateStr.includes(':') && !dateStr.includes(' ')) {
        // 시간만 있는 경우 (오늘)
        return `오늘 ${dateStr}`;
      }
      
      if (dateStr.includes('.')) {
        // "2019.03.24" 또는 "25.06.03 03:16" 형식
        const parts = dateStr.split(' ');
        const datePart = parts[0];
        const timePart = parts[1] || '';
        
        if (datePart.length <= 8) {
          // "25.06.03" 형식 (짧은 년도)
          return timePart ? `${datePart} ${timePart}` : datePart;
        } else {
          // "2019.03.24" 형식 (긴 년도)
          return datePart;
        }
      }
      
      // 표준 날짜 형식 시도
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      
      return dateStr; // 원본 반환
    } catch (error) {
      console.warn('날짜 포맷팅 오류:', dateStr, error);
      return dateStr;
    }
  };

  // 숫자 포맷팅 함수 (천 단위 콤마)
  const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    return num.toLocaleString('ko-KR');
  };

  // 게시글 클릭 핸들러 - 내부 페이지로 이동
  const handlePostClick = (post: Post) => {
    router.push(`/community-posts/posts/${post._id}`);
  };

  // 외부 링크 클릭 핸들러
  const handleExternalLinkClick = (post: Post, e: React.MouseEvent) => {
    e.stopPropagation();
    if (post.url) {
      window.open(post.url, '_blank', 'noopener,noreferrer');
    }
  };

  // 메트릭에 따른 게시글 선택
  const getPostsByMetric = (): Post[] => {
    switch (selectedMetric) {
      case 'likes':
        return likesPerView;
      case 'comments':
        return commentsPerView;
      case 'views':
        return viewsPerHour;
      default:
        // 중복 제거를 위해 Set을 사용하여 _id 기준으로 유니크한 게시글만 반환
        const allPosts = [...likesPerView, ...commentsPerView, ...viewsPerHour];
        const uniquePostsMap = new Map<string, Post>();
        
        allPosts.forEach(post => {
          if (!uniquePostsMap.has(post._id)) {
            uniquePostsMap.set(post._id, post);
          }
        });
        
        return Array.from(uniquePostsMap.values());
    }
  };

  // 선택된 메트릭에 따른 태그 반환
  const getMetricTag = (): string => {
    switch (selectedMetric) {
      case 'likes':
        return '추천률🔥';
      case 'comments':
        return '댓글률💬';
      case 'views':
        return '조회수👀';
      default:
        return '전체📊';
    }
  };

  // 게시글별 메트릭 태그 반환 (실제 boolean 필드 기반)
  const getPostMetricTag = (post: Post): string => {
    if (post.top_likes) {
      return '추천률🔥';
    } else if (post.top_comments) {
      return '댓글률💬';
    } else if (post.top_views) {
      return '조회수👀';
    }
    return '일반📝';
  };

  // 커뮤니티별로 게시글 그룹화 (실제 사이트명 기반)
  const groupPostsByCommunity = (posts: Post[]): CommunitySection[] => {
    const communityMap = new Map<string, Post[]>();
    
    posts.forEach(post => {
      const community = post.site || post.community || '기타';
      if (!communityMap.has(community)) {
        communityMap.set(community, []);
      }
      communityMap.get(community)!.push(post);
    });

    // 실제 커뮤니티별 정보 매핑
    const communityInfo: Record<string, { emoji: string; color: string; name: string }> = {
      'fmkorea': { emoji: '🎮', color: 'blue', name: 'FM코리아' },
      'ruliweb': { emoji: '🎯', color: 'purple', name: '루리웹' },
      'clien': { emoji: '💻', color: 'green', name: '클리앙' },
      'dcinside': { emoji: '🎨', color: 'red', name: 'DC인사이드' },
      'instiz': { emoji: '🌟', color: 'orange', name: '인스티즈' },
      '기타': { emoji: '📝', color: 'gray', name: '기타' }
    };

    return Array.from(communityMap.entries()).map(([name, posts]) => ({
      name: communityInfo[name]?.name || name,
      emoji: communityInfo[name]?.emoji || '📝',
      color: communityInfo[name]?.color || 'gray',
      posts: posts.slice(0, 3), // 기본적으로 3개만 표시
      allPosts: posts // 전체 게시글 저장
    }));
  };

  const toggleCommunityExpansion = (communityName: string) => {
    const newExpanded = new Set(expandedCommunities);
    if (newExpanded.has(communityName)) {
      newExpanded.delete(communityName);
    } else {
      newExpanded.add(communityName);
    }
    setExpandedCommunities(newExpanded);
  };

  const currentPosts = getPostsByMetric();
  const communitySections = groupPostsByCommunity(currentPosts);
  const metricTag = getMetricTag();

  // 메트릭 라벨 매핑
  const getMetricLabel = (metric: MetricType): string => {
    switch (metric) {
      case 'likes':
        return '추천수';
      case 'comments':
        return '댓글수';
      case 'views':
        return '조회수';
      default:
        return '기준';
    }
  };

  return (
    <div className="space-y-6">
      {/* 메트릭 드롭다운 */}
      <div className="flex justify-end">
        <Select value={selectedMetric} onValueChange={(value: MetricType) => setSelectedMetric(value)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="정렬 기준" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">기준</SelectItem>
            <SelectItem value="likes">추천수</SelectItem>
            <SelectItem value="comments">댓글수</SelectItem>
            <SelectItem value="views">조회수</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 커뮤니티별 섹션 */}
      <div className="space-y-6">
        {communitySections.map((section, index) => {
          const displayPosts = expandedCommunities.has(section.name) 
            ? section.allPosts 
            : section.posts;
          const hasMore = section.allPosts.length > 3;

          // 커뮤니티별 배경색 설정
          const getBorderColor = (community: string) => {
            switch (community) {
              case 'fmkorea':
                return 'border-blue-400';
              case 'ruliweb':
                return 'border-purple-400';
              case 'clien':
                return 'border-green-400';
              case 'dcinside':
                return 'border-red-400';
              case 'instiz':
                return 'border-orange-400';
              default:
                return 'border-gray-400';
            }
          };

          const getBackgroundColor = (community: string) => {
            switch (community) {
              case 'fmkorea':
                return 'bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30';
              case 'ruliweb':
                return 'bg-purple-50 dark:bg-purple-950/20 hover:bg-purple-100 dark:hover:bg-purple-950/30';
              case 'clien':
                return 'bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/30';
              case 'dcinside':
                return 'bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30';
              case 'instiz':
                return 'bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/30';
              default:
                return 'bg-gray-50 dark:bg-gray-950/20 hover:bg-gray-100 dark:hover:bg-gray-950/30';
            }
          };

          return (
            <motion.div
              key={section.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="transition-opacity duration-300"
            >
              <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2">
                    <span className="text-xl">{section.emoji}</span>
                    <span className="text-lg font-bold">
                      {section.name === '기타' ? '기타' : section.name} 게시글
                    </span>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {section.allPosts.length}개
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <AnimatePresence>
                      {displayPosts.map((post, postIndex) => (
                        <motion.div
                          key={post._id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.2, delay: postIndex * 0.05 }}
                          className={`border-l-4 ${getBorderColor(section.name)} pl-4 py-2 pr-4 ${getBackgroundColor(section.name)} rounded-r-lg cursor-pointer transition-colors`}
                          onClick={() => handlePostClick(post)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="space-y-1">
                            {/* 게시글 제목 - 더 작은 크기 */}
                            <h4 className="text-sm font-medium line-clamp-1 text-gray-900 dark:text-gray-100">
                              {post.title}
                            </h4>
                            
                            {/* 게시글 정보 - 더 작은 크기 */}
                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                              <div className="flex items-center space-x-2">
                                <span className={`px-1.5 py-0.5 rounded text-xs ${
                                  section.name === 'fmkorea' ? 'bg-blue-200 dark:bg-blue-800' :
                                  section.name === 'ruliweb' ? 'bg-purple-200 dark:bg-purple-800' :
                                  section.name === 'clien' ? 'bg-green-200 dark:bg-green-800' :
                                  section.name === 'dcinside' ? 'bg-red-200 dark:bg-red-800' :
                                  section.name === 'instiz' ? 'bg-orange-200 dark:bg-orange-800' :
                                  'bg-gray-200 dark:bg-gray-800'
                                }`}>
                                  {getPostMetricTag(post)}
                                </span>
                                <span>{formatDate(post.created_at)}</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span>👀 {formatNumber(post.views)}</span>
                                <span>👍 {formatNumber(post.likes)}</span>
                                <span>👎 {formatNumber(post.dislikes)}</span>
                                <span>💬 {formatNumber(post.comments_count)}</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  
                  {/* 더보기 버튼 - 각 커뮤니티별로 */}
                  {hasMore && (
                    <motion.div 
                      className="mt-4 text-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCommunityExpansion(section.name);
                        }}
                        className="text-xs"
                      >
                        {expandedCommunities.has(section.name) 
                          ? '접기' 
                          : `더보기 (+${section.allPosts.length - 3}개)`
                        }
                      </Button>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* 전체 통계 */}
      <div className="text-center text-sm text-muted-foreground">
        <p>
          현재 {getMetricLabel(selectedMetric)} 기준으로 
          {currentPosts.length}개 게시글 표시 중
        </p>
      </div>
    </div>
  );
} 
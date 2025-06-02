/*
목차:
- PostCard 컴포넌트 (게시글 카드)
- 게시글 미리보기 및 링크
- 반응형 디자인 및 접근성 지원
- i18n 다국어 지원
- next/image 최적화 적용
*/

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ChevronRight, ThumbsUp, ThumbsDown, Eye, MessageCircle } from 'lucide-react';

export interface PostCardProps {
  id: string;
  predictedWinner: string;
  marginPercentage: number;
  mainQuote: string;
  candidates?: Array<{
    name: string;
    percentage: number;
    color: string;
  }>;
  tags?: string[];
  analyst?: {
    name: string;
    avatar: string;
    institute: string;
    date: string;
  };
}

const PostCard = React.memo(function PostCard({ 
  id,
  predictedWinner,
  marginPercentage,
  mainQuote,
  candidates,
  tags,
  analyst
}: PostCardProps) {
  const { t } = useTranslation('common');
  
  // id가 없으면 렌더링하지 않음
  if (!id) {
    return null;
  }
  
  // 득표율 격차에 따른 색상 결정
  const getMarginColor = (percentage: number) => {
    if (percentage >= 10) return 'text-green-600';
    if (percentage >= 5) return 'text-green-500';
    return 'text-green-400';
  };
  
  const marginColor = getMarginColor(marginPercentage);
  
  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // 키보드 내비게이션 핸들러
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      window.location.href = `/analysis-contest/analysis-post/${id}`;
    }
  };
  
  // Mock 데이터 (실제로는 API에서 가져와야 함)
  const mockVotes = { up: Math.floor(Math.random() * 100), down: Math.floor(Math.random() * 20) };
  const mockViews = Math.floor(Math.random() * 1000);
  
  return (
    <Link href={`/analysis-contest/analysis-post/${id}`} className="block">
      <Card 
        className="h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        role="article"
        aria-label={`${t('title')}: ${predictedWinner} ${marginPercentage}% 격차로 예측 당선`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <CardContent className="p-6">
          {/* 헤더: 예측 당선자와 격차 */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center">
              <span className="text-amber-500 mr-2" aria-hidden="true">🏆</span>
              <span className="text-sm font-semibold bg-amber-100 dark:bg-amber-900 dark:text-amber-100 px-2 py-1 rounded">
                {t('winner')}
              </span>
            </div>
            <div className="text-right">
              <span className={`font-bold ${marginColor}`}>
                +{marginPercentage}%
              </span>
              <span className="text-xs text-muted-foreground block">
                {t('voteGap')}
              </span>
            </div>
          </div>
          
          {/* 예측 당선자 */}
          <h3 className="text-xl font-bold mb-2" title={predictedWinner}>
            {predictedWinner}
          </h3>
          
          {/* 주요 인용구 */}
          <blockquote className="text-sm text-muted-foreground italic mb-4 line-clamp-2">
            "{mainQuote}"
          </blockquote>
          
          {/* 후보자 득표율 미리보기 */}
          {candidates && candidates.length > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>득표율 예측</span>
              </div>
              <div className="space-y-1">
                {candidates.slice(0, 2).map((candidate, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm font-medium">{candidate.name}</span>
                    <span className="text-sm font-bold">{candidate.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 키워드 태그 */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4" role="list" aria-label={t('keywords')}>
              {tags.slice(0, 3).map((tag, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="rounded-full text-xs px-2 py-1"
                  role="listitem"
                >
                  #{tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="outline" className="rounded-full text-xs px-2 py-1">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}
          
          {/* 통계 정보 */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1" title={`${t('like')}: ${mockVotes.up}`}>
                <ThumbsUp className="h-4 w-4" aria-hidden="true" />
                <span>{mockVotes.up}</span>
              </div>
              <div className="flex items-center space-x-1" title={`${t('dislike')}: ${mockVotes.down}`}>
                <ThumbsDown className="h-4 w-4" aria-hidden="true" />
                <span>{mockVotes.down}</span>
              </div>
              <div className="flex items-center space-x-1" title={`${t('views')}: ${mockViews}`}>
                <Eye className="h-4 w-4" aria-hidden="true" />
                <span>{mockViews}</span>
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="bg-gray-50 dark:bg-gray-900 p-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            {analyst ? (
              <>
                <Avatar className="h-6 w-6">
                  <div className="relative w-6 h-6 rounded-full overflow-hidden">
                    <Image
                      src={analyst.avatar}
                      alt={analyst.name}
                      fill
                      sizes="24px"
                      className="object-cover"
                      loading="lazy"
                      placeholder="blur"
                      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+Rj5m4xbDMvLvZWjfvHd5n2v8AkJjqvU9P2vqf/9k="
                    />
                  </div>
                  <AvatarFallback>{analyst.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <span className="text-sm font-medium">{analyst.name}</span>
                  <p className="text-xs text-muted-foreground">
                    {analyst.institute} • <time dateTime={analyst.date}>{formatDate(analyst.date)}</time>
                  </p>
                </div>
              </>
            ) : (
              <div>
                <span className="text-sm font-medium">익명 분석가</span>
                <p className="text-xs text-muted-foreground">분석 기관 미상</p>
              </div>
            )}
          </div>
          <ChevronRight 
            className="h-5 w-5 text-muted-foreground" 
            aria-hidden="true"
          />
        </CardFooter>
      </Card>
    </Link>
  );
});

export default PostCard;
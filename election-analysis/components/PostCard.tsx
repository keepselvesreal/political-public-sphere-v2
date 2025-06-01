import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'next-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ChevronRight, ThumbsUp, ThumbsDown, Eye, MessageCircle } from 'lucide-react';

export interface PostCardProps {
  _id: string;
  title: string;
  winner: string;
  gap: number;
  votes: {
    up: number;
    down: number;
  };
  keywords: string[];
  authorId: string;
  createdAt: string;
  likes: number;
  views: number;
}

const PostCard = React.memo(function PostCard({ 
  _id,
  title,
  winner,
  gap,
  votes,
  keywords,
  authorId,
  createdAt,
  likes,
  views
}: PostCardProps) {
  const { t } = useTranslation('common');
  
  // 득표율 격차에 따른 색상 결정
  const getMarginColor = (percentage: number) => {
    if (percentage >= 10) return 'text-green-600';
    if (percentage >= 5) return 'text-green-500';
    return 'text-green-400';
  };
  
  const marginColor = getMarginColor(gap);
  
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
      window.location.href = `/post/${_id}`;
    }
  };
  
  return (
    <Link href={`/post/${_id}`} className="block">
      <Card 
        className="h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        role="article"
        aria-label={`${t('title')}: ${title}`}
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
                +{gap}%
              </span>
              <span className="text-xs text-muted-foreground block">
                {t('voteGap')}
              </span>
            </div>
          </div>
          
          {/* 제목 */}
          <h3 className="text-xl font-bold mb-2 line-clamp-2" title={title}>
            {title}
          </h3>
          
          {/* 예측 당선자 */}
          <p className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-4">
            {winner}
          </p>
          
          {/* 키워드 태그 */}
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4" role="list" aria-label={t('keywords')}>
              {keywords.slice(0, 3).map((keyword, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="rounded-full text-xs px-2 py-1"
                  role="listitem"
                >
                  #{keyword}
                </Badge>
              ))}
              {keywords.length > 3 && (
                <Badge variant="outline" className="rounded-full text-xs px-2 py-1">
                  +{keywords.length - 3}
                </Badge>
              )}
            </div>
          )}
          
          {/* 통계 정보 */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1" title={`${t('like')}: ${votes.up}`}>
                <ThumbsUp className="h-4 w-4" aria-hidden="true" />
                <span>{votes.up}</span>
              </div>
              <div className="flex items-center space-x-1" title={`${t('dislike')}: ${votes.down}`}>
                <ThumbsDown className="h-4 w-4" aria-hidden="true" />
                <span>{votes.down}</span>
              </div>
              <div className="flex items-center space-x-1" title={`${t('views')}: ${views}`}>
                <Eye className="h-4 w-4" aria-hidden="true" />
                <span>{views}</span>
              </div>
            </div>
            <time dateTime={createdAt} className="text-xs">
              {formatDate(createdAt)}
            </time>
          </div>
        </CardContent>
        
        <CardFooter className="bg-gray-50 dark:bg-gray-900 p-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              {t('author')}: {authorId}
            </span>
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
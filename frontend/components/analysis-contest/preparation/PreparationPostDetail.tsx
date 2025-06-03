/*
목차:
- 정보 공유 글 상세 페이지 컴포넌트
- 정보 출처 배지 표시
- 태그, 조회수, 좋아요 등 메타 정보
- 댓글 시스템 (추후 구현)
- 마지막 수정: 2024년 12월 19일 18시 55분 (KST)
*/

"use client";

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye, ThumbsUp, MessageSquare, Calendar, User, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// 정보 공유 글 타입 정의
interface PreparationPost {
  _id: string;
  title: string;
  content: string;
  source: '언론사' | '유튜브' | '카더라' | '개인 생각';
  author: {
    name: string;
    email: string;
  };
  tags: string[];
  views: number;
  likes: number;
  comments: number;
  createdAt: string;
  updatedAt: string;
}

interface PreparationPostDetailProps {
  post: PreparationPost;
}

export default function PreparationPostDetail({ post }: PreparationPostDetailProps) {
  const router = useRouter();

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

  // 날짜 포맷팅 함수
  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* 뒤로가기 버튼 */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          목록으로 돌아가기
        </Button>
      </div>

      {/* 메인 콘텐츠 */}
      <Card>
        <CardHeader className="pb-4">
          {/* 제목과 정보 출처 */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Badge 
                variant="outline" 
                className={`text-sm px-3 py-1 border ${getSourceBadgeColor(post.source)}`}
              >
                {post.source}
              </Badge>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex-1">
                {post.title}
              </h1>
            </div>

            {/* 메타 정보 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{post.author.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(post.createdAt)}</span>
                </div>
              </div>

              {/* 통계 정보 */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>{formatNumber(post.views)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ThumbsUp className="h-4 w-4" />
                  <span>{formatNumber(post.likes)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>{formatNumber(post.comments)}</span>
                </div>
              </div>
            </div>

            {/* 태그 */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {/* 본문 내용 */}
          <div 
            className="prose prose-slate max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* 액션 버튼들 */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <ThumbsUp className="h-4 w-4 mr-1" />
                좋아요 ({post.likes})
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-1" />
                공유
              </Button>
            </div>

            <Link href="/analysis-contest/preparation">
              <Button variant="outline">
                목록으로
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* 댓글 섹션 (추후 구현) */}
      <Card className="mt-6">
        <CardHeader>
          <h3 className="text-lg font-semibold">댓글 ({post.comments})</h3>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            댓글 기능은 준비 중입니다.
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
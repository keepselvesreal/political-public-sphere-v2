/*
목차:
- 개별 커뮤니티 게시글 상세 페이지 (라인 1-50)
- 게시글 정보 표시 및 메트릭 (라인 51-100)
- 댓글 섹션 및 상호작용 (라인 101-150)

작성자: AI Assistant
작성일: 2025-01-28
최종 수정: 2025-01-28 (커뮤니티 게시글 상세 페이지 생성)
*/

"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, ThumbsUp, ThumbsDown, MessageSquare, Calendar, User, ExternalLink } from 'lucide-react';

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
  content?: string;
  comments?: any[];
  likes_per_view?: number;
  comments_per_view?: number;
  views_per_exposure_hour?: number;
}

export default function CommunityPostDetail() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/community-posts/${params.id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
          setPost(result.data);
        } else {
          throw new Error(result.error || '게시글을 찾을 수 없습니다.');
        }
      } catch (error) {
        console.error('게시글 로딩 실패:', error);
        setError(error instanceof Error ? error.message : '알 수 없는 오류');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchPost();
    }
  }, [params.id]);

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
      case 'instiz':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-12 bg-gray-200 rounded w-3/4 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">오류 발생</h1>
          <p className="text-gray-600 mb-4">{error || '게시글을 찾을 수 없습니다.'}</p>
          <Button onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 뒤로가기 버튼 */}
      <Button 
        variant="ghost" 
        onClick={() => router.back()}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        목록으로 돌아가기
      </Button>

      {/* 게시글 상세 정보 */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between mb-4">
            <Badge className={getCommunityColor(post.site)}>
              {post.community}
            </Badge>
            <Badge variant="outline">
              {post.category}
            </Badge>
          </div>
          
          <CardTitle className="text-2xl font-bold mb-4">
            {post.title}
          </CardTitle>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center">
              <User className="h-4 w-4 mr-1" />
              {post.author}
            </div>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {new Date(post.created_at).toLocaleString('ko-KR')}
            </div>
            {post.url && (
              <a 
                href={post.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                원본 보기
              </a>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {/* 게시글 내용 */}
          <div className="prose dark:prose-invert max-w-none mb-6">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {post.content || '게시글 내용이 없습니다.'}
            </p>
          </div>
          
          {/* 메트릭 정보 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Eye className="h-4 w-4 mr-1" />
                <span className="text-sm font-medium">조회수</span>
              </div>
              <p className="text-lg font-bold">{post.views.toLocaleString()}</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <ThumbsUp className="h-4 w-4 mr-1 text-green-600" />
                <span className="text-sm font-medium">추천</span>
              </div>
              <p className="text-lg font-bold text-green-600">{post.likes.toLocaleString()}</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <ThumbsDown className="h-4 w-4 mr-1 text-red-600" />
                <span className="text-sm font-medium">비추천</span>
              </div>
              <p className="text-lg font-bold text-red-600">{post.dislikes.toLocaleString()}</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <MessageSquare className="h-4 w-4 mr-1 text-blue-600" />
                <span className="text-sm font-medium">댓글</span>
              </div>
              <p className="text-lg font-bold text-blue-600">{post.comments_count.toLocaleString()}</p>
            </div>
          </div>
          
          {/* 계산된 메트릭 */}
          {(post.likes_per_view || post.comments_per_view || post.views_per_exposure_hour) && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <h3 className="font-semibold mb-2">분석 메트릭</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {post.likes_per_view && (
                  <div>
                    <span className="font-medium">추천률:</span> {(post.likes_per_view * 100).toFixed(2)}%
                  </div>
                )}
                {post.comments_per_view && (
                  <div>
                    <span className="font-medium">댓글률:</span> {(post.comments_per_view * 100).toFixed(2)}%
                  </div>
                )}
                {post.views_per_exposure_hour && (
                  <div>
                    <span className="font-medium">시간당 조회수:</span> {post.views_per_exposure_hour.toFixed(1)}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* 댓글 섹션 (향후 구현) */}
      <Card>
        <CardHeader>
          <CardTitle>댓글 ({post.comments_count})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            댓글 기능은 준비 중입니다.
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
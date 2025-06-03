/*
목차:
- 개별 커뮤니티 게시글 상세 페이지 (라인 1-50)
- 실험용 게시글 재현 컴포넌트 사용 (라인 51-100)
- 에러 처리 및 로딩 상태 (라인 101-150)

작성자: AI Assistant
작성일: 2025-01-28
최종 수정: 2025-01-28 (올바른 컴포넌트명으로 수정)
*/

"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CommunityPostDetailRenderer } from '@/components/community-posts/community-post-detail';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

// 커뮤니티 게시글 데이터 타입 (experimental-post-renderer와 동일)
interface CommunityPostData {
  post_id: string;
  post_url: string;
  scraped_at: string;
  metadata: {
    title?: string;
    author?: string;
    date?: string;
    category?: string;
    view_count?: number;
    like_count?: number;
    dislike_count?: number;
    comment_count?: number;
  };
  content: Array<{
    type: 'image' | 'text' | 'video';
    order: number;
    data: any;
  }>;
  comments: Array<{
    comment_id: string;
    author: string;
    content: string;
    images?: string[];
    created_at: string;
    date: string;
    like_count: number;
    dislike_count: number;
    is_best: boolean;
    index?: number;
    level?: number;
    is_reply?: boolean;
    parent_comment?: string;
    vote_count?: number;
    blame_count?: number;
    is_author?: boolean;
    image_url?: string;
    image_link?: string;
    video_url?: string;
    video_autoplay?: boolean;
    video_loop?: boolean;
    video_muted?: boolean;
  }>;
  experiment_purpose?: string;
}

export default function CommunityPostDetail() {
  const params = useParams();
  const router = useRouter();
  const [postData, setPostData] = useState<CommunityPostData | null>(null);
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
          setPostData(result.data);
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

  if (error || !postData) {
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
    <CommunityPostDetailRenderer 
      postData={postData}
      showMetadata={true}
      onBack={() => router.back()}
    />
  );
} 
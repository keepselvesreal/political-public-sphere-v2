/*
목차:
- 게시글 수정 페이지
- 기존 게시글 데이터 로드
- PostForm 컴포넌트 재사용
- 작성자 권한 확인
- 마지막 수정: 2024년 12월 19일 19시 25분 (KST)
*/

"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { notFound } from 'next/navigation';
import PostForm from '@/components/analysis-contest/PostForm';
import { useToast } from '@/hooks/use-toast';

// PostForm에서 사용하는 타입 정의
type PostFormData = {
  title: string;
  winner: string;
  gap: number;
  votes: {
    leeJaeMyung: number;
    kimMoonSoo: number;
    leeJunSeok: number;
    kwonYoungGook: number;
  };
  keywords: string[];
  content: string;
};

// API에서 받아오는 게시글 데이터 타입
type ApiPost = {
  _id: string;
  title: string;
  winner: string;
  gap: number;
  votes?: {
    leeJaeMyung?: number;
    kimMoonSoo?: number;
    leeJunSeok?: number;
    kwonYoungGook?: number;
  };
  keywords: string[];
  content: string;
  authorId: string;
};

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [post, setPost] = useState<ApiPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);

  // params 해결
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  // 인증 확인
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      toast({
        title: "로그인 필요",
        description: "게시글을 수정하려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      router.push('/auth/login');
      return;
    }
  }, [session, status, router, toast]);

  // 게시글 데이터 로드
  useEffect(() => {
    if (!resolvedParams?.id || !session) return;

    const fetchPost = async () => {
      try {
        const response = await fetch(`/api/analysis-contest/${resolvedParams.id}`);
        if (!response.ok) {
          if (response.status === 404) {
            notFound();
          }
          throw new Error('게시글을 불러올 수 없습니다.');
        }
        
        const postData = await response.json();
        
        // 작성자 권한 확인
        if (postData.authorId !== session.user.id && postData.authorId !== session.user.email) {
          toast({
            title: "권한 없음",
            description: "이 게시글을 수정할 권한이 없습니다.",
            variant: "destructive",
          });
          router.push('/analysis-contest/practice');
          return;
        }
        
        setPost(postData);
      } catch (error) {
        console.error('게시글 로드 오류:', error);
        toast({
          title: "로드 실패",
          description: "게시글을 불러오는데 실패했습니다.",
          variant: "destructive",
        });
        router.push('/analysis-contest/practice');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [resolvedParams, session, router, toast]);

  // 수정 제출 핸들러
  const handleSubmit = async (data: PostFormData) => {
    if (!resolvedParams?.id || !session) return;

    try {
      const postData = {
        title: data.title.trim(),
        winner: data.winner.trim(),
        gap: Number(data.gap),
        votes: data.votes,
        keywords: data.keywords,
        content: data.content.trim(),
        authorId: session.user.id || session.user.email || 'anonymous'
      };

      const response = await fetch(`/api/analysis-contest/${resolvedParams.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '게시글 수정에 실패했습니다.');
      }

      toast({
        title: "수정 완료",
        description: "게시글이 성공적으로 수정되었습니다.",
      });
      
      router.push(`/analysis-contest/analysis-post/${resolvedParams.id}`);
    } catch (error) {
      console.error('게시글 수정 오류:', error);
      toast({
        title: "수정 실패",
        description: error instanceof Error ? error.message : "게시글 수정에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // 취소 핸들러
  const handleCancel = () => {
    if (resolvedParams?.id) {
      router.push(`/analysis-contest/analysis-post/${resolvedParams.id}`);
    } else {
      router.push('/analysis-contest/practice');
    }
  };

  // 로딩 상태
  if (loading || !resolvedParams) {
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

  // 게시글이 없는 경우
  if (!post) {
    return null;
  }

  // PostForm에 전달할 초기 데이터 변환
  const initialData: PostFormData = {
    title: post.title,
    winner: post.winner,
    gap: post.gap,
    votes: {
      leeJaeMyung: post.votes?.leeJaeMyung || 25,
      kimMoonSoo: post.votes?.kimMoonSoo || 25,
      leeJunSeok: post.votes?.leeJunSeok || 25,
      kwonYoungGook: post.votes?.kwonYoungGook || 25,
    },
    keywords: post.keywords,
    content: post.content,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            게시글 수정
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            분석 내용을 수정하고 업데이트하세요.
          </p>
        </div>
        
        <PostForm 
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          initialData={initialData}
        />
      </div>
    </div>
  );
} 
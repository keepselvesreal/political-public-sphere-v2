"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import PostForm from '@/components/analysis/PostForm';
import { useToast } from '@/hooks/use-toast';

// PostForm에서 사용하는 타입 정의
type PostFormData = {
  title: string;
  winner: string;
  gap: number;
  votes: {
    candidate1: number;
    candidate2: number;
  };
  keywords: string[];
  content: string;
};

export default function WritePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  // 인증 상태 확인 및 리다이렉트
  useEffect(() => {
    if (status === 'loading') return; // 로딩 중일 때는 대기
    
    if (status === 'unauthenticated') {
      toast({
        title: "로그인 필요",
        description: "게시글을 작성하려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      router.push('/api/auth/signin');
      return;
    }
  }, [status, router, toast]);

  // 폼 제출 핸들러
  const handleSubmit = async (data: PostFormData) => {
    if (!session?.user) {
      toast({
        title: "인증 오류",
        description: "사용자 인증 정보를 확인할 수 없습니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      // API 호출을 위한 데이터 변환
      const postData = {
        title: data.title.trim(),
        winner: data.winner.trim(),
        gap: Number(data.gap),
        votes: data.votes, // votes 객체 추가
        keywords: data.keywords,
        content: data.content.trim(),
        authorId: session.user.id || session.user.email || 'anonymous'
      };

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '게시글 작성에 실패했습니다.');
      }

      const newPost = await response.json();
      console.log('게시글 작성 성공:', newPost);
      
      toast({
        title: "게시글 작성 완료",
        description: "선거 분석이 성공적으로 게시되었습니다.",
      });
      
      // 메인 페이지로 리다이렉트
      router.push('/');
    } catch (error) {
      console.error('게시글 작성 오류:', error);
      toast({
        title: "작성 실패",
        description: error instanceof Error ? error.message : "게시글 작성에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
      throw error; // PostForm에서 isSubmitting 상태를 올바르게 처리하기 위해
    }
  };

  // 취소 핸들러
  const handleCancel = () => {
    router.push('/');
  };

  // 로딩 중일 때 표시
  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  // 인증되지 않은 경우 (리다이렉트 전까지 표시)
  if (status === 'unauthenticated') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-64">
          <div className="text-center">
            <p className="text-muted-foreground">로그인 페이지로 이동 중...</p>
          </div>
        </div>
      </div>
    );
  }

  // 인증된 사용자에게 폼 표시
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">선거 분석 작성</h1>
      
      <PostForm 
        onSubmit={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
}
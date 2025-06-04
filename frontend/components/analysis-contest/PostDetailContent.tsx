/*
목차:
- PostDetailContent 컴포넌트 (게시글 상세 내용)
- 클라이언트 컴포넌트로 i18n 및 상호작용 처리
- 투표 및 댓글 시스템 통합
- 작성자 수정 기능 추가
- A11y 접근성 지원
- 마지막 수정: 2024년 12월 19일 19시 20분 (KST)
*/

"use client";

import { useTranslation } from 'react-i18next';
import { ArrowLeft, Edit } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CommentSection from '@/components/analysis-contest/CommentSection';
import VoteButtons from '@/components/analysis-contest/VoteButtons';

// i18n 초기화
import '@/lib/i18n';

interface PostDetailContentProps {
  post: {
    id: string;
    title: string;
    predictedWinner: string;
    marginPercentage: number;
    mainQuote: string;
    content: string;
    authorId?: string; // 작성자 ID 추가
    candidates?: Array<{
      name: string;
      percentage: number;
      color: string;
    }>;
    tags: string[];
    analyst?: {
      name: string;
      avatar: string;
      institute: string;
      date: string;
    };
    votes: {
      up: number;
      down: number;
    };
    comments: number;
  };
}

export default function PostDetailContent({ post }: PostDetailContentProps) {
  const { t } = useTranslation('common');
  const { data: session } = useSession();
  
  // 현재 사용자가 작성자인지 확인
  const isAuthor = session?.user && post.authorId && 
    (session.user.id === post.authorId || session.user.email === post.authorId);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <Link 
          href="/analysis-contest/practice" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md"
          aria-label={t('backToList.aria')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          {t('backToList')}
        </Link>
        
        {/* 작성자일 경우 수정 버튼 표시 */}
        {isAuthor && (
          <Link href={`/analysis-contest/edit/${post.id}`}>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              수정
            </Button>
          </Link>
        )}
      </div>
      
      <article className="bg-white dark:bg-gray-950 rounded-xl shadow-md overflow-hidden">
        <div className="p-6 md:p-8">
          <header className="mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-amber-500 text-xl" role="img" aria-label="트로피">🏆</span>
              <span className="text-sm font-semibold bg-amber-100 dark:bg-amber-900 dark:text-amber-100 px-2 py-1 rounded">
                {t('winner').toUpperCase()}
              </span>
              <span className="text-green-600 font-bold">+{post.marginPercentage}% {t('voteGap')}</span>
            </div>
            
            <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
            
            <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 dark:text-gray-400 mb-6">
              "{post.mainQuote}"
            </blockquote>
            
            <div className="flex flex-wrap gap-2 mb-8" role="list" aria-label="키워드 태그">
              {post.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="rounded-full" role="listitem">
                  #{tag}
                </Badge>
              ))}
            </div>
            
            {post.analyst && (
              <div className="flex items-center mb-8 border-b border-gray-200 dark:border-gray-800 pb-6">
                <Avatar className="h-10 w-10 mr-4">
                  <AvatarImage src={post.analyst.avatar} alt={post.analyst.name} />
                  <AvatarFallback>{post.analyst.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{post.analyst.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {post.analyst.institute} • <time dateTime={post.analyst.date}>{post.analyst.date}</time>
                  </p>
                </div>
              </div>
            )}
          </header>
          
          {post.candidates && post.candidates.length > 0 && (
            <section className="space-y-6 mb-8" aria-labelledby="vote-projection">
              <h2 id="vote-projection" className="text-xl font-semibold mb-4">Vote Share Projection</h2>
              <div className="space-y-4" role="list" aria-label="후보자별 득표율 예측">
                {post.candidates.map((candidate, index) => (
                  <div key={index} className="space-y-1" role="listitem">
                    <div className="flex justify-between">
                      <span className="font-medium">{candidate.name}</span>
                      <span className="font-medium" aria-label={`${candidate.percentage}퍼센트`}>
                        {candidate.percentage}%
                      </span>
                    </div>
                    <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${candidate.color}`} 
                        style={{ width: `${candidate.percentage}%` }}
                        role="progressbar"
                        aria-valuenow={candidate.percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${candidate.name} 득표율 ${candidate.percentage}%`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          
          <section 
            className="prose dark:prose-invert max-w-none mb-8"
            dangerouslySetInnerHTML={{ __html: post.content }}
            aria-labelledby="analysis-content"
          />
          
          <VoteButtons 
            postId={post.id} 
            initialVotes={post.votes} 
          />
        </div>
      </article>
      
      <section className="mt-12" aria-labelledby="comments-section">
        <CommentSection postId={post.id} />
      </section>
    </div>
  );
} 
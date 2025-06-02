"use client";

import { useState } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, Reply, MessageCircle, Loader2, ThumbsDown, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

// 댓글 타입 정의 (중첩 구조 지원)
interface Comment {
  id: string;
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  date: string;
  likes: number;
  dislikes?: number;
  userVote?: 'like' | 'dislike' | null;
  replies?: Comment[];
  createdAt?: string;
  authorId?: string;
  parentId?: string;
  depth?: number;
  isDeleted?: boolean;
}

interface CommentSectionProps {
  postId: string;
}

// API 페처 함수
const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) {
    throw new Error('댓글을 불러오는데 실패했습니다');
  }
  return res.json();
});

export default function CommentSection({ postId }: CommentSectionProps) {
  const { t } = useTranslation('common');
  const { data: session } = useSession();
  const { toast } = useToast();
  
  // SWR로 댓글 데이터 페칭 (중첩 구조 지원)
  const { data: commentsData, error, mutate, isLoading } = useSWR(
    `/api/comments/${postId}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  );
  
  const [newComment, setNewComment] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const comments = commentsData?.comments || [];
  const totalComments = commentsData?.total || 0;
  
  // 댓글 추가 함수 (최상위 댓글)
  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast({
        title: "입력 오류",
        description: "댓글 내용을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    if (!session) {
      toast({
        title: "로그인 필요",
        description: "댓글을 작성하려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/comments/${postId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment.trim(),
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setNewComment('');
        // SWR 데이터 재검증으로 새 댓글 즉시 반영
        await mutate();
        toast({
          title: "댓글 추가됨",
          description: "댓글이 성공적으로 작성되었습니다.",
        });
      } else {
        throw new Error(result.error || '댓글 작성에 실패했습니다');
      }
    } catch (error) {
      console.error('댓글 작성 오류:', error);
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "댓글 작성에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 답글 추가 함수 (실제 API 연동)
  const handleAddReply = async (parentCommentId: string) => {
    if (!replyContent.trim()) {
      toast({
        title: "입력 오류",
        description: "답글 내용을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }
    
    if (!session) {
      toast({
        title: "로그인 필요",
        description: "답글을 작성하려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/comments/${postId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: replyContent.trim(),
          parentId: parentCommentId,
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setReplyToId(null);
        setReplyContent('');
        // SWR 데이터 재검증으로 새 답글 즉시 반영
        await mutate();
        toast({
          title: "답글 추가됨",
          description: "답글이 성공적으로 작성되었습니다.",
        });
      } else {
        throw new Error(result.error || '답글 작성에 실패했습니다');
      }
    } catch (error) {
      console.error('답글 작성 오류:', error);
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "답글 작성에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 댓글 투표 함수 (좋아요/비추천)
  const handleVote = async (commentId: string, voteType: 'like' | 'dislike') => {
    if (!session) {
      toast({
        title: "로그인 필요",
        description: "투표하려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const response = await fetch(`/api/comments/${commentId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ voteType }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // SWR 데이터 재검증으로 투표 결과 즉시 반영
        await mutate();
        toast({
          title: "투표 완료",
          description: result.message,
        });
      } else {
        throw new Error(result.error || '투표 처리에 실패했습니다');
      }
    } catch (error) {
      console.error('투표 오류:', error);
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "투표 처리에 실패했습니다.",
        variant: "destructive",
      });
    }
  };
  
  // 댓글 삭제 함수
  const handleDeleteComment = async (commentId: string) => {
    if (!session) {
      toast({
        title: "로그인 필요",
        description: "댓글을 삭제하려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      return;
    }
    
    if (!confirm('정말로 이 댓글을 삭제하시겠습니까?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // SWR 데이터 재검증으로 삭제 결과 즉시 반영
        await mutate();
        toast({
          title: "삭제 완료",
          description: result.message,
        });
      } else {
        throw new Error(result.error || '댓글 삭제에 실패했습니다');
      }
    } catch (error) {
      console.error('댓글 삭제 오류:', error);
      toast({
        title: "오류",
        description: error instanceof Error ? error.message : "댓글 삭제에 실패했습니다.",
        variant: "destructive",
      });
    }
  };
  
  // 댓글 좋아요 함수 (기존 함수 제거 예정)
  const handleLike = async (commentId: string) => {
    await handleVote(commentId, 'like');
  };
  
  // 키보드 이벤트 핸들러
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      action();
    }
  };
  
  // 중첩 댓글 렌더링 함수
  const renderComment = (comment: Comment, depth: number = 0) => {
    const maxDepth = 5; // 최대 중첩 깊이
    const indentLevel = Math.min(depth, maxDepth);
    const marginLeft = indentLevel * 24; // 24px씩 들여쓰기
    
    return (
      <div 
        key={comment.id} 
        className="space-y-4" 
        style={{ marginLeft: `${marginLeft}px` }}
        role="listitem"
      >
        <div className="flex">
          <Avatar className={`${depth > 0 ? 'h-8 w-8' : 'h-10 w-10'} mr-4 flex-shrink-0`}>
            <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
            <AvatarFallback>{comment.author.name[0]}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className={`font-medium ${depth > 0 ? 'text-sm' : ''}`}>
                {comment.author.name}
              </span>
              <time 
                className={`text-muted-foreground ${depth > 0 ? 'text-xs' : 'text-sm'}`} 
                dateTime={comment.createdAt}
              >
                {comment.date}
              </time>
            </div>
            <p className={`mt-2 whitespace-pre-wrap break-words ${depth > 0 ? 'text-sm' : ''} ${comment.isDeleted ? 'text-muted-foreground italic' : ''}`}>
              {comment.content}
            </p>
            <div className="flex items-center space-x-4 mt-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`text-muted-foreground ${comment.userVote === 'like' ? 'text-blue-600 bg-blue-50' : ''}`}
                onClick={() => handleVote(comment.id, 'like')}
                aria-label={`댓글에 좋아요`}
                disabled={comment.isDeleted}
              >
                <ThumbsUp className={`${depth > 0 ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} aria-hidden="true" />
                <span className={depth > 0 ? 'text-xs' : 'text-sm'}>{comment.likes}</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className={`text-muted-foreground ${comment.userVote === 'dislike' ? 'text-red-600 bg-red-50' : ''}`}
                onClick={() => handleVote(comment.id, 'dislike')}
                aria-label={`댓글에 비추천`}
                disabled={comment.isDeleted}
              >
                <ThumbsDown className={`${depth > 0 ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} aria-hidden="true" />
                <span className={depth > 0 ? 'text-xs' : 'text-sm'}>{comment.dislikes || 0}</span>
              </Button>
              {session && depth < maxDepth && !comment.isDeleted && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-muted-foreground"
                  onClick={() => setReplyToId(replyToId === comment.id ? null : comment.id)}
                  aria-label="답글 작성"
                  aria-expanded={replyToId === comment.id}
                >
                  <Reply className={`${depth > 0 ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} aria-hidden="true" />
                  <span className={depth > 0 ? 'text-xs' : 'text-sm'}>답글</span>
                </Button>
              )}
              {session && session.user?.id === comment.authorId && !comment.isDeleted && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-muted-foreground hover:text-red-600"
                  onClick={() => handleDeleteComment(comment.id)}
                  aria-label="댓글 삭제"
                >
                  <Trash2 className={`${depth > 0 ? 'h-3 w-3' : 'h-4 w-4'} mr-1`} aria-hidden="true" />
                  <span className={depth > 0 ? 'text-xs' : 'text-sm'}>삭제</span>
                </Button>
              )}
            </div>
            
            {/* 답글 작성 폼 */}
            {replyToId === comment.id && session && (
              <div className="mt-4" role="region" aria-label="답글 작성">
                <label htmlFor={`reply-${comment.id}`} className="sr-only">
                  {comment.author.name}님에게 답글 작성
                </label>
                <Textarea
                  id={`reply-${comment.id}`}
                  placeholder={`${comment.author.name}님에게 답글을 작성해주세요...`}
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, () => handleAddReply(comment.id))}
                  className="mb-2"
                  disabled={isSubmitting}
                />
                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setReplyToId(null)}
                    disabled={isSubmitting}
                  >
                    취소
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => handleAddReply(comment.id)}
                    disabled={!replyContent.trim() || isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        작성 중...
                      </>
                    ) : (
                      '답글 작성'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* 중첩 답글들 렌더링 */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-4" role="list" aria-label="답글 목록">
            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };
  
  // 로딩 상태 표시
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-xl shadow-md p-6 md:p-8">
        <div className="flex items-center mb-6">
          <MessageCircle className="h-6 w-6 mr-2" aria-hidden="true" />
          <h2 className="text-2xl font-bold">{t('comments')}</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>댓글을 불러오는 중...</span>
        </div>
      </div>
    );
  }
  
  // 에러 상태 표시
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-xl shadow-md p-6 md:p-8">
        <h2 className="text-2xl font-bold mb-6">{t('comments')}</h2>
        <div className="text-center py-8 text-red-600" role="alert">
          <p className="mb-4">댓글을 불러오는데 실패했습니다.</p>
          <Button 
            onClick={() => mutate()} 
            variant="outline"
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            다시 시도
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-gray-950 rounded-xl shadow-md p-6 md:p-8">
      <div className="flex items-center mb-6">
        <MessageCircle className="h-6 w-6 mr-2" aria-hidden="true" />
        <h2 className="text-2xl font-bold">{t('comments')}</h2>
        <span className="ml-2 text-sm text-muted-foreground">
          ({totalComments})
        </span>
      </div>
      
      {/* 댓글 작성 폼 */}
      <div className="mb-8">
        {session ? (
          <div>
            <label htmlFor="new-comment" className="sr-only">
              새 댓글 작성
            </label>
            <Textarea
              id="new-comment"
              placeholder="댓글을 작성해주세요..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, handleAddComment)}
              className="mb-4 min-h-24"
              aria-describedby="comment-help"
              disabled={isSubmitting}
            />
            <div id="comment-help" className="text-sm text-muted-foreground mb-2">
              Ctrl+Enter로 빠르게 작성할 수 있습니다.
            </div>
            <Button 
              onClick={handleAddComment} 
              disabled={!newComment.trim() || isSubmitting}
              aria-label="댓글 작성"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  작성 중...
                </>
              ) : (
                '댓글 작성'
              )}
            </Button>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            댓글을 작성하려면 로그인이 필요합니다.
          </div>
        )}
      </div>
      
      <Separator className="my-6" />
      
      {/* 댓글 목록 */}
      {comments.length > 0 ? (
        <div className="space-y-8" role="list" aria-label="댓글 목록">
          {comments.map((comment: Comment) => renderComment(comment))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">아직 댓글이 없습니다</p>
          <p className="text-sm">첫 번째 댓글을 작성해보세요!</p>
        </div>
      )}
    </div>
  );
}
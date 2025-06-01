"use client";

import { useState } from 'react';
import useSWR from 'swr';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'react-i18next';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, Reply, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

// 댓글 타입 정의
interface Comment {
  id: string;
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  date: string;
  likes: number;
  replies?: Comment[];
}

interface CommentSectionProps {
  postId: string;
}

// API 페처 함수
const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function CommentSection({ postId }: CommentSectionProps) {
  const { t } = useTranslation('common');
  const { data: session } = useSession();
  const { toast } = useToast();
  
  // SWR로 댓글 데이터 페칭
  const { data: commentsData, error, mutate } = useSWR(
    `/api/comments/${postId}`,
    fetcher,
    {
      fallbackData: {
        comments: [
          {
            id: '1',
            author: {
              name: 'Min-ji Kim',
              avatar: '/avatars/user1.jpg',
            },
            content: 'This analysis seems thorough. I agree with the assessment that economic policies are driving the shift in voter sentiment.',
            date: '1 day ago',
            likes: 24,
            replies: [],
          },
          {
            id: '2',
            author: {
              name: 'Joon Park',
              avatar: '/avatars/user2.jpg',
            },
            content: 'I disagree with the margin prediction. I think it will be much closer based on recent events that weren\'t accounted for in this analysis.',
            date: '2 days ago',
            likes: 8,
            replies: [
              {
                id: '21',
                author: {
                  name: 'Su-jin Lee',
                  avatar: '/avatars/user3.jpg',
                },
                content: 'What recent events are you referring to? The analysis seems to cover most major developments.',
                date: '1 day ago',
                likes: 5,
              },
            ],
          },
        ]
      }
    }
  );
  
  const [newComment, setNewComment] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const comments = commentsData?.comments || [];
  
  // 댓글 추가 함수
  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    if (!session) {
      toast({
        title: "로그인 필요",
        description: t('comment.loginRequired'),
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
          content: newComment,
          userId: session.user?.id,
        }),
      });
      
      if (response.ok) {
        setNewComment('');
        mutate(); // SWR 데이터 재검증
        toast({
          title: "댓글 추가됨",
          description: "댓글이 성공적으로 작성되었습니다.",
        });
      } else {
        throw new Error('댓글 작성에 실패했습니다');
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "댓글 작성에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 답글 추가 함수
  const handleAddReply = async (commentId: string) => {
    if (!replyContent.trim()) return;
    
    if (!session) {
      toast({
        title: "로그인 필요",
        description: t('comment.loginRequired'),
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/comments/${postId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: replyContent,
          parentId: commentId,
          userId: session.user?.id,
        }),
      });
      
      if (response.ok) {
        setReplyToId(null);
        setReplyContent('');
        mutate(); // SWR 데이터 재검증
        toast({
          title: "답글 추가됨",
          description: "답글이 성공적으로 작성되었습니다.",
        });
      } else {
        throw new Error('답글 작성에 실패했습니다');
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "답글 작성에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 댓글 좋아요 함수
  const handleLike = async (commentId: string) => {
    if (!session) {
      toast({
        title: "로그인 필요",
        description: "좋아요를 누르려면 로그인이 필요합니다.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const response = await fetch(`/api/comments/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentId,
          userId: session.user?.id,
        }),
      });
      
      if (response.ok) {
        mutate(); // SWR 데이터 재검증
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "좋아요 처리에 실패했습니다.",
        variant: "destructive",
      });
    }
  };
  
  // 키보드 이벤트 핸들러
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      action();
    }
  };
  
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-950 rounded-xl shadow-md p-6 md:p-8">
        <h2 className="text-2xl font-bold mb-6">{t('comments')}</h2>
        <div className="text-center py-8 text-red-600" role="alert">
          댓글을 불러오는데 실패했습니다.
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
          ({comments.length})
        </span>
      </div>
      
      {/* 댓글 작성 폼 */}
      <div className="mb-8">
        {session ? (
          <div>
            <label htmlFor="new-comment" className="sr-only">
              {t('comment.add')}
            </label>
            <Textarea
              id="new-comment"
              placeholder={t('comment.placeholder')}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, handleAddComment)}
              className="mb-4 min-h-24"
              aria-describedby="comment-help"
            />
            <div id="comment-help" className="text-sm text-muted-foreground mb-2">
              Ctrl+Enter로 빠르게 작성할 수 있습니다.
            </div>
            <Button 
              onClick={handleAddComment} 
              disabled={!newComment.trim() || isSubmitting}
              aria-label={t('comment.post')}
            >
              {isSubmitting ? '작성 중...' : t('comment.post')}
            </Button>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            {t('comment.loginRequired')}
          </div>
        )}
      </div>
      
      <Separator className="my-6" />
      
      {/* 댓글 목록 */}
      <div className="space-y-8" role="list" aria-label="댓글 목록">
        {comments.map((comment: Comment) => (
          <div key={comment.id} className="space-y-4" role="listitem">
            <div className="flex">
              <Avatar className="h-10 w-10 mr-4">
                <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
                <AvatarFallback>{comment.author.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{comment.author.name}</span>
                  <time className="text-sm text-muted-foreground" dateTime={comment.date}>
                    {comment.date}
                  </time>
                </div>
                <p className="mt-2">{comment.content}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-muted-foreground"
                    onClick={() => handleLike(comment.id)}
                    aria-label={t('comment.like.aria')}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" aria-hidden="true" />
                    <span>{comment.likes}</span>
                  </Button>
                  {session && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-muted-foreground"
                      onClick={() => setReplyToId(replyToId === comment.id ? null : comment.id)}
                      aria-label={t('comment.reply.aria')}
                      aria-expanded={replyToId === comment.id}
                    >
                      <Reply className="h-4 w-4 mr-1" aria-hidden="true" />
                      <span>{t('comment.reply')}</span>
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
                      placeholder={t('comment.reply.placeholder')}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, () => handleAddReply(comment.id))}
                      className="mb-2"
                    />
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setReplyToId(null)}
                      >
                        {t('cancel')}
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleAddReply(comment.id)}
                        disabled={!replyContent.trim() || isSubmitting}
                      >
                        {isSubmitting ? '작성 중...' : t('comment.reply')}
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* 답글 목록 */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-4 ml-6 space-y-4" role="list" aria-label="답글 목록">
                    {comment.replies.map((reply: Comment) => (
                      <div key={reply.id} className="flex" role="listitem">
                        <Avatar className="h-8 w-8 mr-3">
                          <AvatarImage src={reply.author.avatar} alt={reply.author.name} />
                          <AvatarFallback>{reply.author.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{reply.author.name}</span>
                            <time className="text-xs text-muted-foreground" dateTime={reply.date}>
                              {reply.date}
                            </time>
                          </div>
                          <p className="mt-1 text-sm">{reply.content}</p>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-muted-foreground mt-1"
                            onClick={() => handleLike(reply.id)}
                            aria-label={`${reply.author.name}님의 답글에 좋아요`}
                          >
                            <ThumbsUp className="h-3 w-3 mr-1" aria-hidden="true" />
                            <span>{reply.likes}</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {comments.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          아직 댓글이 없습니다. 첫 번째 댓글을 작성해보세요!
        </div>
      )}
    </div>
  );
}
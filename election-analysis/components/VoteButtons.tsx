"use client";

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

type VoteButtonsProps = {
  postId: string;
  initialVotes: {
    up: number;
    down: number;
  };
};

export default function VoteButtons({ postId, initialVotes }: VoteButtonsProps) {
  const { t } = useTranslation('common');
  const [votes, setVotes] = useState(initialVotes);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const { toast } = useToast();
  
  const handleVote = async (voteType: 'up' | 'down') => {
    setIsVoting(true);
    
    try {
      const response = await fetch(`/api/vote/${postId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: voteType,
          userId: 'current-user-id', // 실제로는 세션에서 가져와야 함
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        
        if (userVote === voteType) {
          // 투표 취소
          setVotes(prev => ({
            ...prev,
            [voteType]: prev[voteType] - 1
          }));
          setUserVote(null);
          toast({
            title: "투표 취소됨",
            description: "투표가 취소되었습니다.",
          });
        } else {
          // 새로운 투표 또는 투표 변경
          const newVotes = { ...votes };
          
          if (userVote) {
            // 기존 투표 제거
            newVotes[userVote] = newVotes[userVote] - 1;
          }
          
          // 새 투표 추가
          newVotes[voteType] = newVotes[voteType] + 1;
          
          setVotes(newVotes);
          setUserVote(voteType);
          toast({
            title: "투표 완료",
            description: voteType === 'up' ? "이 분석을 추천했습니다." : "이 분석을 비추천했습니다.",
          });
        }
      } else {
        throw new Error('투표 처리에 실패했습니다');
      }
    } catch (error) {
      toast({
        title: "오류",
        description: "투표 처리에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  };
  
  return (
    <div className="flex items-center space-x-4 border-t border-gray-200 dark:border-gray-800 pt-6">
      <span className="text-sm font-medium">{t('vote.helpful')}</span>
      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          className={`flex items-center ${userVote === 'up' ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' : ''}`}
          onClick={() => handleVote('up')}
          disabled={isVoting}
          aria-label={t('vote.like.aria')}
          aria-pressed={userVote === 'up'}
        >
          <ThumbsUp className="mr-1 h-4 w-4" aria-hidden="true" />
          <span>{t('like')}</span>
          <span className="ml-2 text-muted-foreground" aria-label={`${votes.up}개의 추천`}>
            {votes.up}
          </span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={`flex items-center ${userVote === 'down' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' : ''}`}
          onClick={() => handleVote('down')}
          disabled={isVoting}
          aria-label={t('vote.dislike.aria')}
          aria-pressed={userVote === 'down'}
        >
          <ThumbsDown className="mr-1 h-4 w-4" aria-hidden="true" />
          <span>{t('dislike')}</span>
          <span className="ml-2 text-muted-foreground" aria-label={`${votes.down}개의 비추천`}>
            {votes.down}
          </span>
        </Button>
      </div>
    </div>
  );
}
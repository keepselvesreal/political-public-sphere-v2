"use client";

import React, { useState } from 'react';
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

// React.memo로 성능 최적화 - props가 변경되지 않으면 리렌더링 방지
const VoteButtons = React.memo(function VoteButtons({ 
  postId, 
  initialVotes 
}: VoteButtonsProps) {
  const { t } = useTranslation('common');
  const { toast } = useToast();
  const [votes, setVotes] = useState(initialVotes);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  // 투표 처리 함수
  const handleVote = async (type: 'up' | 'down') => {
    if (isVoting) return;

    setIsVoting(true);
    try {
      const response = await fetch(`/api/analysis-contest/vote/${postId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'temp-user-id', // 실제로는 세션에서 가져와야 함
          type,
        }),
      });

      if (!response.ok) {
        throw new Error('투표에 실패했습니다');
      }

      const result = await response.json();
      
      // 이전 투표 취소 처리
      if (userVote === type) {
        // 같은 버튼을 다시 클릭한 경우 (투표 취소)
        setVotes(prev => ({
          ...prev,
          [type]: prev[type] - 1
        }));
        setUserVote(null);
        toast({
          title: "투표가 취소되었습니다",
          duration: 2000,
        });
      } else {
        // 새로운 투표 또는 투표 변경
        setVotes(prev => {
          const newVotes = { ...prev };
          if (userVote) {
            // 이전 투표가 있었다면 감소
            newVotes[userVote] = newVotes[userVote] - 1;
          }
          // 새로운 투표 증가
          newVotes[type] = newVotes[type] + 1;
          return newVotes;
        });
        setUserVote(type);
        toast({
          title: type === 'up' ? "추천했습니다" : "비추천했습니다",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('투표 오류:', error);
      toast({
        title: "투표에 실패했습니다",
        description: "다시 시도해주세요",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <Button
        variant={userVote === 'up' ? 'default' : 'outline'}
        size="sm"
        onClick={() => handleVote('up')}
        disabled={isVoting}
        className="flex items-center space-x-2"
        aria-label={`추천 (현재 ${votes.up}개)`}
      >
        <ThumbsUp className="h-4 w-4" />
        <span>{votes.up}</span>
      </Button>
      
      <Button
        variant={userVote === 'down' ? 'default' : 'outline'}
        size="sm"
        onClick={() => handleVote('down')}
        disabled={isVoting}
        className="flex items-center space-x-2"
        aria-label={`비추천 (현재 ${votes.down}개)`}
      >
        <ThumbsDown className="h-4 w-4" />
        <span>{votes.down}</span>
      </Button>
    </div>
  );
});

export default VoteButtons;
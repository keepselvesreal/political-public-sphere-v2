"use client";

import { useState } from 'react';
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
  const [votes, setVotes] = useState(initialVotes);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const { toast } = useToast();
  
  const handleVote = async (voteType: 'up' | 'down') => {
    // In a real app, this would be an API call
    try {
      if (userVote === voteType) {
        // User is un-voting
        setVotes(prev => ({
          ...prev,
          [voteType]: prev[voteType] - 1
        }));
        setUserVote(null);
        toast({
          title: "Vote removed",
          description: "Your vote has been removed.",
        });
      } else {
        // User is voting or changing vote
        const newVotes = { ...votes };
        
        if (userVote) {
          // Remove previous vote
          newVotes[userVote] = newVotes[userVote] - 1;
        }
        
        // Add new vote
        newVotes[voteType] = newVotes[voteType] + 1;
        
        setVotes(newVotes);
        setUserVote(voteType);
        toast({
          title: "Vote recorded",
          description: voteType === 'up' ? "You upvoted this analysis." : "You downvoted this analysis.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to register your vote. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="flex items-center space-x-4 border-t border-gray-200 dark:border-gray-800 pt-6">
      <span className="text-sm font-medium">Was this analysis helpful?</span>
      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          className={`flex items-center ${userVote === 'up' ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' : ''}`}
          onClick={() => handleVote('up')}
        >
          <ThumbsUp className="mr-1 h-4 w-4" />
          <span>추천</span>
          <span className="ml-2 text-muted-foreground">{votes.up}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={`flex items-center ${userVote === 'down' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' : ''}`}
          onClick={() => handleVote('down')}
        >
          <ThumbsDown className="mr-1 h-4 w-4" />
          <span>비추천</span>
          <span className="ml-2 text-muted-foreground">{votes.down}</span>
        </Button>
      </div>
    </div>
  );
}
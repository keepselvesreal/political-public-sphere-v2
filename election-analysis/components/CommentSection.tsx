"use client";

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, Reply } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

// Mock comments data
const MOCK_COMMENTS = [
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
];

type CommentSectionProps = {
  postId: string;
};

export default function CommentSection({ postId }: CommentSectionProps) {
  const [comments, setComments] = useState(MOCK_COMMENTS);
  const [newComment, setNewComment] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const { toast } = useToast();
  
  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    // In a real app, this would be an API call
    const comment = {
      id: Date.now().toString(),
      author: {
        name: 'Current User',
        avatar: '/avatars/current-user.jpg',
      },
      content: newComment,
      date: 'Just now',
      likes: 0,
      replies: [],
    };
    
    setComments([comment, ...comments]);
    setNewComment('');
    toast({
      title: "Comment added",
      description: "Your comment has been posted successfully.",
    });
  };
  
  const handleAddReply = (commentId: string) => {
    if (!replyContent.trim()) return;
    
    // In a real app, this would be an API call
    const reply = {
      id: Date.now().toString(),
      author: {
        name: 'Current User',
        avatar: '/avatars/current-user.jpg',
      },
      content: replyContent,
      date: 'Just now',
      likes: 0,
    };
    
    const updatedComments = comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), reply],
        };
      }
      return comment;
    });
    
    setComments(updatedComments);
    setReplyToId(null);
    setReplyContent('');
    toast({
      title: "Reply added",
      description: "Your reply has been posted successfully.",
    });
  };
  
  const handleLike = (commentId: string) => {
    // In a real app, this would be an API call
    const updatedComments = comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          likes: comment.likes + 1,
        };
      }
      
      if (comment.replies) {
        const updatedReplies = comment.replies.map(reply => {
          if (reply.id === commentId) {
            return {
              ...reply,
              likes: reply.likes + 1,
            };
          }
          return reply;
        });
        
        return {
          ...comment,
          replies: updatedReplies,
        };
      }
      
      return comment;
    });
    
    setComments(updatedComments);
  };
  
  return (
    <div className="bg-white dark:bg-gray-950 rounded-xl shadow-md p-6 md:p-8">
      <h2 className="text-2xl font-bold mb-6">Comments</h2>
      
      <div className="mb-8">
        <Textarea
          placeholder="Add your comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="mb-4 min-h-24"
        />
        <Button onClick={handleAddComment} disabled={!newComment.trim()}>
          Post Comment
        </Button>
      </div>
      
      <Separator className="my-6" />
      
      <div className="space-y-8">
        {comments.map((comment) => (
          <div key={comment.id} className="space-y-4">
            <div className="flex">
              <Avatar className="h-10 w-10 mr-4">
                <AvatarImage src={comment.author.avatar} alt={comment.author.name} />
                <AvatarFallback>{comment.author.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{comment.author.name}</span>
                  <span className="text-sm text-muted-foreground">{comment.date}</span>
                </div>
                <p className="mt-2">{comment.content}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-muted-foreground"
                    onClick={() => handleLike(comment.id)}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1" />
                    <span>{comment.likes}</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-muted-foreground"
                    onClick={() => setReplyToId(replyToId === comment.id ? null : comment.id)}
                  >
                    <Reply className="h-4 w-4 mr-1" />
                    <span>Reply</span>
                  </Button>
                </div>
                
                {replyToId === comment.id && (
                  <div className="mt-4">
                    <Textarea
                      placeholder="Write a reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      className="mb-2"
                    />
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setReplyToId(null)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => handleAddReply(comment.id)}
                        disabled={!replyContent.trim()}
                      >
                        Reply
                      </Button>
                    </div>
                  </div>
                )}
                
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-4 ml-6 space-y-4">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="flex">
                        <Avatar className="h-8 w-8 mr-3">
                          <AvatarImage src={reply.author.avatar} alt={reply.author.name} />
                          <AvatarFallback>{reply.author.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{reply.author.name}</span>
                            <span className="text-xs text-muted-foreground">{reply.date}</span>
                          </div>
                          <p className="mt-1 text-sm">{reply.content}</p>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-muted-foreground mt-1"
                            onClick={() => handleLike(reply.id)}
                          >
                            <ThumbsUp className="h-3 w-3 mr-1" />
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
    </div>
  );
}
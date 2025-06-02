"use client";

import { useState, useEffect } from 'react';
import PostCard from './PostCard';
import { Skeleton } from '@/components/ui/skeleton';

// Mock data for the initial implementation
const MOCK_POSTS = [
  {
    id: '1',
    predictedWinner: 'Lee Jae-myung',
    marginPercentage: 7,
    mainQuote: 'Government judgment outweighed fear of criminals.',
    candidates: [
      { name: 'Lee Jae-myung', percentage: 52, color: 'bg-blue-500' },
      { name: 'Kim Moon-soo', percentage: 41, color: 'bg-red-500' },
      { name: 'Lee Jun-seok', percentage: 9, color: 'bg-green-500' },
      { name: 'Kwon Young-guk', percentage: 9, color: 'bg-purple-500' },
    ],
    tags: ['30s independents', 'approval rating shift'],
    analyst: {
      name: 'Dr. Kim Analysis',
      avatar: '/avatars/analyst1.jpg',
      institute: 'Political Research Center',
      date: 'Dec 15, 2024',
    },
  },
  {
    id: '2',
    predictedWinner: 'Kim Moon-soo',
    marginPercentage: 3,
    mainQuote: 'Economic concerns drive conservative shift among voters.',
    candidates: [
      { name: 'Kim Moon-soo', percentage: 48, color: 'bg-red-500' },
      { name: 'Lee Jae-myung', percentage: 45, color: 'bg-blue-500' },
      { name: 'Lee Jun-seok', percentage: 7, color: 'bg-green-500' },
      { name: 'Kwon Young-guk', percentage: 5, color: 'bg-purple-500' },
    ],
    tags: ['economic anxiety', 'suburban voters'],
    analyst: {
      name: 'Prof. Park Institute',
      avatar: '/avatars/analyst2.jpg',
      institute: 'Economic Policy Institute',
      date: 'Dec 14, 2024',
    },
  },
  {
    id: '3',
    predictedWinner: 'Lee Jae-myung',
    marginPercentage: 12,
    mainQuote: 'Youth turnout surge favors progressive candidate.',
    candidates: [
      { name: 'Lee Jae-myung', percentage: 56, color: 'bg-blue-500' },
      { name: 'Kim Moon-soo', percentage: 34, color: 'bg-red-500' },
      { name: 'Lee Jun-seok', percentage: 10, color: 'bg-green-500' },
      { name: 'Kwon Young-guk', percentage: 8, color: 'bg-purple-500' },
    ],
    tags: ['youth turnout', 'climate policy'],
    analyst: {
      name: 'Seoul Polling Center',
      avatar: '/avatars/analyst3.jpg',
      institute: 'Demographics Research',
      date: 'Dec 13, 2024',
    },
  },
];

export default function PostCardGrid() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Simulate data fetching
  useEffect(() => {
    const fetchPosts = async () => {
      // In a real app, this would be an API call
      setTimeout(() => {
        setPosts(MOCK_POSTS);
        setLoading(false);
      }, 1000);
    };
    
    fetchPosts();
  }, []);
  
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          id={post.id}
          predictedWinner={post.predictedWinner}
          marginPercentage={post.marginPercentage}
          mainQuote={post.mainQuote}
          candidates={post.candidates}
          tags={post.tags}
          analyst={post.analyst}
        />
      ))}
    </div>
  );
}
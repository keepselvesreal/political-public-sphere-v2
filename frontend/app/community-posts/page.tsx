/*
목차:
- 정치 마실?! 커뮤니티 메인 페이지
- 일상적인 정치 이야기 공간
- 커뮤니티별 섹션으로 게시글 표시
- 메트릭 기반 필터링
*/

"use client";

import React, { useState, useEffect } from 'react';
import { CommunityPostList } from '@/components/community-posts/community-post-list';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// 커뮤니티 게시글 타입 정의
interface CommunityPost {
  _id: string;
  post_id: string;
  community: string;
  site: string;
  title: string;
  author: string;
  created_at: string;
  views: number;
  likes: number;
  dislikes: number;
  comments_count: number;
  url?: string;
  category: string;
  likes_per_view?: number;
  comments_per_view?: number;
  views_per_exposure_hour?: number;
}

// 메트릭별 데이터 타입
interface MetricData {
  likesPerView: CommunityPost[];
  commentsPerView: CommunityPost[];
  viewsPerHour: CommunityPost[];
}

export default function CommunityPosts() {
  const [data, setData] = useState<MetricData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 메트릭별 데이터 가져오기
  const fetchMetricData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 각 메트릭별로 상위 게시글 가져오기
      const [likesResponse, commentsResponse, viewsResponse] = await Promise.all([
        fetch('/api/community-posts?sortBy=likes&order=desc&limit=50'),
        fetch('/api/community-posts?sortBy=comments_count&order=desc&limit=50'),
        fetch('/api/community-posts?sortBy=views&order=desc&limit=50')
      ]);

      if (!likesResponse.ok || !commentsResponse.ok || !viewsResponse.ok) {
        throw new Error('데이터를 불러오는데 실패했습니다.');
      }

      const [likesData, commentsData, viewsData] = await Promise.all([
        likesResponse.json(),
        commentsResponse.json(),
        viewsResponse.json()
      ]);

      // 메트릭 계산 및 정렬
      const calculateMetrics = (posts: CommunityPost[]) => {
        return posts.map(post => ({
          ...post,
          likes_per_view: post.views > 0 ? post.likes / post.views : 0,
          comments_per_view: post.views > 0 ? post.comments_count / post.views : 0,
          views_per_exposure_hour: (() => {
            const hoursFromCreation = (Date.now() - new Date(post.created_at).getTime()) / (1000 * 60 * 60);
            return hoursFromCreation > 0 ? post.views / hoursFromCreation : 0;
          })()
        }));
      };

      const likesPerViewPosts = calculateMetrics(likesData.data)
        .sort((a, b) => (b.likes_per_view || 0) - (a.likes_per_view || 0))
        .slice(0, 30);

      const commentsPerViewPosts = calculateMetrics(commentsData.data)
        .sort((a, b) => (b.comments_per_view || 0) - (a.comments_per_view || 0))
        .slice(0, 30);

      const viewsPerHourPosts = calculateMetrics(viewsData.data)
        .sort((a, b) => (b.views_per_exposure_hour || 0) - (a.views_per_exposure_hour || 0))
        .slice(0, 30);

      setData({
        likesPerView: likesPerViewPosts,
        commentsPerView: commentsPerViewPosts,
        viewsPerHour: viewsPerHourPosts
      });

    } catch (error) {
      console.error('데이터 로딩 실패:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetricData();
  }, []);

  // 로딩 상태
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            정치 마실?!
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            일상적인 정치 이야기를 편안하게 나누는 커뮤니티 공간입니다.
          </p>
        </div>
        
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">커뮤니티 게시글을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            정치 마실?!
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            일상적인 정치 이야기를 편안하게 나누는 커뮤니티 공간입니다.
          </p>
        </div>
        
        <div className="text-center bg-red-50 dark:bg-red-950/20 rounded-lg p-8 mb-8">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2">
            데이터 로딩 실패
          </h2>
          <p className="text-red-600 dark:text-red-300 mb-4">
            {error}
          </p>
          <Button onClick={fetchMetricData} variant="outline">
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  // 데이터가 없는 경우
  if (!data) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            정치 마실?!
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            일상적인 정치 이야기를 편안하게 나누는 커뮤니티 공간입니다.
          </p>
        </div>
        
        <div className="text-center bg-gray-50 dark:bg-gray-900 rounded-lg p-12">
          <h2 className="text-2xl font-bold mb-4">📝 게시글이 없습니다</h2>
          <p className="text-gray-600 dark:text-gray-300">
            아직 커뮤니티 게시글이 없습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* 헤더 섹션 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          정치 마실?!
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          일상적인 정치 이야기를 편안하게 나누는 커뮤니티 공간입니다.
        </p>
      </div>

      {/* 커뮤니티 게시글 목록 */}
      <CommunityPostList 
        likesPerView={data.likesPerView}
        commentsPerView={data.commentsPerView}
        viewsPerHour={data.viewsPerHour}
      />
    </div>
  );
} 
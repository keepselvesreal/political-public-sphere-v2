/*
목차:
- 정치 마실?! 커뮤니티 메인 페이지
- 일상적인 정치 이야기 공간
- 커뮤니티 게시글 목록
- 편안한 토론 환경
*/

"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle } from 'lucide-react';
import { CommunityPostList } from '@/components/community-posts/community-post-list';

interface CommunityData {
  likesPerView: any[];
  commentsPerView: any[];
  viewsPerHour: any[];
}

export default function CommunityPosts() {
  const [communityData, setCommunityData] = useState<CommunityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataInitialized, setDataInitialized] = useState(false);

  // 더미 데이터 생성 함수
  const createDummyData = async () => {
    try {
      console.log('더미 데이터 생성 시작...');
      const response = await fetch('/api/community-posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'create_dummy_data' }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('더미 데이터 생성 성공:', result.message);
        setDataInitialized(true);
        return true;
      } else {
        console.error('더미 데이터 생성 실패:', result.error);
        return false;
      }
    } catch (error) {
      console.error('더미 데이터 생성 중 오류:', error);
      return false;
    }
  };

  // 커뮤니티 데이터 로딩 함수
  const loadCommunityData = async () => {
    try {
      console.log('커뮤니티 데이터 로딩 시작...');
      const response = await fetch('/api/community-posts?metric=all&limit=10');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log('커뮤니티 데이터 로딩 성공:', result.data);
        setCommunityData(result.data);
        setError(null);
      } else {
        throw new Error(result.error || '데이터 로딩 실패');
      }
    } catch (error) {
      console.error('커뮤니티 데이터 로딩 실패:', error);
      setError(error instanceof Error ? error.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  };

  // 초기 데이터 설정 및 로딩
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      
      // 먼저 데이터 로딩 시도
      await loadCommunityData();
      
      // 데이터가 없으면 더미 데이터 생성 후 다시 로딩
      if (!communityData || (
        communityData.likesPerView.length === 0 && 
        communityData.commentsPerView.length === 0 && 
        communityData.viewsPerHour.length === 0
      )) {
        console.log('데이터가 없어서 더미 데이터 생성 시도...');
        const created = await createDummyData();
        if (created) {
          // 더미 데이터 생성 후 다시 로딩
          await loadCommunityData();
        }
      }
    };

    initializeData();
  }, []);

  // 수동 데이터 새로고침
  const handleRefresh = async () => {
    setLoading(true);
    await loadCommunityData();
  };

  // 더미 데이터 재생성
  const handleCreateDummyData = async () => {
    setLoading(true);
    const created = await createDummyData();
    if (created) {
      await loadCommunityData();
    } else {
      setLoading(false);
    }
  };

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

      {/* 로딩 상태 */}
      {loading && (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">커뮤니티 게시글을 불러오는 중...</p>
        </div>
      )}

      {/* 에러 상태 */}
      {error && !loading && (
        <div className="text-center bg-red-50 dark:bg-red-950/20 rounded-lg p-8 mb-8">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2">
            데이터 로딩 실패
          </h2>
          <p className="text-red-600 dark:text-red-300 mb-4">
            {error}
          </p>
          <div className="space-x-4">
            <Button onClick={handleRefresh} variant="outline">
              다시 시도
            </Button>
            <Button onClick={handleCreateDummyData} variant="default">
              더미 데이터 생성
            </Button>
          </div>
        </div>
      )}

      {/* 커뮤니티 게시글 목록 */}
      {communityData && !loading && !error && (
        <div className="space-y-8">
          <div className="flex justify-end items-center">
            <div className="space-x-2">
              <Button onClick={handleRefresh} variant="outline" size="sm">
                새로고침
              </Button>
              <Button onClick={handleCreateDummyData} variant="secondary" size="sm">
                더미 데이터 재생성
              </Button>
            </div>
          </div>
          
          <CommunityPostList
            likesPerView={communityData.likesPerView}
            commentsPerView={communityData.commentsPerView}
            viewsPerHour={communityData.viewsPerHour}
          />
        </div>
      )}

      {/* 데이터가 없는 경우 */}
      {!loading && !error && communityData && 
       communityData.likesPerView.length === 0 && 
       communityData.commentsPerView.length === 0 && 
       communityData.viewsPerHour.length === 0 && (
        <div className="text-center bg-gray-50 dark:bg-gray-900 rounded-lg p-12">
          <h2 className="text-2xl font-bold mb-4">📝 게시글이 없습니다</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            아직 커뮤니티 게시글이 없습니다. 더미 데이터를 생성해보세요.
          </p>
          <Button onClick={handleCreateDummyData}>
            더미 데이터 생성하기
          </Button>
        </div>
      )}
    </div>
  );
} 
"use client";

/*
스크래퍼 실험용 페이지 (API 자동 연동)

주요 기능:
- ScraperExperimentPage: 메인 페이지 컴포넌트 (line 50-500)
- loadDataFromAPI: API에서 최신 스크래핑 데이터 자동 로드 (line 80-120)
- useEffect: 페이지 로드 시 자동 데이터 로드 및 주기적 갱신 (line 120-140)
- renderPostList: 게시글 목록 렌더링 (line 140-220)
- renderPostDetail: 선택된 게시글 상세 렌더링 (line 220-270)
- validateScrapedData: 데이터 검증 (line 270-320)

작성자: AI Assistant
작성일: 2025년 6월 4일 16:25 (KST)
수정일: 2025년 6월 4일 16:40 (KST)
목적: 스크래퍼 결과 데이터의 실시간 자동 연동 및 재현
*/

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Eye, 
  Heart, 
  MessageCircle, 
  AlertCircle, 
  CheckCircle,
  ArrowLeft,
  ExternalLink,
  Settings,
  RefreshCw,
  Zap
} from "lucide-react";
import { ExperimentalPostDetailRenderer } from "@/components/community-posts/experimental-post-detail";

// 스크래퍼 결과 데이터 타입 (실험용 컴포넌트와 동일)
interface ScrapedPostData {
  post_id: string;
  post_url: string;
  scraped_at: string;
  metadata: {
    title: string;
    category: string;
    author: string;
    date: string;
    view_count: number;
    up_count: number;
    down_count: number;
    comment_count: number;
  };
  content: Array<{
    type: 'image' | 'text' | 'video';
    order: number;
    data: any;
  }>;
  comments: Array<{
    comment_id: string;
    author: string;
    content: string;
    date: string;
    media: any[];
    level: number;
    is_reply: boolean;
    parent_comment_id: string;
    up_count: number;
    down_count: number;
  }>;
}

export default function ScraperExperimentPage() {
  const [scrapedData, setScrapedData] = useState<ScrapedPostData[]>([]);
  const [selectedPost, setSelectedPost] = useState<ScrapedPostData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // 데이터 검증 함수
  const validateScrapedData = (data: any): data is ScrapedPostData[] => {
    if (!Array.isArray(data)) {
      if (typeof data === 'object' && data !== null) {
        data = [data];
      } else {
        return false;
      }
    }

    return data.every((item: any) => {
      return (
        typeof item === 'object' &&
        item !== null &&
        typeof item.post_id === 'string' &&
        typeof item.post_url === 'string' &&
        typeof item.metadata === 'object' &&
        Array.isArray(item.content) &&
        Array.isArray(item.comments)
      );
    });
  };

  // API에서 데이터 로드
  const loadDataFromAPI = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/scraper-data');
      
      if (!response.ok) {
        throw new Error(`API 응답 오류: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        if (validateScrapedData(result.data)) {
          setScrapedData(result.data);
          setLastUpdated(new Date().toLocaleString('ko-KR'));
          console.log('API에서 데이터 로드됨:', result.data);
        } else {
          setError('API에서 받은 데이터 형식이 올바르지 않습니다.');
        }
      } else {
        setError('API에서 데이터를 가져올 수 없습니다.');
      }
    } catch (error) {
      setError('데이터 로드 실패: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // 페이지 로드 시 자동 데이터 로드
  useEffect(() => {
    loadDataFromAPI();
    
    // 30초마다 자동 갱신
    const interval = setInterval(loadDataFromAPI, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // 게시글 목록 렌더링
  const renderPostList = () => {
    if (isLoading && scrapedData.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <RefreshCw className="w-16 h-16 mx-auto text-blue-500 mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              스크래핑 데이터 로딩 중...
            </h3>
            <p className="text-gray-500">
              최신 스크래핑 결과를 가져오고 있습니다.
            </p>
          </CardContent>
        </Card>
      );
    }

    if (scrapedData.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              스크래핑 데이터가 없습니다
            </h3>
            <p className="text-gray-500 mb-6">
              스크래퍼를 실행하면 자동으로 데이터가 표시됩니다.
            </p>
            <Button 
              onClick={loadDataFromAPI}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-500" />
              실시간 스크래핑 데이터 ({scrapedData.length}개)
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={loadDataFromAPI}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>
          {lastUpdated && (
            <p className="text-sm text-gray-500">
              마지막 업데이트: {lastUpdated}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {scrapedData.map((post, index) => (
              <div
                key={post.post_id || index}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedPost?.post_id === post.post_id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedPost(post)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-2">
                      {post.metadata?.title || `게시글 #${post.post_id}`}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-2">
                      <span>작성자: {post.metadata?.author || '정보 없음'}</span>
                      {post.metadata?.category && (
                        <Badge variant="secondary" className="text-xs">
                          {post.metadata.category}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {post.metadata?.view_count?.toLocaleString() || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart className="w-3 h-3" />
                        {post.metadata?.up_count?.toLocaleString() || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        {post.metadata?.comment_count?.toLocaleString() || 0}
                      </span>
                      <span className="text-xs">
                        콘텐츠: {post.content?.length || 0}개
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <a
                      href={post.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3 h-3" />
                      원본
                    </a>
                    <span className="text-xs text-gray-400">
                      ID: {post.post_id}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // 선택된 게시글 상세 렌더링
  const renderPostDetail = () => {
    if (!selectedPost) {
      return (
        <Card>
          <CardContent className="text-center py-12">
            <Eye className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              게시글을 선택하세요
            </h3>
            <p className="text-gray-500">
              왼쪽 목록에서 게시글을 클릭하면 실험용 재현 화면이 표시됩니다.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <ExperimentalPostDetailRenderer
        postData={selectedPost}
        showMetadata={true}
        showDebugInfo={showDebugInfo}
        onBack={() => setSelectedPost(null)}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                스크래퍼 실험실 (실시간 연동)
              </h1>
              <p className="text-gray-600">
                스크래퍼 실행 시 자동으로 데이터가 연동되어 실시간으로 재현됩니다.
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDebugInfo(!showDebugInfo)}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                {showDebugInfo ? '디버그 숨기기' : '디버그 보기'}
              </Button>
            </div>
          </div>
        </div>

        {/* 상태 표시 */}
        {error && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {scrapedData.length > 0 && (
          <Card className="mb-8 border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">
                  {scrapedData.length}개의 게시글이 실시간으로 연동되었습니다.
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 메인 콘텐츠 */}
        {selectedPost ? (
          // 게시글 상세 보기 모드
          <div>
            <Button
              variant="outline"
              onClick={() => setSelectedPost(null)}
              className="mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              목록으로 돌아가기
            </Button>
            {renderPostDetail()}
          </div>
        ) : (
          // 목록 보기 모드
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 게시글 목록 */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                실시간 게시글 목록
              </h2>
              {renderPostList()}
            </div>

            {/* 미리보기/안내 */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                게시글 미리보기
              </h2>
              {renderPostDetail()}
            </div>
          </div>
        )}

        {/* 사용법 안내 */}
        {scrapedData.length === 0 && !isLoading && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>실시간 연동 사용법</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Zap className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-medium mb-2">1. 스크래퍼 실행</h3>
                  <p className="text-sm text-gray-600">
                    터미널에서 스크래퍼를 실행하면 자동으로 데이터가 연동됩니다.
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <RefreshCw className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-medium mb-2">2. 자동 갱신</h3>
                  <p className="text-sm text-gray-600">
                    30초마다 자동으로 최신 데이터를 확인하고 갱신합니다.
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Eye className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-medium mb-2">3. 실시간 재현</h3>
                  <p className="text-sm text-gray-600">
                    게시글을 선택하여 원본과 재현된 게시글을 실시간으로 비교하세요.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">스크래퍼 실행 명령어</h4>
                <code className="text-sm text-blue-800 bg-blue-100 px-2 py-1 rounded">
                  venv/bin/python run_scraper_experiment.py
                </code>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 
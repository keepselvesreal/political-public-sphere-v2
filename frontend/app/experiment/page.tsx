"use client";

/*
스크래핑 데이터 전송 기반 실험 페이지

주요 기능:
- 스크래핑 데이터 전송 버튼 (line 30-80)
- 게시글 목록 및 재현 기능 (line 82-150)
- ExperimentPage: 메인 실험 페이지 컴포넌트 (line 152-300)

작성자: AI Assistant
작성일: 2025년 6월 4일 22:42 (KST)
목적: 스크래핑 데이터를 직접 전송하여 게시글 재현 실험
*/

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Database, 
  FileText, 
  Eye, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw,
  Zap,
  ArrowLeft 
} from "lucide-react";
import { ExperimentalPostDetailRenderer } from "@/components/community-posts/experimental-post-detail";

// CommunityPostData와 호환되는 타입 정의
interface ExperimentResult {
  post_id: string;
  post_url: string;
  scraped_at: string;
  metadata: {
    title?: string;
    author?: string;
    date?: string;
    category?: string;
    view_count?: number;
    up_count?: number;
    down_count?: number;
    comment_count?: number;
    // CommunityPostData 호환성을 위한 추가 필드
    like_count?: number;
    dislike_count?: number;
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
    // CommunityPostData 호환성을 위한 필수 필드들
    created_at: string;
    like_count: number;
    dislike_count: number;
    is_best: boolean;
    // 선택적 필드들
    up_count?: number;
    down_count?: number;
    level?: number;
    is_reply?: boolean;
    parent_comment_id?: string;
    images?: string[];
    index?: number;
    parent_comment?: string;
    vote_count?: number;
    blame_count?: number;
    is_author?: boolean;
    image_url?: string;
    image_link?: string;
    video_url?: string;
    video_autoplay?: boolean;
    video_loop?: boolean;
    video_muted?: boolean;
  }>;
  experiment_purpose?: string;
  error?: string;
}

interface ExperimentData {
  experiment_info: {
    purpose: string;
    start_time: string;
    end_time: string;
    total_count: number;
    summary: {
      successful_count: number;
      failed_count: number;
      success_rate: number;
    };
  };
  results: ExperimentResult[];
}

// 데이터 변환 함수 (ExperimentResult를 ScrapedPostData로 변환)
const transformToCompatibleData = (result: ExperimentResult): ExperimentResult => {
  return {
    ...result,
    metadata: {
      ...result.metadata,
      // 필수 필드들 보장
      title: result.metadata?.title || `게시글 #${result.post_id}`,
      category: result.metadata?.category || "",
      author: result.metadata?.author || "정보 없음",
      date: result.metadata?.date || new Date().toISOString(),
      view_count: result.metadata?.view_count || 0,
      up_count: result.metadata?.up_count || 0,
      down_count: result.metadata?.down_count || 0,
      comment_count: result.metadata?.comment_count || 0,
    },
    content: result.content || [],
    comments: (result.comments || []).map(comment => ({
      ...comment,
      // 필수 필드들 보장
      comment_id: comment.comment_id || `comment_${Date.now()}`,
      author: comment.author || "익명",
      content: comment.content || "",
      date: comment.date || comment.created_at || new Date().toISOString(),
      media: (comment as any).media || [],
      level: comment.level || 1,
      is_reply: comment.is_reply || false,
      parent_comment_id: comment.parent_comment_id || "",
      up_count: comment.up_count || 0,
      down_count: comment.down_count || 0,
    }))
  };
};

export default function ExperimentPage() {
  const [experimentData, setExperimentData] = useState<ExperimentData | null>(null);
  const [selectedPost, setSelectedPost] = useState<ExperimentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // 스크래핑 데이터 전송 함수
  const loadScrapingData = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/scraping-data');
      
      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || '데이터 로드 실패');
      }

      // 스크래핑 데이터를 실험 데이터 형식으로 변환
      const experimentData: ExperimentData = {
        experiment_info: {
          purpose: "scraping_data_transmission_experiment",
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          total_count: data.data.length,
          summary: {
            successful_count: data.data.length,
            failed_count: 0,
            success_rate: 100.0
          }
        },
        results: data.data
      };

      setExperimentData(experimentData);
      setSelectedPost(null);
      setSuccess(`${data.data.length}개의 게시글 데이터를 성공적으로 로드했습니다.`);
      
    } catch (error) {
      setError(`데이터 로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 게시글 선택
  const selectPost = (post: ExperimentResult) => {
    // 호환성을 위한 데이터 변환
    const compatiblePost = transformToCompatibleData(post);
    setSelectedPost(compatiblePost);
  };

  // 데이터 새로고침
  const refreshData = () => {
    setExperimentData(null);
    setSelectedPost(null);
    setError('');
    setSuccess('');
  };

  // 선택된 게시글이 있으면 렌더러 표시
  if (selectedPost) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-4">
          <Button 
            variant="outline" 
            onClick={() => setSelectedPost(null)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            실험 목록으로 돌아가기
          </Button>
          <ExperimentalPostDetailRenderer 
            postData={selectedPost as any} 
            onBack={() => setSelectedPost(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">🧪 스크래핑 데이터 전송 실험</h1>
          <p className="text-muted-foreground">
            서버에 저장된 스크래핑 데이터를 직접 전송하여 게시글을 재현하는 실험을 진행합니다.
          </p>
        </div>

        {/* 스크래핑 데이터 전송 영역 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              스크래핑 데이터 전송
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <Button 
                  onClick={loadScrapingData}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  {isLoading ? '데이터 로딩 중...' : '스크래핑 데이터 전송'}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={refreshData}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  새로고침
                </Button>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <div className="text-sm text-muted-foreground">
                <p>💡 스크래핑 데이터 전송 방법:</p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li><strong>데이터 전송:</strong> 위의 "스크래핑 데이터 전송" 버튼 클릭</li>
                  <li><strong>자동 로드:</strong> 서버의 scraping/data 폴더에서 최신 데이터 자동 로드</li>
                  <li><strong>게시글 선택:</strong> 로드된 게시글 목록에서 재현할 게시글 선택</li>
                  <li><strong>실시간 재현:</strong> 원본과 동일한 구조로 게시글 재현</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 실험 결과 표시 */}
        {experimentData && (
          <div className="space-y-6">
            {/* 실험 정보 */}
            <Card>
              <CardHeader>
                <CardTitle>실험 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">실험 목적</p>
                    <p className="font-medium">{experimentData.experiment_info.purpose}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">총 게시글 수</p>
                    <p className="font-medium">{experimentData.experiment_info.total_count}개</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">성공률</p>
                    <p className="font-medium text-green-600">
                      {experimentData.experiment_info.summary.success_rate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">성공/실패</p>
                    <p className="font-medium">
                      <span className="text-green-600">{experimentData.experiment_info.summary.successful_count}</span>
                      /
                      <span className="text-red-600">{experimentData.experiment_info.summary.failed_count}</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 게시글 목록 */}
            <Card>
              <CardHeader>
                <CardTitle>게시글 목록</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {experimentData.results.map((result, index) => (
                    <div 
                      key={result.post_id || index}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                        result.error ? 'border-red-200 bg-red-50' : 'border-border'
                      }`}
                      onClick={() => !result.error && selectPost(result)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={result.error ? "destructive" : "default"}>
                              {result.error ? '실패' : '성공'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              ID: {result.post_id}
                            </span>
                          </div>
                          
                          <h3 className="font-medium mb-2">
                            {result.metadata?.title || `게시글 #${result.post_id}`}
                          </h3>
                          
                          <div className="text-sm text-muted-foreground mb-2">
                            <p>작성자: {result.metadata?.author || '정보 없음'}</p>
                            <p>작성일: {result.metadata?.date || '정보 없음'}</p>
                            <p>URL: <a 
                              href={result.post_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="underline hover:no-underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {result.post_url}
                            </a></p>
                          </div>

                          {result.error ? (
                            <p className="text-sm text-red-600">오류: {result.error}</p>
                          ) : (
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              <span>콘텐츠: {result.content?.length || 0}개</span>
                              <span>댓글: {result.comments?.length || 0}개</span>
                              <span>조회수: {result.metadata?.view_count?.toLocaleString() || 0}</span>
                              <span>추천: {result.metadata?.like_count || 0}</span>
                            </div>
                          )}
                        </div>
                        
                        {!result.error && (
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            재현하기
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 도움말 */}
        {!experimentData && !isLoading && (
          <Card>
            <CardHeader>
              <CardTitle>💡 실험 진행 방법</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">1. 스크래핑 데이터 전송</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    위의 "스크래핑 데이터 전송" 버튼을 클릭하여 서버에 저장된 최신 스크래핑 데이터를 로드하세요.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">2. 게시글 재현</h4>
                  <p className="text-sm text-muted-foreground">
                    로드된 게시글 목록에서 재현하고 싶은 게시글을 선택하면 원본과 동일한 구조로 재현됩니다.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">3. 실시간 업데이트</h4>
                  <p className="text-sm text-muted-foreground">
                    새로운 스크래핑 데이터가 생성되면 "새로고침" 버튼을 클릭하여 최신 데이터를 확인할 수 있습니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 
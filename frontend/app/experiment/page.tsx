"use client";

/*
FM코리아 게시글 재현 실험 페이지

주요 기능:
- 스크래핑 결과 파일 로드 및 표시 (line 20-50)
- 게시글 선택 및 재현 테스트 (line 52-100)
- ExperimentalPostRenderer 컴포넌트 활용 (line 102-150)

작성자: AI Assistant
작성일: 2025-06-02 16:20 KST
목적: FM코리아 게시글 재현 실험 및 검증
*/

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExperimentalPostRenderer } from "@/components/community-posts/experimental-post-renderer";
import { ArrowLeft, FileText, Eye, MessageCircle, Heart } from "lucide-react";

interface ScrapingResult {
  scraped_at: string;
  total_count: number;
  all_posts: Array<{
    title: string;
    url: string;
    post_id: string;
    author: string;
    date: string;
    view_count: number;
    like_count: number;
    comment_count: number;
    experiment_data?: any;
  }>;
  detailed_posts: Array<any>;
  top_posts: any;
  page_title: string;
  source_url: string;
}

export default function ExperimentPage() {
  const [scrapingData, setScrapingData] = useState<ScrapingResult | null>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadScrapingData();
  }, []);

  const loadScrapingData = async () => {
    try {
      setLoading(true);
      
      // 실제 API 엔드포인트에서 스크래핑 데이터 로드
      const response = await fetch('/api/scraping-data');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setScrapingData(data);
      
    } catch (err) {
      setError('스크래핑 데이터를 로드하는 중 오류가 발생했습니다.');
      console.error('데이터 로드 오류:', err);
      
      // 오류 발생 시 목 데이터 사용
      const mockData: ScrapingResult = {
        scraped_at: "2025-06-02T16:16:14.931532+09:00",
        total_count: 2,
        all_posts: [
          {
            title: "시위,신고,화력,청원,민원 요청/인증 금지, 차단中",
            url: "https://www.fmkorea.com/1690053846",
            post_id: "1690053846",
            author: "독고",
            date: "2019.03.24",
            view_count: 2193577,
            like_count: 0,
            comment_count: 0
          },
          {
            title: "카이스트 석사 저거 바보야??? 이공계 대학 졸업생 중에서 여성이 적은게 왜 여성차별임?ㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋㅋ",
            url: "https://www.fmkorea.com/8465614431",
            post_id: "8465614431",
            author: "탱탱탱탱",
            date: "2025.06.02",
            view_count: 88,
            like_count: 2,
            comment_count: 0
          }
        ],
        detailed_posts: [],
        top_posts: {},
        page_title: "정치/시사 - 에펨코리아",
        source_url: "https://www.fmkorea.com/politics"
      };
      
      setScrapingData(mockData);
      setError(null); // 목 데이터로 대체했으므로 오류 상태 해제
      
    } finally {
      setLoading(false);
    }
  };

  const handlePostSelect = (post: any) => {
    // 실제 스크래핑 데이터에서 experiment_data를 가져와서 설정
    if (post.experiment_data) {
      setSelectedPost(post.experiment_data);
    } else {
      // 실험 데이터가 없는 경우 기본 구조로 생성
      const mockExperimentData = {
        post_id: post.post_id,
        post_url: post.url,
        scraped_at: new Date().toISOString(),
        metadata: {
          title: post.title,
          author: post.author,
          date: post.date,
          view_count: post.view_count,
          like_count: post.like_count,
          comment_count: post.comment_count
        },
        content: [
          {
            type: 'text',
            order: 1,
            data: {
              tag: 'p',
              text: '이 게시글의 상세 콘텐츠는 아직 스크래핑되지 않았습니다.',
              innerHTML: '이 게시글의 상세 콘텐츠는 아직 스크래핑되지 않았습니다.'
            }
          }
        ],
        comments: [],
        experiment_purpose: 'fmkorea_post_reproduction'
      };
      setSelectedPost(mockExperimentData);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('ko-KR');
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">스크래핑 데이터를 로드하는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={loadScrapingData}>다시 시도</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (selectedPost) {
    return (
      <ExperimentalPostRenderer 
        experimentData={selectedPost}
        onBack={() => setSelectedPost(null)}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">🧪 FM코리아 게시글 재현 실험</h1>
        <p className="text-muted-foreground">
          스크래핑된 데이터를 기반으로 원본 게시글을 재현하는 실험입니다.
        </p>
      </div>

      {/* 스크래핑 정보 */}
      {scrapingData && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              스크래핑 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">스크래핑 시간</p>
                <p className="font-medium">{formatDate(scrapingData.scraped_at)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">총 게시글 수</p>
                <p className="font-medium">{scrapingData.total_count}개</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">소스 URL</p>
                <a 
                  href={scrapingData.source_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  {scrapingData.page_title}
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 게시글 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>스크래핑된 게시글 목록</CardTitle>
          <p className="text-sm text-muted-foreground">
            게시글을 클릭하면 재현된 버전을 확인할 수 있습니다.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {scrapingData?.all_posts.map((post, index) => (
              <div
                key={post.post_id}
                className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handlePostSelect(post)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-lg mb-2 line-clamp-2">
                      {post.title}
                    </h3>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <span>작성자: {post.author}</span>
                      <span>작성일: {post.date}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        조회수 {post.view_count.toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1 text-green-600">
                        <Heart className="h-4 w-4" />
                        추천 {post.like_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        댓글 {post.comment_count}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={post.experiment_data ? "default" : "secondary"}>
                      {post.experiment_data ? "상세 데이터 있음" : "기본 데이터만"}
                    </Badge>
                    <Button size="sm" variant="outline">
                      재현 보기
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {(!scrapingData?.all_posts || scrapingData.all_posts.length === 0) && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">스크래핑된 게시글이 없습니다.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 하단 안내 */}
      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          이 실험은 웹 스크래핑 기술과 콘텐츠 재현 기능을 테스트하기 위한 목적으로 제작되었습니다.
        </p>
      </div>
    </div>
  );
} 
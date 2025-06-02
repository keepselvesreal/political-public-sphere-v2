"use client";

/*
FM코리아 실험 페이지

주요 기능:
- 실험 결과 파일 업로드 기능 (line 30-80)
- 게시글 선택 및 재현 기능 (line 82-150)
- ExperimentPage: 메인 실험 페이지 컴포넌트 (line 152-300)

작성자: AI Assistant
작성일: 2025-05-29 17:00 KST
목적: FM코리아 게시글 재현 실험 인터페이스
*/

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, Eye, Download, AlertCircle } from "lucide-react";
import { CommunityPostDetailRenderer } from "@/components/community-posts/community-post-detail";

interface ExperimentResult {
  post_id: string;
  post_url: string;
  scraped_at: string;
  metadata: {
    title?: string;
    author?: string;
    date?: string;
    category?: string;
    stats?: string[];
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
  }>;
  experiment_purpose: string;
  error?: string;
}

interface ExperimentData {
  experiment_info: {
    purpose: string;
    start_time: string;
    end_time: string;
    test_urls: string[];
    total_count: number;
    summary: {
      successful_count: number;
      failed_count: number;
      success_rate: number;
    };
  };
  results: ExperimentResult[];
}

export default function ExperimentPage() {
  const [experimentData, setExperimentData] = useState<ExperimentData | null>(null);
  const [selectedPost, setSelectedPost] = useState<ExperimentResult | null>(null);
  const [uploadError, setUploadError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 파일 업로드 처리
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setUploadError('');

    try {
      const text = await file.text();
      const data = JSON.parse(text) as ExperimentData;

      // 데이터 유효성 검사
      if (!data.experiment_info || !data.results || !Array.isArray(data.results)) {
        throw new Error('잘못된 실험 데이터 형식입니다.');
      }

      setExperimentData(data);
      setSelectedPost(null);
    } catch (error) {
      setUploadError(`파일 로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 파일 업로드 트리거
  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  // 게시글 선택
  const selectPost = (post: ExperimentResult) => {
    setSelectedPost(post);
  };

  // 샘플 데이터 로드
  const loadSampleData = () => {
    const sampleData = {
      "experiment_info": {
        "purpose": "fmkorea_post_reproduction_experiment",
        "start_time": "2025-05-30T15:32:59.832662+09:00",
        "end_time": "2025-05-30T15:33:46.543342+09:00",
        "test_urls": [
          "https://www.fmkorea.com/8449897319",
          "https://www.fmkorea.com/index.php?mid=politics&sort_index=pop&order_type=desc&document_srl=8450144891&listStyle=webzine",
          "https://www.fmkorea.com/index.php?mid=politics&sort_index=pop&order_type=desc&document_srl=8450210459&listStyle=webzine",
          "https://www.fmkorea.com/8446245274"
        ],
        "total_count": 4,
        "summary": {
          "successful_count": 4,
          "failed_count": 0,
          "success_rate": 100.0
        }
      },
      "results": [
        {
          "post_id": "8449897319",
          "post_url": "https://www.fmkorea.com/8449897319",
          "scraped_at": "2025-05-30T15:33:03.975009+09:00",
          "metadata": {
            "title": "준석이 유세차",
            "author": "풉키스츠",
            "date": "2025.05.30 11:51",
            "view_count": 235,
            "like_count": 3,
            "dislike_count": 0,
            "comment_count": 2,
            "category": "자유"
          },
          "content": [
            {
              "type": "image",
              "order": 1,
              "data": {
                "src": "https://image.fmkorea.com/files/attach/new5/20250530/8449897319_4180795_99b983892094b5c6d2fc3736e15da7d1.jpeg",
                "width": "1280",
                "height": "1707",
                "style": "margin-bottom:2px;",
                "alt": "준석이 유세차",
                "class": "auto_insert",
                "title": "",
                "href": "https://image.fmkorea.com/files/attach/new5/20250530/8449897319_4180795_99b983892094b5c6d2fc3736e15da7d1.jpeg",
                "link_class": "highslide highslide-move",
                "link_rel": "highslide"
              }
            },
            {
              "type": "image",
              "order": 2,
              "data": {
                "src": "https://image.fmkorea.com/files/attach/new5/20250530/8449897319_4180795_8afb706a6202ad913e4b4f51e5700876.jpeg",
                "width": "1280",
                "height": "1707",
                "style": "margin-bottom:2px;",
                "alt": "준석이 유세차",
                "class": "auto_insert",
                "title": "",
                "href": "https://image.fmkorea.com/files/attach/new5/20250530/8449897319_4180795_8afb706a6202ad913e4b4f51e5700876.jpeg",
                "link_class": "highslide highslide-move",
                "link_rel": "highslide"
              }
            },
            {
              "type": "image",
              "order": 3,
              "data": {
                "src": "https://image.fmkorea.com/files/attach/new5/20250530/8449897319_4180795_57eabd69be84278612b67f935f26a18c.jpeg",
                "width": "1280",
                "height": "1707",
                "style": "margin-bottom:2px;",
                "alt": "준석이 유세차",
                "class": "auto_insert",
                "title": "",
                "href": "https://image.fmkorea.com/files/attach/new5/20250530/8449897319_4180795_57eabd69be84278612b67f935f26a18c.jpeg",
                "link_class": "highslide highslide-move",
                "link_rel": "highslide"
              }
            },
            {
              "type": "text",
              "order": 4,
              "data": {
                "tag": "p",
                "text": "이거 볼려고 점심시간 15분 일찍 나왔다",
                "id": "pi__3667584354_3483273",
                "class": "pi__3667584354_3483273",
                "style": "",
                "innerHTML": "이거 볼려고 점심시간 15분 일찍 나왔다"
              }
            }
          ],
          "comments": [
            {
              "comment_id": "comment_8449929143",
              "author": "아스날두산딮기팬",
              "content": "여기어디에요?",
              "date": "3 시간 전",
              "level": 0,
              "is_reply": false,
              "parent_comment": "",
              "vote_count": 0,
              "blame_count": 0
            },
            {
              "comment_id": "comment_8449947465",
              "author": "풉키스츠",
              "content": "아스날두산딮기팬 국채보상공원 종각네거리 쪽 이요",
              "date": "3 시간 전",
              "level": 1,
              "is_reply": true,
              "parent_comment": "아스날두산딮기팬",
              "vote_count": 0,
              "blame_count": 0
            }
          ],
          "experiment_purpose": "fmkorea_post_reproduction"
        },
        {
          "post_id": "8450210459",
          "post_url": "https://www.fmkorea.com/index.php?mid=politics&sort_index=pop&order_type=desc&document_srl=8450210459&listStyle=webzine",
          "scraped_at": "2025-05-30T15:33:20.892095+09:00",
          "metadata": {
            "title": "82년생이 이준석을 지지하게된 이유",
            "author": "퍼스트펭수",
            "date": "2025.05.30 13:15",
            "view_count": 45012,
            "like_count": 230,
            "dislike_count": 0,
            "comment_count": 43,
            "category": "자유"
          },
          "content": [
            {
              "type": "image",
              "order": 1,
              "data": {
                "src": "https://image.fmkorea.com/files/attach/new5/20250530/8450210459_4180795_64ad15f95e364c701127d99972f5e006.png",
                "width": "800",
                "height": "600",
                "style": "",
                "alt": "image.png 82년생이 이준석을 지지하게된 이유",
                "class": "",
                "title": ""
              }
            },
            {
              "type": "text",
              "order": 2,
              "data": {
                "tag": "p",
                "text": "노회찬의 정의당",
                "id": "",
                "class": "",
                "style": "",
                "innerHTML": "노회찬의 정의당&nbsp;"
              }
            }
          ],
          "comments": [],
          "experiment_purpose": "fmkorea_post_reproduction"
        },
        {
          "post_id": "8446245274",
          "post_url": "https://www.fmkorea.com/8446245274",
          "scraped_at": "2025-05-30T15:33:28.933+09:00",
          "metadata": {
            "title": "실시간 이준석 유세 고대 인파",
            "author": "인생삽질",
            "date": "22 시간 전",
            "view_count": 59658,
            "like_count": 322,
            "dislike_count": 10,
            "comment_count": 29,
            "category": "자유"
          },
          "content": [
            {
              "type": "video",
              "order": 1,
              "data": {
                "src": "https://video.fmkorea.com/sample_video.mp4",
                "controls": true,
                "autoplay": false,
                "muted": false,
                "loop": false
              }
            },
            {
              "type": "text",
              "order": 2,
              "data": {
                "tag": "p",
                "text": "고대 앞 인파가 장난 아니네요",
                "id": "",
                "class": "",
                "style": "",
                "innerHTML": "고대 앞 인파가 장난 아니네요"
              }
            }
          ],
          "comments": [],
          "experiment_purpose": "fmkorea_post_reproduction"
        }
      ]
    };

    setExperimentData(sampleData as ExperimentData);
    setSelectedPost(null);
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
            ← 실험 목록으로 돌아가기
          </Button>
          <CommunityPostDetailRenderer 
            postData={selectedPost} 
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
          <h1 className="text-3xl font-bold mb-2">🧪 게시글 재현 실험 (FM코리아 & 루리웹)</h1>
          <p className="text-muted-foreground">
            스크래핑된 데이터를 기반으로 원본 게시글을 재현하는 실험을 진행합니다.
          </p>
        </div>

        {/* 파일 업로드 영역 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              실험 데이터 업로드
            </CardTitle>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <Button 
                  onClick={triggerFileUpload}
                  disabled={isLoading}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  {isLoading ? '로딩 중...' : 'JSON 파일 업로드'}
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={loadSampleData}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  샘플 데이터 로드
                </Button>
              </div>

              {uploadError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{uploadError}</AlertDescription>
                </Alert>
              )}

              <div className="text-sm text-muted-foreground">
                <p>💡 실험 데이터 생성 방법:</p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li><strong>FM코리아:</strong> <code>cd scripts && python test_experiment_scraper.py</code> 실행</li>
                  <li><strong>루리웹:</strong> <code>cd scripts && python test_ruliweb_experiment_scraper.py</code> 실행</li>
                  <li>생성된 <code>experiments/results/</code> 폴더의 JSON 파일 업로드</li>
                  <li>게시글 목록에서 재현할 게시글 선택</li>
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
                    <p className="text-sm text-muted-foreground">총 URL 수</p>
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
        {!experimentData && (
          <Card>
            <CardHeader>
              <CardTitle>💡 실험 진행 방법</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">1. 실험 데이터 생성</h4>
                  <p className="text-sm text-muted-foreground mb-2">PowerShell에서 다음 명령어를 실행하여 스크래핑 데이터를 생성하세요:</p>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">FM코리아:</p>
                      <code className="block p-2 bg-muted rounded text-sm">
                        cd scripts; python test_experiment_scraper.py
                      </code>
                    </div>
                    <div>
                      <p className="text-sm font-medium">루리웹:</p>
                      <code className="block p-2 bg-muted rounded text-sm">
                        cd scripts; python test_ruliweb_experiment_scraper.py
                      </code>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">2. 결과 파일 업로드</h4>
                  <p className="text-sm text-muted-foreground">
                    <code>experiments/results/</code> 폴더에 생성된 JSON 파일을 위의 업로드 버튼으로 업로드하세요.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">3. 게시글 재현</h4>
                  <p className="text-sm text-muted-foreground">
                    업로드된 데이터에서 재현하고 싶은 게시글을 선택하면 원본과 동일한 구조로 재현됩니다.
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
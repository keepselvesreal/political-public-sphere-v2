"use client";

/*
실험용 커뮤니티 게시글 상세 렌더링 컴포넌트 (스크래퍼 데이터 최적화)

주요 기능:
- ExperimentalPostDetailRenderer: 스크래퍼 데이터 기반 최적화된 게시글 렌더링 (line 120-700)
- renderContent: 콘텐츠 순서대로 렌더링 (line 145-170)
- renderImage: 이미지 콘텐츠 렌더링 (개선된 fallback 처리) (line 170-280)
- renderText: 텍스트 콘텐츠 렌더링 (line 280-340)
- renderVideo: 동영상 콘텐츠 렌더링 (line 340-380)
- renderComments: 댓글 렌더링 (개선된 미디어 처리) (line 380-550)
- renderMetadata: 메타데이터 렌더링 (line 550-650)

작성자: AI Assistant
작성일: 2025년 6월 4일 16:20 (KST)
목적: 스크래퍼 결과 데이터의 원본 재현도 최대화
*/

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Eye, ExternalLink, ArrowLeft, AlertCircle, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";
import Image from "next/image";

// 스크래퍼 결과 데이터 타입 정의 (최신 구조 반영)
interface ScrapedPostContent {
  type: 'image' | 'text' | 'video';
  order: number;
  data: {
    // 공통 속성
    src?: string;
    href?: string;
    width?: string | number;
    height?: string | number;
    alt?: string;
    
    // 텍스트 속성
    text?: string;
    
    // 동영상 속성
    autoplay?: boolean;
    muted?: boolean;
  };
}

// 스크래퍼 결과 댓글 타입 정의
interface ScrapedPostComment {
  comment_id: string;
  author: string;
  content: string;
  date: string;
  media: Array<{
    type: 'image' | 'video';
    order: number;
    data: {
      src: string;
      href?: string;
      alt?: string;
      width?: string;
      height?: string;
      autoplay?: boolean;
      muted?: boolean;
    };
  }>;
  level: number;
  is_reply: boolean;
  parent_comment_id: string;
  up_count: number;
  down_count: number;
}

// 스크래퍼 결과 게시글 데이터 타입
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
  content: ScrapedPostContent[];
  comments: ScrapedPostComment[];
}

interface ExperimentalPostDetailRendererProps {
  postData: ScrapedPostData;
  showMetadata?: boolean;
  showDebugInfo?: boolean;
  onBack?: () => void;
}

export function ExperimentalPostDetailRenderer({ 
  postData, 
  showMetadata = true,
  showDebugInfo = false,
  onBack
}: ExperimentalPostDetailRendererProps) {
  
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  
  // 날짜 포맷팅 (스크래퍼 결과에 최적화)
  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return '날짜 없음';
      
      // ISO 형식 처리
      if (dateString.includes('T')) {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return formatDistanceToNow(date, { 
            addSuffix: true, 
            locale: ko 
          });
        }
      }
      
      // 기타 형식 그대로 표시
      return dateString;
    } catch {
      return dateString;
    }
  };

  const formatNumber = (num: number | undefined) => {
    if (num === undefined || num === null) return '0';
    return num.toLocaleString('ko-KR');
  };

  // 콘텐츠를 순서대로 렌더링
  const renderContent = () => {
    if (!postData.content || postData.content.length === 0) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
          <p className="text-muted-foreground mb-4">콘텐츠를 찾을 수 없습니다.</p>
          <p className="text-sm text-muted-foreground">
            이 게시글은 텍스트 콘텐츠가 없거나 스크래핑되지 않았을 수 있습니다.
          </p>
          {postData.post_url && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-4"
              onClick={() => window.open(postData.post_url, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              원본 게시글 보기
            </Button>
          )}
        </div>
      );
    }

    // 순서대로 정렬
    const sortedContent = [...postData.content].sort((a, b) => a.order - b.order);

    return sortedContent.map((content, index) => {
      switch (content.type) {
        case 'image':
          return renderImage(content, index);
        case 'text':
          return renderText(content, index);
        case 'video':
          return renderVideo(content, index);
        default:
          return null;
      }
    });
  };

  // 이미지 콘텐츠 렌더링 (개선된 에러 처리)
  const renderImage = (content: ScrapedPostContent, index: number) => {
    const { data } = content;
    
    if (!data || !data.src) return null;

    const imageKey = `${index}-${data.src}`;
    const hasError = imageErrors.has(imageKey);

    const handleImageError = () => {
      setImageErrors(prev => new Set(prev).add(imageKey));
    };

    if (hasError) {
      return (
        <div 
          key={`image-error-${index}`}
          className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500 mx-auto mb-4"
          style={{ maxWidth: '600px' }}
        >
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <div className="text-sm">
            <p>이미지를 불러올 수 없습니다</p>
            <p className="text-xs mt-1 text-gray-400">{data.alt || '이미지'}</p>
            <p className="text-xs mt-1 text-gray-400 break-all">{data.src}</p>
          </div>
        </div>
      );
    }

    const imageElement = (
      <img
        key={`image-${index}`}
        src={data.src}
        alt={data.alt || ''}
        style={{ 
          width: '100%',
          maxWidth: '600px',
          height: 'auto',
          marginBottom: '16px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          display: 'block'
        }}
        className="mx-auto"
        onError={handleImageError}
      />
    );

    // 링크가 있는 경우 링크로 감싸기
    if (data.href) {
      return (
        <a
          key={`image-link-${index}`}
          href={data.href}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {imageElement}
        </a>
      );
    }

    return imageElement;
  };

  // 텍스트 콘텐츠 렌더링
  const renderText = (content: ScrapedPostContent, index: number) => {
    const { data } = content;
    
    if (!data || !data.text) return null;

    return (
      <div
        key={`text-${index}`}
        className="mb-4 text-gray-800 leading-relaxed"
        style={{ 
          fontSize: '16px',
          lineHeight: '1.6',
          wordBreak: 'break-word'
        }}
      >
        {data.text.split('\n').map((line, lineIndex) => (
          <p key={lineIndex} className={lineIndex > 0 ? 'mt-2' : ''}>
            {line || '\u00A0'} {/* 빈 줄은 공백으로 표시 */}
          </p>
        ))}
      </div>
    );
  };

  // 동영상 콘텐츠 렌더링
  const renderVideo = (content: ScrapedPostContent, index: number) => {
    const { data } = content;
    
    if (!data || !data.src) return null;

    return (
      <div key={`video-${index}`} className="text-center mb-4">
        <video
          src={data.src}
          autoPlay={data.autoplay || false}
          muted={data.muted !== false} // 기본값 true
          controls={true}
          style={{ 
            width: '100%',
            maxWidth: '600px',
            height: 'auto',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}
          className="mx-auto"
          playsInline
        />
      </div>
    );
  };

  // 댓글 렌더링 (개선된 미디어 처리)
  const renderComments = () => {
    if (!postData.comments || postData.comments.length === 0) {
      return null;
    }

    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            댓글 {postData.comments.length}개
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {postData.comments.map((comment, index) => {
            const level = comment.level || 0;
            const marginLeft = Math.max(0, (level - 1) * 20); // 레벨 1부터 들여쓰기
            
            return (
              <div 
                key={comment.comment_id || index} 
                className={`border-l-2 pl-4 rounded-lg p-3 mb-2 ${
                  comment.is_reply 
                    ? 'border-blue-200 bg-blue-50' 
                    : 'border-gray-200 bg-gray-50'
                }`}
                style={{ marginLeft: `${marginLeft}px` }}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {/* 대댓글 표시 */}
                      {comment.is_reply && (
                        <span className="text-blue-500 text-sm">↳</span>
                      )}
                      
                      {/* 작성자 */}
                      <span className="font-medium text-sm">
                        {comment.author || '익명'}
                      </span>
                      
                      {/* 작성시간 */}
                      <span className="text-gray-500 text-xs">
                        {formatDate(comment.date)}
                      </span>
                    </div>
                    
                    {/* 댓글 미디어들 */}
                    {comment.media && comment.media.length > 0 && (
                      <div className="mb-2 space-y-2">
                        {comment.media
                          .sort((a, b) => a.order - b.order)
                          .map((media, mediaIndex) => (
                            <div key={mediaIndex}>
                              {media.type === 'image' ? (
                                <img 
                                  src={media.data.src} 
                                  alt={media.data.alt || `댓글 이미지 ${mediaIndex + 1}`} 
                                  className="max-w-full h-auto rounded border"
                                  style={{ maxHeight: '300px' }}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <video 
                                  src={media.data.src}
                                  className="max-w-full h-auto rounded border"
                                  style={{ maxHeight: '300px' }}
                                  autoPlay={media.data.autoplay || false}
                                  muted={media.data.muted !== false}
                                  playsInline
                                  controls
                                />
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                    
                    {/* 댓글 내용 */}
                    {comment.content && (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">
                        {comment.content}
                      </p>
                    )}
                    
                    {/* 추천/비추천 */}
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      {comment.up_count > 0 && (
                        <span className="flex items-center space-x-1">
                          <span>👍</span>
                          <span>{comment.up_count}</span>
                        </span>
                      )}
                      {comment.down_count > 0 && (
                        <span className="flex items-center space-x-1">
                          <span>👎</span>
                          <span>{comment.down_count}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    );
  };

  // 메타데이터 렌더링
  const renderMetadata = () => {
    if (!showMetadata) return null;

    return (
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">
                {postData.metadata?.title || `게시글 #${postData.post_id}`}
              </CardTitle>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <span>작성자: {postData.metadata?.author || '정보 없음'}</span>
                {postData.metadata?.date && (
                  <span>작성일: {formatDate(postData.metadata.date)}</span>
                )}
                {postData.metadata?.category && (
                  <Badge variant="secondary">{postData.metadata.category}</Badge>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-4 text-sm">
                  {/* 조회수 */}
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    조회수 {formatNumber(postData.metadata?.view_count)}
                  </span>
                  {/* 추천수 */}
                  <span className="flex items-center gap-1 text-green-600">
                    <Heart className="h-4 w-4" />
                    추천 {formatNumber(postData.metadata?.up_count)}
                  </span>
                  {/* 댓글수 */}
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MessageCircle className="h-4 w-4" />
                    댓글 {formatNumber(postData.metadata?.comment_count)}
                  </span>
                </div>
              </div>
            </div>

            {/* 원본 링크 */}
            <div className="mt-4">
              <a
                href={postData.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                원본 보기
              </a>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  };

  // 디버그 정보 렌더링
  const renderDebugInfo = () => {
    if (!showDebugInfo) return null;

    return (
      <Card className="mb-6 border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-sm text-yellow-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            디버그 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-yellow-700">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p><strong>게시글 ID:</strong> {postData.post_id}</p>
              <p><strong>스크래핑 시간:</strong> {formatDate(postData.scraped_at)}</p>
              <p><strong>콘텐츠 요소 수:</strong> {postData.content?.length || 0}</p>
            </div>
            <div>
              <p><strong>댓글 수:</strong> {postData.comments?.length || 0}</p>
              <p><strong>이미지 오류 수:</strong> {imageErrors.size}</p>
              <p><strong>원본 URL:</strong> <a href={postData.post_url} target="_blank" className="text-blue-600 hover:underline break-all">{postData.post_url}</a></p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* 뒤로가기 버튼 */}
      {onBack && (
        <Button 
          variant="outline" 
          onClick={onBack}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          목록으로 돌아가기
        </Button>
      )}

      {/* 디버그 정보 */}
      {renderDebugInfo()}

      {/* 메타데이터 */}
      {renderMetadata()}

      {/* 게시글 본문 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="prose max-w-none">
            {renderContent()}
          </div>
        </CardContent>
      </Card>

      {/* 댓글 */}
      {renderComments()}

      {/* 하단 네비게이션 */}
      <div className="mt-8 text-center">
        {onBack ? (
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            목록으로 돌아가기
          </Button>
        ) : (
          <Link href="/">
            <Button variant="outline">
              메인으로 돌아가기
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
} 
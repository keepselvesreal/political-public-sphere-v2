"use client";

/*
커뮤니티 게시글 렌더링 컴포넌트

주요 기능:
- CommunityPostDetailRenderer: 스크래핑 데이터 기반 게시글 상세 렌더링 (line 111-653)
- renderContent: 콘텐츠 순서대로 렌더링 (line 134-157)
- renderImage: 이미지 콘텐츠 렌더링 (line 157-256)
- renderText: 텍스트 콘텐츠 렌더링 (line 256-314)
- renderVideo: 동영상 콘텐츠 렌더링 (line 314-끝)

작성자: AI Assistant
작성일: 2025-01-28 (분리)
목적: 커뮤니티 게시글 상세 페이지 렌더링
*/

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Eye, ExternalLink, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";
import Image from "next/image";

// 커뮤니티 게시글 콘텐츠 타입 정의
interface CommunityPostContent {
  type: 'image' | 'text' | 'video';
  order: number;
  data: {
    // 공통 속성
    src?: string;
    href?: string;
    width?: string | number;
    height?: string | number;
    style?: string;
    alt?: string;
    class?: string;
    title?: string;
    
    // 링크 속성
    link_class?: string;
    link_rel?: string;
    
    // 텍스트 속성
    tag?: string;
    text?: string;
    id?: string;
    innerHTML?: string;
    
    // 동영상 속성
    poster?: string;
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
    controls?: boolean;
    preload?: string;
    
    // 이미지 추가 속성
    data_original?: string;
    original_src?: string;
    data_file_srl?: string;
  };
}

interface CommunityPostData {
  post_id: string;
  post_url: string;
  scraped_at: string;
  metadata: {
    title?: string;
    author?: string;
    date?: string;
    category?: string;
    view_count?: number;
    like_count?: number;
    dislike_count?: number;
    comment_count?: number;
  };
  content: CommunityPostContent[];
  comments: Array<{
    comment_id: string;
    author: string;
    content: string;
    date: string;
    level?: number;
    is_reply?: boolean;
    parent_comment?: string;
    vote_count?: number;
    blame_count?: number;
    is_best?: boolean;
    is_author?: boolean;
    image_url?: string;
    image_link?: string;
    video_url?: string;
    video_autoplay?: boolean;
    video_loop?: boolean;
    video_muted?: boolean;
  }>;
  experiment_purpose?: string;
}

interface CommunityPostDetailRendererProps {
  postData: CommunityPostData;
  showMetadata?: boolean;
  onBack?: () => void;
}

export function CommunityPostDetailRenderer({ 
  postData, 
  showMetadata = true,
  onBack
}: CommunityPostDetailRendererProps) {
  
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: ko 
      });
    } catch {
      return dateString;
    }
  };

  const formatNumber = (num: number | string) => {
    const numValue = typeof num === 'string' ? parseInt(num) : num;
    return isNaN(numValue) ? '0' : numValue.toLocaleString('ko-KR');
  };

  // 콘텐츠를 순서대로 렌더링
  const renderContent = () => {
    if (!postData.content || postData.content.length === 0) {
      return <p className="text-muted-foreground">콘텐츠를 찾을 수 없습니다.</p>;
    }

    // 순서대로 정렬
    const sortedContent = [...postData.content].sort((a, b) => a.order - b.order);

    return sortedContent.map((content) => {
      switch (content.type) {
        case 'image':
          return renderImage(content);
        case 'text':
          return renderText(content);
        case 'video':
          return renderVideo(content);
        default:
          return null;
      }
    });
  };

  // 이미지 콘텐츠 렌더링 (개선된 버전)
  const renderImage = (content: CommunityPostContent) => {
    const { data } = content;
    
    // 안전한 데이터 접근
    if (!data || (!data.src && !data.data_original && !data.original_src)) return null;

    // 이미지 소스 우선순위: data_original > src > original_src
    let imageSrc = '';
    if (data.data_original) {
      imageSrc = data.data_original.startsWith('//') ? 'https:' + data.data_original : data.data_original;
    } else if (data.src) {
      imageSrc = data.src.startsWith('//') ? 'https:' + data.src : data.src;
    } else if (data.original_src) {
      imageSrc = data.original_src.startsWith('//') ? 'https:' + data.original_src : data.original_src;
    }

    if (!imageSrc) return null;

    // fallback 이미지 소스들 준비
    const fallbackSources = [
      data.src?.startsWith('//') ? 'https:' + data.src : data.src,
      data.original_src?.startsWith('//') ? 'https:' + data.original_src : data.original_src,
      data.data_original?.startsWith('//') ? 'https:' + data.data_original : data.data_original
    ].filter(Boolean).filter(src => src !== imageSrc);

    const imageElement = (
      <img
        src={imageSrc}
        alt={data.alt || ''}
        style={{ 
          width: '100%',
          maxWidth: '600px', // 더 적절한 크기로 조정
          height: 'auto',
          marginBottom: '16px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          display: 'block'
        }}
        className="mx-auto"
        title={data.title || ''}
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          
          // fallback 이미지들 순서대로 시도
          if (fallbackSources.length > 0) {
            const nextSrc = fallbackSources.shift();
            if (nextSrc && nextSrc !== target.src) {
              target.src = nextSrc;
              return;
            }
          }
          
          // 모든 fallback이 실패하면 기본 이미지로 대체
          target.style.display = 'none';
          const errorDiv = document.createElement('div');
          errorDiv.className = 'text-center text-muted-foreground p-4 border border-dashed rounded';
          errorDiv.innerHTML = '이미지를 불러올 수 없습니다';
          target.parentNode?.insertBefore(errorDiv, target);
        }}
      />
    );

    // 링크가 있으면 링크로 감싸기
    if (data.href) {
      return (
        <div key={`image-${content.order}`} className="text-center mb-4">
          <a 
            href={data.href} 
            target="_blank" 
            rel="noopener noreferrer"
            className={data.link_class || ''}
          >
            {imageElement}
          </a>
        </div>
      );
    }

    return (
      <div key={`image-${content.order}`} className="text-center mb-4">
        {imageElement}
      </div>
    );
  };

  // 텍스트 콘텐츠 렌더링
  const renderText = (content: CommunityPostContent) => {
    const { data } = content;
    
    if (!data || (!data.text && !data.innerHTML)) return null;

    // 스타일 파싱 함수
    const parseStyle = (styleString: string) => {
      const styles: Record<string, string> = {};
      if (!styleString) return styles;

      styleString.split(';').forEach(rule => {
        const [property, value] = rule.split(':').map(s => s.trim());
        if (property && value) {
          // CSS 속성명을 camelCase로 변환
          const camelProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          styles[camelProperty] = value;
        }
      });

      return styles;
    };

    const textContent = data.innerHTML || data.text || '';
    const Tag = (data.tag as keyof JSX.IntrinsicElements) || 'p';
    const style = data.style ? parseStyle(data.style) : {};

    return (
      <Tag
        key={`text-${content.order}`}
        id={data.id}
        className={`${data.class || ''} mb-4`}
        style={style}
        dangerouslySetInnerHTML={{ __html: textContent }}
      />
    );
  };

  // 동영상 콘텐츠 렌더링
  const renderVideo = (content: CommunityPostContent) => {
    const { data } = content;
    
    if (!data || !data.src) return null;

    return (
      <div key={`video-${content.order}`} className="text-center mb-4">
        <video
          src={data.src}
          poster={data.poster}
          autoPlay={data.autoplay || false}
          loop={data.loop || false}
          muted={data.muted || true}
          controls={data.controls !== false}
          preload={data.preload || 'metadata'}
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

      {/* 메타데이터 */}
      {showMetadata && (
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
                    <span>작성일: {postData.metadata.date}</span>
                  )}
                  {postData.metadata?.category && (
                    <Badge variant="secondary">{postData.metadata.category}</Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm">
                  {postData.metadata?.view_count !== undefined && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Eye className="h-4 w-4" />
                      조회수 {postData.metadata.view_count.toLocaleString()}
                    </span>
                  )}
                  {postData.metadata?.like_count !== undefined && (
                    <span className="flex items-center gap-1 text-green-600">
                      <Heart className="h-4 w-4" />
                      추천 {postData.metadata.like_count.toLocaleString()}
                    </span>
                  )}
                  {postData.metadata?.dislike_count !== undefined && postData.metadata.dislike_count > 0 && (
                    <span className="flex items-center gap-1 text-red-600">
                      👎 비추천 {postData.metadata.dislike_count.toLocaleString()}
                    </span>
                  )}
                  {postData.metadata?.comment_count !== undefined && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MessageCircle className="h-4 w-4" />
                      댓글 {postData.metadata.comment_count.toLocaleString()}
                    </span>
                  )}
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
      )}

      {/* 게시글 본문 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="prose max-w-none">
            {renderContent()}
          </div>
        </CardContent>
      </Card>

      {/* 댓글 */}
      {postData.comments && postData.comments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              댓글 {postData.comments.length}개
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {postData.comments.map((comment, index) => {
              const level = comment.level || 0;
              const marginLeft = level * 20; // 레벨당 20px 들여쓰기
              
              return (
                <div 
                  key={comment.comment_id || index} 
                  className={`border-l-2 ${comment.is_reply ? 'border-blue-200' : 'border-muted'} pl-4 ${ 
                    (comment as any).is_best ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'
                  } rounded-lg p-3 mb-2`}
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
                        
                        {/* BEST 표시 */}
                        {(comment as any).is_best && (
                          <span className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded text-xs font-bold">
                            BEST
                          </span>
                        )}
                        
                        {/* 부모 댓글 정보 */}
                        {comment.is_reply && comment.parent_comment && (
                          <span className="text-gray-500 text-xs">
                            → {comment.parent_comment}
                          </span>
                        )}
                        
                        {/* 작성시간 */}
                        {comment.date && (
                          <span className="text-gray-500 text-xs">
                            {comment.date}
                          </span>
                        )}
                      </div>
                      
                      {/* 댓글 이미지 */}
                      {(comment as any).image_url && (
                        <div className="mb-2">
                          {(comment as any).image_link ? (
                            <a 
                              href={(comment as any).image_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img 
                                src={(comment as any).image_url} 
                                alt="댓글 이미지" 
                                className="max-w-full h-auto rounded border"
                                style={{ maxHeight: '300px' }}
                              />
                            </a>
                          ) : (
                            <img 
                              src={(comment as any).image_url} 
                              alt="댓글 이미지" 
                              className="max-w-full h-auto rounded border"
                              style={{ maxHeight: '300px' }}
                            />
                          )}
                        </div>
                      )}
                      
                      {/* 댓글 비디오 */}
                      {(comment as any).video_url && (
                        <div className="mb-2">
                          <video 
                            src={(comment as any).video_url}
                            className="max-w-full h-auto rounded border"
                            style={{ maxHeight: '300px' }}
                            autoPlay={(comment as any).video_autoplay || false}
                            loop={(comment as any).video_loop || false}
                            muted={(comment as any).video_muted || true}
                            playsInline
                            controls
                          />
                        </div>
                      )}
                      
                      {/* 댓글 내용 */}
                      {comment.content && (
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      )}
                      
                      {/* 추천/비추천 */}
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        {comment.vote_count !== undefined && (
                          <span className="flex items-center space-x-1">
                            <span>👍</span>
                            <span>{comment.vote_count}</span>
                          </span>
                        )}
                        {comment.blame_count !== undefined && (
                          <span className="flex items-center space-x-1">
                            <span>👎</span>
                            <span>{comment.blame_count}</span>
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
      )}

      {/* 하단 네비게이션 */}
      <div className="mt-8 text-center">
        {onBack ? (
          <Button variant="outline" onClick={onBack}>
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
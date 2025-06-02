"use client";

/*
실험용 게시글 재현 컴포넌트

주요 기능:
- ExperimentalPostRenderer: 스크래핑 데이터 기반 게시글 재현 (line 20-80)
- renderContent: 콘텐츠 순서대로 렌더링 (line 82-150)
- renderImage: 이미지 콘텐츠 렌더링 (line 152-180)
- renderText: 텍스트 콘텐츠 렌더링 (line 182-200)
- renderVideo: 동영상 콘텐츠 렌더링 (line 202-230)

작성자: AI Assistant
작성일: 2025-05-29 17:00 KST
목적: FM코리아 게시글 재현 실험
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

// 실험용 데이터 타입 정의
interface ExperimentalContent {
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

interface ExperimentalPostData {
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
  content: ExperimentalContent[];
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
  experiment_purpose: string;
}

interface ExperimentalPostRendererProps {
  experimentData: ExperimentalPostData;
  showMetadata?: boolean;
  onBack?: () => void;
}

export function ExperimentalPostRenderer({ 
  experimentData, 
  showMetadata = true,
  onBack
}: ExperimentalPostRendererProps) {
  
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
    if (!experimentData.content || experimentData.content.length === 0) {
      return <p className="text-muted-foreground">콘텐츠를 찾을 수 없습니다.</p>;
    }

    // 순서대로 정렬
    const sortedContent = [...experimentData.content].sort((a, b) => a.order - b.order);

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
  const renderImage = (content: ExperimentalContent) => {
    const { data } = content;
    
    if (!data.src && !data.data_original && !data.original_src) return null;

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
            if (nextSrc && target.src !== nextSrc) {
              target.src = nextSrc;
              return;
            }
          }
          
          console.error('이미지 로드 실패:', imageSrc);
          // 이미지 로드 실패 시 대체 텍스트 표시
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent && !parent.querySelector('.image-error')) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'image-error p-4 bg-gray-100 rounded-lg text-center text-gray-500 max-w-[600px] mx-auto mb-4';
            errorDiv.innerHTML = `
              <div class="text-gray-400 mb-2">📷</div>
              <div>이미지를 불러올 수 없습니다</div>
              <div class="text-sm text-gray-400 mt-1">${data.alt || '이미지'}</div>
            `;
            parent.appendChild(errorDiv);
          }
        }}
      />
    );

    // 링크가 있으면 링크로 감싸기
    if (data.href) {
      let linkHref = data.href;
      if (linkHref.startsWith('//')) {
        linkHref = 'https:' + linkHref;
      }
      
      return (
        <div key={`content-${content.order}`} className="mb-6 flex justify-center">
          <a 
            href={linkHref}
            target="_blank"
            rel={data.link_rel || 'noopener noreferrer'}
            className="block hover:opacity-80 transition-opacity"
          >
            {imageElement}
          </a>
        </div>
      );
    }

    return (
      <div key={`content-${content.order}`} className="mb-6 flex justify-center">
        {imageElement}
      </div>
    );
  };

  // 텍스트 콘텐츠 렌더링
  const renderText = (content: ExperimentalContent) => {
    const { data } = content;
    
    if (!data.text || data.text.trim().length === 0) return null;

    const Tag = (data.tag || 'p') as keyof JSX.IntrinsicElements;
    
    // 스타일 파싱 (텍스트 정렬 등)
    const parseStyle = (styleString: string) => {
      const styles: any = {};
      if (styleString) {
        const declarations = styleString.split(';');
        declarations.forEach(decl => {
          const [property, value] = decl.split(':').map(s => s.trim());
          if (property && value) {
            // CSS 속성명을 camelCase로 변환
            const camelProperty = property.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
            styles[camelProperty] = value;
          }
        });
      }
      return styles;
    };

    const inlineStyles = parseStyle(data.style || '');
    
    // innerHTML이 있으면 dangerouslySetInnerHTML 사용, 없으면 일반 텍스트 사용
    if (data.innerHTML && data.innerHTML.trim() !== data.text.trim()) {
      return (
        <Tag
          key={`content-${content.order}`}
          id={data.id || undefined}
          className={`${data.class || ''} mb-4 leading-relaxed`}
          style={inlineStyles}
          dangerouslySetInnerHTML={{ __html: data.innerHTML }}
        />
      );
    } else {
      return (
        <Tag
          key={`content-${content.order}`}
          id={data.id || undefined}
          className={`${data.class || ''} mb-4 leading-relaxed`}
          style={inlineStyles}
        >
          {data.text}
        </Tag>
      );
    }
  };

  // 동영상 콘텐츠 렌더링 (개선된 버전)
  const renderVideo = (content: ExperimentalContent) => {
    const { data } = content;
    
    if (!data.src) return null;

    // URL 정규화 (//로 시작하는 URL을 https://로 변환)
    let videoSrc = data.src;
    if (videoSrc.startsWith('//')) {
      videoSrc = 'https:' + videoSrc;
    }

    let posterSrc = data.poster;
    if (posterSrc && posterSrc.startsWith('//')) {
      posterSrc = 'https:' + posterSrc;
    }

    // 자동재생 및 음소거 설정 개선
    const shouldAutoPlay = data.autoplay === true;
    const shouldMute = data.muted === true || shouldAutoPlay; // 자동재생 시 반드시 음소거

    return (
      <div key={`content-${content.order}`} className="mb-6 flex justify-center">
        <video
          src={videoSrc}
          poster={posterSrc || undefined}
          autoPlay={shouldAutoPlay}
          loop={data.loop || false}
          muted={shouldMute}
          controls={data.controls !== false} // 기본값은 true
          playsInline={true} // 모바일에서 인라인 재생
          preload={data.preload || "metadata"} // 메타데이터만 미리 로드
          className={`${data.class || ''} rounded-lg shadow-lg block mx-auto`}
          style={{ 
            maxWidth: '600px', // 이미지와 동일한 크기로 조정
            width: '100%', 
            height: 'auto',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
          }}
          onLoadStart={() => {
            // 자동재생이 설정되어 있으면 강제로 재생 시도
            if (shouldAutoPlay) {
              const video = document.querySelector(`video[src="${videoSrc}"]`) as HTMLVideoElement;
              if (video) {
                video.play().catch(error => {
                  console.warn('자동재생 실패 (브라우저 정책):', error);
                  // 자동재생 실패 시 사용자에게 알림
                  const parent = video.parentElement;
                  if (parent && !parent.querySelector('.autoplay-notice')) {
                    const notice = document.createElement('div');
                    notice.className = 'autoplay-notice absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded';
                    notice.textContent = '클릭하여 재생';
                    notice.style.position = 'absolute';
                    notice.style.top = '8px';
                    notice.style.left = '8px';
                    parent.style.position = 'relative';
                    parent.appendChild(notice);
                    
                    // 클릭 시 알림 제거
                    video.addEventListener('play', () => {
                      notice.remove();
                    }, { once: true });
                  }
                });
              }
            }
          }}
          onError={(e) => {
            console.error('동영상 로드 실패:', videoSrc);
            const target = e.target as HTMLVideoElement;
            const parent = target.parentElement;
            if (parent && !parent.querySelector('.video-error')) {
              const errorDiv = document.createElement('div');
              errorDiv.className = 'video-error p-4 bg-gray-100 rounded-lg text-center text-gray-500 max-w-[600px] mx-auto mb-4';
              errorDiv.innerHTML = `
                <div class="text-gray-400 mb-2">🎬</div>
                <div>동영상을 불러올 수 없습니다</div>
                <div class="text-sm text-gray-400 mt-1">동영상 형식이 지원되지 않거나 파일에 문제가 있습니다</div>
              `;
              parent.appendChild(errorDiv);
              target.style.display = 'none';
            }
          }}
        />
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* 실험 정보 배너 */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            🧪 실험 모드
          </Badge>
          <span className="text-sm text-blue-700">
            스크래핑 데이터 기반 게시글 재현
          </span>
        </div>
        <div className="text-xs text-blue-600">
          <p>스크래핑 시간: {formatDate(experimentData.scraped_at)}</p>
          <p>원본 URL: <a href={experimentData.post_url} target="_blank" rel="noopener noreferrer" className="underline">{experimentData.post_url}</a></p>
        </div>
      </div>

      {/* 뒤로가기 버튼 */}
      {onBack && (
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            뒤로가기
          </Button>
        </div>
      )}

      {/* 게시글 메타데이터 */}
      {showMetadata && experimentData.metadata && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl leading-tight break-words mb-4">
              {experimentData.metadata.title || `게시글 #${experimentData.post_id}`}
            </CardTitle>
            
            <div className="space-y-3">
              {/* 작성자와 작성시간 */}
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-foreground">
                  {experimentData.metadata.author || '익명'}
                </span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  {experimentData.metadata.date || '날짜 정보 없음'}
                </span>
              </div>

              {/* 통계 정보 */}
              <div className="flex items-center gap-6 text-sm">
                {experimentData.metadata.view_count !== undefined && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    조회수 {experimentData.metadata.view_count.toLocaleString()}
                  </span>
                )}
                {experimentData.metadata.like_count !== undefined && (
                  <span className="flex items-center gap-1 text-green-600">
                    <Heart className="h-4 w-4" />
                    추천 {experimentData.metadata.like_count.toLocaleString()}
                  </span>
                )}
                {experimentData.metadata.dislike_count !== undefined && experimentData.metadata.dislike_count > 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    👎 비추천 {experimentData.metadata.dislike_count.toLocaleString()}
                  </span>
                )}
                {experimentData.metadata.comment_count !== undefined && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MessageCircle className="h-4 w-4" />
                    댓글 {experimentData.metadata.comment_count.toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* 원본 링크 */}
            <div className="mt-4">
              <a
                href={experimentData.post_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                원본 보기
              </a>
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
      {experimentData.comments && experimentData.comments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              댓글 {experimentData.comments.length}개
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {experimentData.comments.map((comment, index) => {
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
                        
                        {/* 작성자 표시 제거 (일관성을 위해) */}
                        
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
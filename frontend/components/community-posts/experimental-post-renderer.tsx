'use client';

import React from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MessageCircle, ThumbsUp, Eye, Calendar, User } from 'lucide-react';

interface PostData {
  post_id: string;
  metadata: {
    title: string;
    author: string;
    date: string;
    view_count: number;
    up_count: number;
    down_count: number;
    comment_count: number;
    category?: string;
  };
  content: Array<{
    type: 'text' | 'image' | 'video';
    order: number;
    data: {
      text?: string;
      src?: string;
      alt?: string;
      width?: string;
      height?: string;
      autoplay?: boolean;
      muted?: boolean;
    };
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
  scraped_at: string;
}

interface ExperimentalPostRendererProps {
  postData: PostData;
}

export default function ExperimentalPostRenderer({ postData }: ExperimentalPostRendererProps) {
  const { metadata, content, comments } = postData;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* 게시글 헤더 */}
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-blue-50">
          <div className="space-y-4">
            {/* 제목 */}
            <h1 className="text-2xl font-bold text-gray-900">
              {metadata.title}
            </h1>
            
            {/* 메타 정보 */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span className="font-medium">{metadata.author}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{metadata.date}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                <span>조회 {metadata.view_count}</span>
              </div>
              <div className="flex items-center gap-1">
                <ThumbsUp className="w-4 h-4" />
                <span>추천 {metadata.up_count}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                <span>댓글 {metadata.comment_count}</span>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 게시글 본문 */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {content
              .sort((a, b) => a.order - b.order)
              .map((item, index) => (
                <div key={index}>
                  {item.type === 'text' && (
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {item.data.text}
                    </p>
                  )}
                  
                  {item.type === 'image' && item.data.src && (
                    <div className="my-4">
                      <div className="relative inline-block max-w-full">
                        <Image
                          src={item.data.src}
                          alt={item.data.alt || '이미지'}
                          width={parseInt(item.data.width || '800')}
                          height={parseInt(item.data.height || '600')}
                          className="max-w-full h-auto rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
                          style={{
                            maxWidth: '100%',
                            height: 'auto'
                          }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {item.type === 'video' && item.data.src && (
                    <div className="my-4">
                      <video
                        src={item.data.src}
                        controls
                        autoPlay={item.data.autoplay}
                        muted={item.data.muted}
                        className="max-w-full h-auto rounded-lg shadow-md"
                      />
                    </div>
                  )}
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* 댓글 섹션 */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            댓글 {comments.length}개
          </h3>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-1">
            {comments.map((comment, index) => (
              <div key={comment.comment_id}>
                <div 
                  className={`p-4 ${comment.level > 0 ? 'bg-gray-50' : 'bg-white'}`}
                  style={{ 
                    marginLeft: `${comment.level * 20}px`,
                    borderLeft: comment.level > 0 ? '3px solid #e5e7eb' : 'none'
                  }}
                >
                  {/* 댓글 헤더 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {comment.is_reply && (
                        <span className="text-blue-500 text-sm">↳</span>
                      )}
                      <span className="font-medium text-gray-900">
                        {comment.author}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        레벨 {comment.level}
                      </Badge>
                    </div>
                    <span className="text-xs text-gray-500">
                      {comment.date}
                    </span>
                  </div>
                  
                  {/* 댓글 내용 */}
                  <p className="text-gray-800 leading-relaxed mb-2">
                    {comment.content}
                  </p>
                  
                  {/* 댓글 액션 */}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <button className="flex items-center gap-1 hover:text-blue-600">
                      <ThumbsUp className="w-3 h-3" />
                      <span>{comment.up_count}</span>
                    </button>
                    <button className="hover:text-gray-700">
                      답글
                    </button>
                  </div>
                </div>
                
                {index < comments.length - 1 && (
                  <Separator className="mx-4" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 스크래핑 정보 */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="text-xs text-gray-500 space-y-1">
            <p>게시글 ID: {postData.post_id}</p>
            <p>스크래핑 시간: {new Date(postData.scraped_at).toLocaleString('ko-KR')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
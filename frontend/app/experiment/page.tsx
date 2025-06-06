/**
 * 목차:
 * - 타입 정의 (1-30줄)
 * - 게시글 목록 컴포넌트 (31-80줄)
 * - 게시글 상세 컴포넌트 (81-200줄)
 * - 메인 실험 페이지 컴포넌트 (201-300줄)
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Eye, MessageCircle, ThumbsUp, ThumbsDown } from 'lucide-react';

// 타입 정의
interface PostMetadata {
  title: string;
  author: string;
  date: string;
  view_count: number;
  up_count: number;
  down_count: number;
  comment_count: number;
}

interface ContentItem {
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
}

interface Comment {
  comment_id: string;
  content: string;
  author: string;
  date: string;
  media: Array<{
    type: 'image' | 'video';
    order: number;
    data: {
      src: string;
      alt?: string;
      width?: string;
      height?: string;
    };
  }>;
  level: number;
  is_reply: boolean;
  parent_comment_id: string;
  up_count: number;
  down_count: number;
  is_best?: boolean;
}

interface PostData {
  post_id: string;
  community: string;
  metadata: PostMetadata;
  content: ContentItem[];
  comments: Comment[];
  scraped_at: string;
}

// 게시글 목록 컴포넌트
interface PostListProps {
  posts: PostData[];
  onSelectPost: (post: PostData) => void;
}

const PostList: React.FC<PostListProps> = ({ posts, onSelectPost }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">스크래핑된 게시글 목록</h2>
      {posts.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            업로드된 게시글이 없습니다. JSON 파일을 업로드해주세요.
          </CardContent>
        </Card>
      ) : (
        posts.map((post) => (
          <Card key={post.post_id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-6" onClick={() => onSelectPost(post)}>
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-blue-600 hover:text-blue-800">
                  {post.metadata.title}
                </h3>
                <Badge variant="outline" className="ml-2">
                  {post.community}
                </Badge>
              </div>
              
              <div className="text-sm text-gray-600 mb-3">
                <span className="font-medium">
                  {post.metadata.author || '작성자 정보 없음'}
                </span>
                <span className="mx-2">•</span>
                <span>{post.metadata.date || '날짜 정보 없음'}</span>
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Eye className="w-4 h-4 mr-1" />
                  {(post.metadata.view_count || 0).toLocaleString()}
                </div>
                <div className="flex items-center">
                  <ThumbsUp className="w-4 h-4 mr-1" />
                  {post.metadata.up_count || 0}
                </div>
                <div className="flex items-center">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  {post.comments?.length || 0}
                </div>
                <div className="flex items-center">
                  <FileText className="w-4 h-4 mr-1" />
                  {post.content?.length || 0}개 요소
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

// 게시글 상세 컴포넌트
interface PostDetailProps {
  post: PostData;
  onBack: () => void;
}

const PostDetail: React.FC<PostDetailProps> = ({ post, onBack }) => {
  // 원문 URL 생성
  const getOriginalUrl = (post: PostData) => {
    if (post.community === 'fmkorea') {
      return `https://www.fmkorea.com/${post.post_id}`;
    } else if (post.community === 'ruliweb') {
      return `https://bbs.ruliweb.com/community/board/300148/read/${post.post_id}`;
    }
    return '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button onClick={onBack} variant="outline">
          ← 목록으로 돌아가기
        </Button>
        <div className="flex items-center space-x-3">
          <Button 
            onClick={() => window.open(getOriginalUrl(post), '_blank')}
            variant="default"
            className="bg-blue-600 hover:bg-blue-700"
          >
            원문 보기
          </Button>
          <Badge variant="outline" className="text-lg px-3 py-1">
            {post.community}
          </Badge>
        </div>
      </div>

      {/* 메타데이터 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{post.metadata.title || '제목 없음'}</CardTitle>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              <span className="font-medium">
                {post.metadata.author || '작성자 정보 없음'}
              </span>
              <span className="mx-2">•</span>
              <span>{post.metadata.date || '날짜 정보 없음'}</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Eye className="w-4 h-4 mr-1" />
                {(post.metadata.view_count || 0).toLocaleString()}
              </div>
              <div className="flex items-center">
                <ThumbsUp className="w-4 h-4 mr-1" />
                {post.metadata.up_count || 0}
              </div>
              <div className="flex items-center">
                <ThumbsDown className="w-4 h-4 mr-1" />
                {post.metadata.down_count || 0}
              </div>
              <div className="flex items-center">
                <MessageCircle className="w-4 h-4 mr-1" />
                {post.comments?.length || 0}개
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* 본문 내용 */}
      <Card>
        <CardHeader>
          <CardTitle>본문 내용</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {post.content.map((item, index) => (
            <div key={index} className="border-l-4 border-blue-200 pl-4">
              {item.type === 'text' && (
                <p className="text-gray-800 whitespace-pre-wrap">{item.data.text}</p>
              )}
              {item.type === 'image' && (
                <div className="space-y-2">
                  <img
                    src={item.data.src?.startsWith('//') ? `https:${item.data.src}` : item.data.src}
                    alt={item.data.alt || '이미지'}
                    className="max-w-full h-auto rounded-lg shadow-sm"
                    style={{
                      width: item.data.width || 'auto',
                      height: item.data.height || 'auto'
                    }}
                  />
                  {item.data.alt && (
                    <p className="text-sm text-gray-500">{item.data.alt}</p>
                  )}
                </div>
              )}
              {item.type === 'video' && (
                <video
                  src={item.data.src}
                  controls
                  autoPlay={item.data.autoplay}
                  muted={item.data.muted}
                  className="max-w-full h-auto rounded-lg shadow-sm"
                />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 댓글 */}
      <Card>
        <CardHeader>
          <CardTitle>댓글 ({post.comments?.length || 0}개)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!post.comments || post.comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">댓글이 없습니다</p>
              <p className="text-sm">
                {post.community === 'fmkorea' 
                  ? '에펨코리아 스크래퍼에서 댓글을 추출하지 못했습니다.' 
                  : '아직 댓글이 작성되지 않았습니다.'
                }
              </p>
              <Button 
                onClick={() => window.open(getOriginalUrl(post), '_blank')}
                variant="outline"
                className="mt-4"
              >
                원문에서 댓글 확인하기
              </Button>
            </div>
          ) : (
            post.comments.map((comment) => (
              <div
                key={comment.comment_id}
                className={`border rounded-lg p-4 ${
                  comment.level > 0 ? `ml-${Math.min(comment.level * 4, 16)} border-l-4 border-blue-200` : ''
                } ${comment.is_best ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50'}`}
                style={{
                  marginLeft: comment.level > 0 ? `${Math.min(comment.level * 20, 100)}px` : '0px'
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{comment.author || '익명'}</span>
                    {comment.is_best && (
                      <Badge variant="secondary" className="text-xs">BEST</Badge>
                    )}
                    {comment.is_reply && (
                      <Badge variant="outline" className="text-xs">
                        답글 (레벨 {comment.level})
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <span>{comment.date || '날짜 없음'}</span>
                    <div className="flex items-center space-x-1">
                      <ThumbsUp className="w-3 h-3" />
                      <span>{comment.up_count || 0}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <ThumbsDown className="w-3 h-3" />
                      <span>{comment.down_count || 0}</span>
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-800 mb-3 whitespace-pre-wrap">
                  {comment.content || '내용이 없습니다.'}
                </p>
                
                {/* 댓글 이미지 */}
                {comment.media && comment.media.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 font-medium">첨부 이미지:</p>
                    {comment.media.map((media, index) => (
                      <img
                        key={index}
                        src={media.data.src?.startsWith('//') ? `https:${media.data.src}` : media.data.src}
                        alt={media.data.alt || '댓글 이미지'}
                        className="max-w-xs h-auto rounded border shadow-sm"
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// 메인 실험 페이지 컴포넌트
export default function ExperimentPage() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 기존 JSON 파일들 로드 (public 폴더의 모든 JSON 파일)
  React.useEffect(() => {
    const loadExistingPosts = async () => {
      try {
        const existingPosts: PostData[] = [];
        
        // 알려진 JSON 파일들 목록 (실제로는 API 엔드포인트에서 가져와야 하지만, 일단 하드코딩)
        const jsonFiles = [
          'fmkorea_8485393463.json',
          'ruliweb_38077550.json',
          'sample-post.json',
          'fmkorea_8485697756_new.json',
          'ruliweb_38077836_new.json'
        ];
        
        for (const filename of jsonFiles) {
          try {
            const response = await fetch(`/${filename}`);
            if (response.ok) {
              const data = await response.json();
              // 기본 스키마 검증
              if (data.post_id && data.community && data.metadata) {
                existingPosts.push(data);
              }
            }
          } catch (error) {
            console.log(`${filename} 로드 실패:`, error);
          }
        }

        setPosts(existingPosts);
        console.log(`${existingPosts.length}개의 게시글을 로드했습니다.`);
      } catch (error) {
        console.error('기존 게시글 로드 중 오류:', error);
      }
    };

    loadExistingPosts();
  }, []);

  // 파일 업로드 처리
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      alert('JSON 파일만 업로드 가능합니다.');
      return;
    }

    setIsLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target?.result as string);
        
        // 기본 스키마 검증
        if (!jsonData.post_id || !jsonData.community || !jsonData.metadata) {
          throw new Error('올바르지 않은 게시글 데이터 형식입니다.');
        }

        // 중복 확인
        const isDuplicate = posts.some(post => 
          post.post_id === jsonData.post_id && post.community === jsonData.community
        );

        if (isDuplicate) {
          alert('이미 업로드된 게시글입니다.');
          setIsLoading(false);
          return;
        }

        setPosts(prev => [...prev, jsonData]);
        alert('게시글이 성공적으로 업로드되었습니다!');
      } catch (error) {
        console.error('JSON 파싱 오류:', error);
        alert('JSON 파일을 읽는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
        // 파일 입력 초기화
        event.target.value = '';
      }
    };

    reader.readAsText(file);
  }, [posts]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">게시글 스크래핑 실험</h1>
        <p className="text-gray-600 mb-6">
          스크래핑된 JSON 파일을 업로드하여 게시글을 확인할 수 있습니다.
        </p>

        {/* 파일 업로드 */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-4 text-gray-500" />
                  <p className="mb-2 text-sm text-gray-500">
                    <span className="font-semibold">클릭하여 업로드</span> 또는 드래그 앤 드롭
                  </p>
                  <p className="text-xs text-gray-500">JSON 파일만 지원</p>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                />
              </label>
            </div>
            {isLoading && (
              <p className="text-center text-blue-600 mt-4">파일을 처리 중입니다...</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 게시글 목록 또는 상세 보기 */}
      {selectedPost ? (
        <PostDetail 
          post={selectedPost} 
          onBack={() => setSelectedPost(null)} 
        />
      ) : (
        <PostList 
          posts={posts} 
          onSelectPost={setSelectedPost} 
        />
      )}
    </div>
  );
} 
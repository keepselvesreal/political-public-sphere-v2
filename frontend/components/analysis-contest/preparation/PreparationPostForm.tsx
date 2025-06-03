/*
목차:
- 천하제일 분석대회 준비 게시판 글쓰기 폼
- CKEditor 5 적용
- 제목, 내용, 태그 입력
- 현대적이고 단순한 디자인
*/

"use client";

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';
import dynamic from 'next/dynamic';

// CKEditor를 동적으로 로드 (SSR 방지)
const CKEditor5TextEditor = dynamic(
  () => import('@/components/analysis-contest/CKEditor5TextEditor')
    .then(mod => ({ default: mod.default }))
    .catch(error => {
      console.warn('CKEditor 로드 실패, textarea로 fallback:', error);
      // CKEditor 로드 실패 시 fallback 컴포넌트 반환
      return {
        default: ({ value, onChange, placeholder }: any) => (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full min-h-[300px] p-4 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ fontFamily: 'inherit' }}
          />
        )
      };
    }),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[300px] border rounded-md flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">에디터를 불러오는 중...</p>
        </div>
      </div>
    )
  }
);

export interface PreparationPostFormData {
  title: string;
  content: string;
  tags: string[];
}

interface PreparationPostFormProps {
  onSubmit: (data: PreparationPostFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<PreparationPostFormData>;
}

export default function PreparationPostForm({ 
  onSubmit, 
  onCancel, 
  initialData 
}: PreparationPostFormProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [newTag, setNewTag] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 폼 유효성 검사
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = '제목을 입력해주세요.';
    } else if (title.trim().length < 5) {
      newErrors.title = '제목은 최소 5자 이상 입력해주세요.';
    } else if (title.trim().length > 100) {
      newErrors.title = '제목은 100자를 초과할 수 없습니다.';
    }

    if (!content.trim()) {
      newErrors.content = '내용을 입력해주세요.';
    } else if (content.trim().length < 10) {
      newErrors.content = '내용은 최소 10자 이상 입력해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 태그 추가
  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < 10) {
      setTags([...tags, trimmedTag]);
      setNewTag('');
    }
  };

  // 태그 제거
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // 태그 입력 키 핸들러
  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        tags: tags
      });
    } catch (error) {
      console.error('폼 제출 오류:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">정보 공유 글 작성</CardTitle>
          <p className="text-muted-foreground">
            분석에 도움이 되는 정보를 공유해주세요
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 제목 입력 */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                제목 *
              </Label>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목을 입력해주세요 (5-100자)"
                className={errors.title ? 'border-red-500' : ''}
                maxLength={100}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {title.length}/100자
              </p>
            </div>

            {/* 태그 입력 */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                태그 (선택사항)
              </Label>
              <div className="flex space-x-2">
                <Input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  placeholder="태그를 입력하고 Enter를 누르세요"
                  maxLength={20}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddTag}
                  disabled={!newTag.trim() || tags.length >= 10}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {/* 태그 목록 */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                      <span>#{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                최대 10개까지 추가할 수 있습니다. ({tags.length}/10)
              </p>
            </div>

            {/* 내용 입력 (CKEditor) */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                내용 *
              </Label>
              <div className={errors.content ? 'border border-red-500 rounded-md' : ''}>
                <CKEditor5TextEditor
                  value={content}
                  onChange={setContent}
                  placeholder="분석에 도움이 되는 정보를 자세히 작성해주세요..."
                />
              </div>
              {errors.content && (
                <p className="text-sm text-red-500">{errors.content}</p>
              )}
            </div>

            {/* 버튼 영역 */}
            <div className="flex justify-end space-x-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[100px]"
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>작성 중...</span>
                  </div>
                ) : (
                  '작성 완료'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 
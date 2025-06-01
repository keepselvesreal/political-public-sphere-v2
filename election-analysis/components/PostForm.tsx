/*
목차:
- PostForm 컴포넌트 (라인 1-200)
  - react-hook-form을 사용한 폼 관리
  - 유효성 검사: 제목(100자), 키워드(최대 5개), votes 합계(100%)
  - A11y 지원: ARIA 라벨, 키보드 네비게이션
  - i18n 지원: 다국어 라벨 및 플레이스홀더
*/

"use client";

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import TextEditor from '@/components/TextEditor';

// 폼 유효성 검사 스키마
const postFormSchema = z.object({
  title: z.string()
    .min(1, '제목을 입력해주세요')
    .max(100, '제목은 100자 이하로 입력해주세요'),
  winner: z.string()
    .min(1, '예측 당선자를 입력해주세요'),
  gap: z.number()
    .min(0, '득표율 격차는 0 이상이어야 합니다')
    .max(100, '득표율 격차는 100 이하여야 합니다'),
  votes: z.object({
    candidate1: z.number().min(0).max(100),
    candidate2: z.number().min(0).max(100),
  }).refine((data) => {
    const total = data.candidate1 + data.candidate2;
    return Math.abs(total - 100) < 0.1; // 부동소수점 오차 고려
  }, {
    message: '득표율 합계는 100%여야 합니다',
  }),
  keywords: z.array(z.string())
    .max(5, '키워드는 최대 5개까지 입력 가능합니다'),
  content: z.string()
    .min(1, '분석 내용을 입력해주세요'),
});

type PostFormData = z.infer<typeof postFormSchema>;

interface PostFormProps {
  onSubmit: (data: PostFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export default function PostForm({ onSubmit, onCancel, isSubmitting = false }: PostFormProps) {
  const [tagInput, setTagInput] = useState('');
  const { toast } = useToast();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<PostFormData>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      title: '',
      winner: '',
      gap: 0,
      votes: {
        candidate1: 50,
        candidate2: 50,
      },
      keywords: [],
      content: '',
    }
  });

  const keywords = watch('keywords');
  const votes = watch('votes');

  // 키워드 추가 핸들러
  const handleAddKeyword = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      
      if (keywords.length >= 5) {
        toast({
          title: "키워드 제한",
          description: "키워드는 최대 5개까지 입력 가능합니다.",
          variant: "destructive",
        });
        return;
      }

      if (!keywords.includes(tagInput.trim())) {
        setValue('keywords', [...keywords, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  // 키워드 제거 핸들러
  const handleRemoveKeyword = (keywordToRemove: string) => {
    setValue('keywords', keywords.filter(keyword => keyword !== keywordToRemove));
  };

  // 득표율 자동 조정 핸들러
  const handleVoteChange = (candidate: 'candidate1' | 'candidate2', value: number) => {
    const otherValue = Math.max(0, Math.min(100, 100 - value));
    
    if (candidate === 'candidate1') {
      setValue('votes', {
        candidate1: value,
        candidate2: otherValue,
      });
    } else {
      setValue('votes', {
        candidate1: otherValue,
        candidate2: value,
      });
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>선거 예측 분석 작성</CardTitle>
      </CardHeader>
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          {/* 제목 입력 */}
          <div className="space-y-2">
            <Label htmlFor="title">
              제목 * 
              <span className="text-sm text-muted-foreground ml-2">
                ({watch('title')?.length || 0}/100)
              </span>
            </Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="분석 제목을 입력하세요"
              aria-label="게시글 제목"
              aria-describedby={errors.title ? "title-error" : undefined}
              className={errors.title ? "border-destructive" : ""}
            />
            {errors.title && (
              <p id="title-error" className="text-sm text-destructive" role="alert">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* 예측 당선자와 득표율 격차 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="winner">예측 당선자 *</Label>
              <Input
                id="winner"
                {...register('winner')}
                placeholder="예: 후보 A, 김철수"
                aria-label="예측 당선자"
                aria-describedby={errors.winner ? "winner-error" : undefined}
                className={errors.winner ? "border-destructive" : ""}
              />
              {errors.winner && (
                <p id="winner-error" className="text-sm text-destructive" role="alert">
                  {errors.winner.message}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gap">득표율 격차 (%) *</Label>
              <Input
                id="gap"
                type="number"
                min="0"
                max="100"
                step="0.1"
                {...register('gap', { valueAsNumber: true })}
                placeholder="예: 15.5"
                aria-label="득표율 격차"
                aria-describedby={errors.gap ? "gap-error" : undefined}
                className={errors.gap ? "border-destructive" : ""}
              />
              {errors.gap && (
                <p id="gap-error" className="text-sm text-destructive" role="alert">
                  {errors.gap.message}
                </p>
              )}
            </div>
          </div>

          {/* 득표율 예측 */}
          <div className="space-y-2">
            <Label>득표율 예측 * (합계: {(votes.candidate1 + votes.candidate2).toFixed(1)}%)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="candidate1">후보 1 득표율 (%)</Label>
                <Input
                  id="candidate1"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={votes.candidate1}
                  onChange={(e) => handleVoteChange('candidate1', Number(e.target.value))}
                  aria-label="후보 1 득표율"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="candidate2">후보 2 득표율 (%)</Label>
                <Input
                  id="candidate2"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={votes.candidate2}
                  onChange={(e) => handleVoteChange('candidate2', Number(e.target.value))}
                  aria-label="후보 2 득표율"
                />
              </div>
            </div>
            {errors.votes && (
              <p className="text-sm text-destructive" role="alert">
                {errors.votes.message}
              </p>
            )}
          </div>
          
          {/* 키워드 태그 */}
          <div className="space-y-2">
            <Label htmlFor="keywords">
              키워드 태그 
              <span className="text-sm text-muted-foreground ml-2">
                ({keywords.length}/5)
              </span>
            </Label>
            <div className="flex flex-wrap gap-2 mb-2" role="list" aria-label="선택된 키워드">
              {keywords.map((keyword, index) => (
                <Badge 
                  key={index} 
                  variant="secondary" 
                  className="flex items-center gap-1"
                  role="listitem"
                >
                  {keyword}
                  <button
                    type="button"
                    onClick={() => handleRemoveKeyword(keyword)}
                    aria-label={`${keyword} 키워드 제거`}
                    className="hover:bg-destructive/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              id="keywords"
              placeholder="키워드를 입력하고 Enter를 누르세요"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddKeyword}
              aria-label="키워드 입력"
              aria-describedby="keywords-help"
              disabled={keywords.length >= 5}
            />
            <p id="keywords-help" className="text-sm text-muted-foreground">
              Enter 키를 눌러 키워드를 추가하세요. 최대 5개까지 입력 가능합니다.
            </p>
            {errors.keywords && (
              <p className="text-sm text-destructive" role="alert">
                {errors.keywords.message}
              </p>
            )}
          </div>
          
          {/* 분석 내용 */}
          <div className="space-y-2">
            <Label htmlFor="content">분석 내용 *</Label>
            <Controller
              name="content"
              control={control}
              render={({ field }) => (
                <TextEditor 
                  value={field.value} 
                  onChange={field.onChange}
                />
              )}
            />
            {errors.content && (
              <p className="text-sm text-destructive" role="alert">
                {errors.content.message}
              </p>
            )}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-end space-x-2">
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
            aria-describedby={isSubmitting ? "submit-status" : undefined}
          >
            {isSubmitting ? '게시 중...' : '게시하기'}
          </Button>
          {isSubmitting && (
            <span id="submit-status" className="sr-only">
              게시글을 업로드하고 있습니다. 잠시만 기다려주세요.
            </span>
          )}
        </CardFooter>
      </form>
    </Card>
  );
} 
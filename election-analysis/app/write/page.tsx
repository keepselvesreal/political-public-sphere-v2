"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Dynamically import the editor to avoid SSR issues
const TextEditor = dynamic(() => import('@/components/TextEditor'), {
  ssr: false,
  loading: () => <p>Loading editor...</p>
});

export default function WritePage() {
  const [title, setTitle] = useState('');
  const [winner, setWinner] = useState('');
  const [gap, setGap] = useState<number>(0);
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  
  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  const handleSubmit = async () => {
    // 유효성 검사
    if (!title.trim()) {
      toast({
        title: "제목 누락",
        description: "게시글 제목을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!winner.trim()) {
      toast({
        title: "예측 당선자 누락",
        description: "예측 당선자를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: "내용 누락",
        description: "분석 내용을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (gap < 0 || gap > 100) {
      toast({
        title: "잘못된 득표율 격차",
        description: "득표율 격차는 0-100 사이의 값이어야 합니다.",
        variant: "destructive",
      });
      return;
    }
    
    setIsPending(true);
    
    try {
      // 실제 API 호출
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          winner: winner.trim(),
          gap: Number(gap),
          keywords: tags,
          content: content.trim(),
          authorId: 'anonymous' // 추후 인증 시스템 구현 시 실제 사용자 ID로 변경
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '게시글 작성에 실패했습니다.');
      }

      const newPost = await response.json();
      console.log('게시글 작성 성공:', newPost);
      
      toast({
        title: "게시글 작성 완료",
        description: "선거 분석이 성공적으로 게시되었습니다.",
      });
      
      // 메인 페이지로 리다이렉트
      router.push('/');
    } catch (error) {
      console.error('게시글 작성 오류:', error);
      toast({
        title: "작성 실패",
        description: error instanceof Error ? error.message : "게시글 작성에 실패했습니다. 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-center">선거 분석 작성</h1>
      
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>선거 예측 분석 작성</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">제목 *</Label>
            <Input
              id="title"
              placeholder="분석 제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="winner">예측 당선자 *</Label>
              <Input
                id="winner"
                placeholder="예: 후보 A, 김철수"
                value={winner}
                onChange={(e) => setWinner(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gap">득표율 격차 (%) *</Label>
              <Input
                id="gap"
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="예: 15.5"
                value={gap}
                onChange={(e) => setGap(Number(e.target.value))}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tags">키워드 태그</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleRemoveTag(tag)}
                  />
                </Badge>
              ))}
            </div>
            <Input
              id="tags"
              placeholder="키워드를 입력하고 Enter를 누르세요"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="content">분석 내용 *</Label>
            <TextEditor value={content} onChange={setContent} />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => router.push('/')}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? '게시 중...' : '게시하기'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
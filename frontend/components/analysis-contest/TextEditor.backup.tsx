/*
목차:
- TextEditor 컴포넌트 (라인 1-222) - 백업 파일
  - React 19 완전 호환 마크다운 에디터
  - 기본 포맷팅 버튼 제공 (굵게, 기울임, 제목, 목록, 인용, 링크)
  - 실시간 미리보기 기능
  - 키보드 단축키 지원 (Ctrl+B, Ctrl+I)
  - 다크모드 지원
  - A11y 지원: 버튼 title 속성, 키보드 네비게이션
  
  ⚠️ 이 파일은 CKEditor 5로 교체되어 더 이상 사용되지 않습니다.
*/

"use client";

import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote,
  Link,
  Type,
  Eye,
  Edit3
} from 'lucide-react';

type TextEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function TextEditor({ value, onChange }: TextEditorProps) {
  const [isPreview, setIsPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 텍스트 삽입 함수
  const insertText = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    onChange(newText);
    
    // 커서 위치 조정
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + before.length + selectedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [value, onChange]);

  // 포맷팅 버튼 핸들러들
  const handleBold = () => insertText('**', '**');
  const handleItalic = () => insertText('*', '*');
  const handleHeading = () => insertText('## ');
  const handleBulletList = () => insertText('- ');
  const handleNumberedList = () => insertText('1. ');
  const handleQuote = () => insertText('> ');
  const handleLink = () => insertText('[링크 텍스트](', ')');

  // 마크다운을 HTML로 간단 변환 (미리보기용)
  const renderPreview = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n/g, '<br>');
  };

  return (
    <div className="border border-input rounded-md bg-white dark:bg-gray-950">
      {/* 툴바 */}
      <div className="flex items-center gap-1 p-2 border-b border-input bg-gray-50 dark:bg-gray-900">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBold}
          title="굵게 (Ctrl+B)"
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleItalic}
          title="기울임 (Ctrl+I)"
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleHeading}
          title="제목"
          className="h-8 w-8 p-0"
        >
          <Type className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBulletList}
          title="글머리 기호"
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleNumberedList}
          title="번호 목록"
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleQuote}
          title="인용"
          className="h-8 w-8 p-0"
        >
          <Quote className="h-4 w-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleLink}
          title="링크"
          className="h-8 w-8 p-0"
        >
          <Link className="h-4 w-4" />
        </Button>
        
        <div className="flex-1" />
        
        <Button
          type="button"
          variant={isPreview ? "default" : "ghost"}
          size="sm"
          onClick={() => setIsPreview(!isPreview)}
          title={isPreview ? "편집 모드" : "미리보기"}
          className="h-8 px-3"
        >
          {isPreview ? (
            <>
              <Edit3 className="h-4 w-4 mr-1" />
              편집
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-1" />
              미리보기
            </>
          )}
        </Button>
      </div>

      {/* 에디터 영역 */}
      <div className="relative">
        {isPreview ? (
          <div 
            className="min-h-64 p-4 prose prose-sm max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: renderPreview(value) }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="내용을 입력하세요... (마크다운 문법 지원)"
            className="w-full min-h-64 p-4 bg-transparent border-0 resize-none focus:outline-none focus:ring-0 text-foreground placeholder:text-muted-foreground"
            onKeyDown={(e) => {
              // 키보드 단축키 지원
              if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                  case 'b':
                    e.preventDefault();
                    handleBold();
                    break;
                  case 'i':
                    e.preventDefault();
                    handleItalic();
                    break;
                }
              }
            }}
          />
        )}
      </div>
      
      {/* 도움말 */}
      <div className="px-4 py-2 text-xs text-muted-foreground border-t border-input bg-gray-50 dark:bg-gray-900">
        <span>마크다운 문법: **굵게**, *기울임*, ## 제목, - 목록, &gt; 인용, [링크](URL)</span>
      </div>
    </div>
  );
} 
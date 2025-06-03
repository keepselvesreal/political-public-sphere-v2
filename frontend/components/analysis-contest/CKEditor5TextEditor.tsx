/*
목차:
- CKEditor5TextEditor 컴포넌트 (라인 1-300)
  - CKEditor 5 React 통합
  - 클래식 에디터 빌드 사용
  - 한국어 지원 및 다크모드 대응
  - 기본 포맷팅 도구 제공
  - TypeScript 완전 지원
  - 접근성(A11y) 지원
  - 미리보기 기능 추가
  - 개선된 스타일링 (불릿 리스트, 제목 크기)
*/

"use client";

import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Edit3 } from 'lucide-react';

type CKEditor5TextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

export default function CKEditor5TextEditor({ 
  value, 
  onChange, 
  placeholder = "내용을 입력하세요...",
  disabled = false 
}: CKEditor5TextEditorProps) {
  const editorRef = useRef<any>(null);
  const [isPreview, setIsPreview] = useState(false);

  // CKEditor 설정
  const editorConfiguration = {
    toolbar: [
      'heading',
      '|',
      'bold',
      'italic',
      'underline',
      '|',
      'bulletedList',
      'numberedList',
      '|',
      'outdent',
      'indent',
      '|',
      'blockQuote',
      'insertTable',
      '|',
      'link',
      'imageUpload',
      '|',
      'undo',
      'redo'
    ],
    heading: {
      options: [
        { model: 'paragraph', title: '본문', class: 'ck-heading_paragraph' },
        { model: 'heading1', view: 'h1', title: '제목 1', class: 'ck-heading_heading1' },
        { model: 'heading2', view: 'h2', title: '제목 2', class: 'ck-heading_heading2' },
        { model: 'heading3', view: 'h3', title: '제목 3', class: 'ck-heading_heading3' }
      ]
    },
    table: {
      contentToolbar: [
        'tableColumn',
        'tableRow',
        'mergeTableCells'
      ]
    },
    image: {
      toolbar: [
        'imageTextAlternative',
        'imageStyle:inline',
        'imageStyle:block',
        'imageStyle:side'
      ]
    },
    placeholder: placeholder,
    // 한국어 지원을 위한 언어 설정
    language: 'ko',
    // 접근성 지원
    balloonToolbar: ['bold', 'italic', 'link'],
    // 높이 설정
    height: '300px'
  };

  // 다크모드 감지 및 스타일 적용
  useEffect(() => {
    const isDarkMode = document.documentElement.classList.contains('dark');
    const editorElement = document.querySelector('.ck-editor__main');
    
    if (editorElement) {
      if (isDarkMode) {
        editorElement.classList.add('ck-dark-theme');
      } else {
        editorElement.classList.remove('ck-dark-theme');
      }
    }
  }, []);

  return (
    <div className="ckeditor5-container">
      {/* 에디터/미리보기 토글 버튼 */}
      <div className="flex justify-end mb-2">
        <Button
          type="button"
          variant={isPreview ? "default" : "outline"}
          size="sm"
          onClick={() => setIsPreview(!isPreview)}
          className="flex items-center gap-2"
        >
          {isPreview ? (
            <>
              <Edit3 className="h-4 w-4" />
              편집
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              미리보기
            </>
          )}
        </Button>
      </div>

      {isPreview ? (
        /* 미리보기 영역 */
        <div className="preview-container">
          <div 
            className="preview-content"
            dangerouslySetInnerHTML={{ __html: value }}
          />
        </div>
      ) : (
        /* CKEditor 영역 */
        <CKEditor
          editor={ClassicEditor}
          config={editorConfiguration}
          data={value}
          disabled={disabled}
          onChange={(event, editor) => {
            const data = editor.getData();
            onChange(data);
          }}
          onReady={(editor) => {
            editorRef.current = editor;
            
            // 에디터 높이 설정
            const editingView = editor.editing.view;
            const editingRoot = editingView.document.getRoot();
            
            if (editingRoot) {
              editingView.change((writer) => {
                writer.setStyle('min-height', '300px', editingRoot);
              });
            }
          }}
          onError={(error, { willEditorRestart }) => {
            console.error('CKEditor 오류:', error);
            
            if (willEditorRestart) {
              console.log('에디터가 재시작됩니다.');
            }
          }}
        />
      )}
      
      {/* CKEditor 5 및 미리보기 커스텀 스타일 */}
      <style jsx global>{`
        .ckeditor5-container .ck-editor {
          border: 1px solid hsl(var(--border));
          border-radius: calc(var(--radius) - 2px);
        }
        
        .ckeditor5-container .ck-editor__top {
          border-bottom: 1px solid hsl(var(--border));
          background: hsl(var(--muted));
        }
        
        .ckeditor5-container .ck-editor__main {
          background: hsl(var(--background));
          color: hsl(var(--foreground));
        }
        
        .ckeditor5-container .ck-content {
          min-height: 300px;
          padding: 1rem;
          font-family: inherit;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        /* 제목 크기 스타일링 */
        .ckeditor5-container .ck-content h1 {
          font-size: 2rem;
          font-weight: 700;
          line-height: 1.2;
          margin: 1.5rem 0 1rem 0;
          color: hsl(var(--foreground));
        }

        .ckeditor5-container .ck-content h2 {
          font-size: 1.5rem;
          font-weight: 600;
          line-height: 1.3;
          margin: 1.25rem 0 0.75rem 0;
          color: hsl(var(--foreground));
        }

        .ckeditor5-container .ck-content h3 {
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.4;
          margin: 1rem 0 0.5rem 0;
          color: hsl(var(--foreground));
        }

        /* 불릿 리스트 스타일링 개선 */
        .ckeditor5-container .ck-content ul {
          margin: 1rem 0;
          padding-left: 2rem;
        }

        .ckeditor5-container .ck-content ul li {
          margin: 0.5rem 0;
          list-style-type: disc;
          padding-left: 0.5rem;
        }

        .ckeditor5-container .ck-content ol {
          margin: 1rem 0;
          padding-left: 2rem;
        }

        .ckeditor5-container .ck-content ol li {
          margin: 0.5rem 0;
          list-style-type: decimal;
          padding-left: 0.5rem;
        }

        /* 중첩 리스트 스타일링 */
        .ckeditor5-container .ck-content ul ul,
        .ckeditor5-container .ck-content ol ol {
          margin: 0.25rem 0;
          padding-left: 1.5rem;
        }

        .ckeditor5-container .ck-content ul ul li {
          list-style-type: circle;
        }

        .ckeditor5-container .ck-content ul ul ul li {
          list-style-type: square;
        }

        /* 블록 인용 스타일링 */
        .ckeditor5-container .ck-content blockquote {
          border-left: 4px solid hsl(var(--primary));
          margin: 1rem 0;
          padding: 0.5rem 0 0.5rem 1rem;
          background: hsl(var(--muted) / 0.3);
          font-style: italic;
        }

        /* 테이블 스타일링 */
        .ckeditor5-container .ck-content table {
          border-collapse: collapse;
          margin: 1rem 0;
          width: 100%;
        }

        .ckeditor5-container .ck-content table td,
        .ckeditor5-container .ck-content table th {
          border: 1px solid hsl(var(--border));
          padding: 0.5rem;
        }

        .ckeditor5-container .ck-content table th {
          background: hsl(var(--muted));
          font-weight: 600;
        }

        /* 미리보기 컨테이너 스타일링 */
        .preview-container {
          border: 1px solid hsl(var(--border));
          border-radius: calc(var(--radius) - 2px);
          min-height: 300px;
          background: hsl(var(--background));
        }

        .preview-content {
          padding: 1rem;
          font-family: inherit;
          font-size: 0.875rem;
          line-height: 1.6;
          color: hsl(var(--foreground));
        }

        /* 미리보기 제목 스타일링 */
        .preview-content h1 {
          font-size: 2rem;
          font-weight: 700;
          line-height: 1.2;
          margin: 1.5rem 0 1rem 0;
          color: hsl(var(--foreground));
        }

        .preview-content h2 {
          font-size: 1.5rem;
          font-weight: 600;
          line-height: 1.3;
          margin: 1.25rem 0 0.75rem 0;
          color: hsl(var(--foreground));
        }

        .preview-content h3 {
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.4;
          margin: 1rem 0 0.5rem 0;
          color: hsl(var(--foreground));
        }

        /* 미리보기 리스트 스타일링 */
        .preview-content ul {
          margin: 1rem 0;
          padding-left: 2rem;
        }

        .preview-content ul li {
          margin: 0.5rem 0;
          list-style-type: disc;
          padding-left: 0.5rem;
        }

        .preview-content ol {
          margin: 1rem 0;
          padding-left: 2rem;
        }

        .preview-content ol li {
          margin: 0.5rem 0;
          list-style-type: decimal;
          padding-left: 0.5rem;
        }

        /* 미리보기 중첩 리스트 */
        .preview-content ul ul,
        .preview-content ol ol {
          margin: 0.25rem 0;
          padding-left: 1.5rem;
        }

        .preview-content ul ul li {
          list-style-type: circle;
        }

        .preview-content ul ul ul li {
          list-style-type: square;
        }

        /* 미리보기 블록 인용 */
        .preview-content blockquote {
          border-left: 4px solid hsl(var(--primary));
          margin: 1rem 0;
          padding: 0.5rem 0 0.5rem 1rem;
          background: hsl(var(--muted) / 0.3);
          font-style: italic;
        }

        /* 미리보기 테이블 */
        .preview-content table {
          border-collapse: collapse;
          margin: 1rem 0;
          width: 100%;
        }

        .preview-content table td,
        .preview-content table th {
          border: 1px solid hsl(var(--border));
          padding: 0.5rem;
        }

        .preview-content table th {
          background: hsl(var(--muted));
          font-weight: 600;
        }

        /* 미리보기 링크 */
        .preview-content a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }

        .preview-content a:hover {
          color: hsl(var(--primary) / 0.8);
        }

        /* 미리보기 강조 텍스트 */
        .preview-content strong {
          font-weight: 700;
        }

        .preview-content em {
          font-style: italic;
        }

        /* 다크모드 지원 */
        .dark .ckeditor5-container .ck-editor__top {
          background: hsl(var(--muted));
          border-color: hsl(var(--border));
        }
        
        .dark .ckeditor5-container .ck-editor__main {
          background: hsl(var(--background));
        }
        
        .dark .ckeditor5-container .ck-content {
          color: hsl(var(--foreground));
        }

        .dark .preview-container {
          background: hsl(var(--background));
          border-color: hsl(var(--border));
        }

        .dark .preview-content {
          color: hsl(var(--foreground));
        }
        
        /* 툴바 버튼 스타일 */
        .ckeditor5-container .ck-toolbar .ck-button {
          color: hsl(var(--foreground));
        }
        
        .ckeditor5-container .ck-toolbar .ck-button:hover {
          background: hsl(var(--accent));
        }
        
        .ckeditor5-container .ck-toolbar .ck-button.ck-on {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        
        /* 포커스 스타일 */
        .ckeditor5-container .ck-editor.ck-focused {
          border-color: hsl(var(--ring));
          box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
        }

        .preview-container:focus-within {
          border-color: hsl(var(--ring));
          box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
        }
        
        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .ckeditor5-container .ck-toolbar {
            flex-wrap: wrap;
          }
          
          .ckeditor5-container .ck-content {
            padding: 0.75rem;
            font-size: 0.8125rem;
          }

          .preview-content {
            padding: 0.75rem;
            font-size: 0.8125rem;
          }

          .preview-content h1 {
            font-size: 1.75rem;
          }

          .preview-content h2 {
            font-size: 1.25rem;
          }

          .preview-content h3 {
            font-size: 1.125rem;
          }
        }
      `}</style>
    </div>
  );
} 
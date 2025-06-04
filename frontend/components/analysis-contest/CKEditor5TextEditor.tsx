/*
목차:
- CKEditor5TextEditor 컴포넌트 (라인 1-300)
  - CKEditor 5 React 통합 (동적 import)
  - 클래식 에디터 빌드 사용
  - 한국어 지원 및 다크모드 대응
  - 기본 포맷팅 도구 제공
  - TypeScript 완전 지원
  - 접근성(A11y) 지원
  - 개선된 스타일링 (불릿 리스트, 제목 크기)
  - 클래스 생성자 오류 수정
  - 마지막 수정: 2025년 6월 3일 19시 15분 (KST)
*/

"use client";

import { useEffect, useRef, useState } from 'react';

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
  const [editorLoaded, setEditorLoaded] = useState(false);
  const [editorComponents, setEditorComponents] = useState<{
    CKEditor: any;
    ClassicEditor: any;
  } | null>(null);

  useEffect(() => {
    const loadEditor = async () => {
      try {
        // 동적 import를 Promise.all로 병렬 처리
        const [ckeditorModule, classicEditorModule] = await Promise.all([
          import('@ckeditor/ckeditor5-react'),
          import('@ckeditor/ckeditor5-build-classic')
        ]);
        
        setEditorComponents({
          CKEditor: ckeditorModule.CKEditor,
          ClassicEditor: classicEditorModule.default
        });
        setEditorLoaded(true);
      } catch (error) {
        console.error('CKEditor 로드 실패:', error);
        setEditorLoaded(false);
      }
    };

    loadEditor();
  }, []);

  // CKEditor 설정
  const editorConfiguration = {
    language: 'ko',
    placeholder: placeholder,
    toolbar: {
      items: [
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
        'mediaEmbed',
        '|',
        'undo',
        'redo'
      ]
    },
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
    link: {
      decorators: {
        openInNewTab: {
          mode: 'manual',
          label: '새 탭에서 열기',
          attributes: {
            target: '_blank',
            rel: 'noopener noreferrer'
          }
        }
      }
    }
  };

  // 로딩 중일 때
  if (!editorLoaded || !editorComponents) {
    return (
      <div className="ckeditor5-container">
        <div className="border rounded-md p-4 min-h-[300px] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">에디터를 불러오는 중...</p>
          </div>
        </div>
      </div>
    );
  }

  const { CKEditor, ClassicEditor } = editorComponents;

  return (
    <div className="ckeditor5-container">
      {/* CKEditor 영역 */}
      <CKEditor
        editor={ClassicEditor}
        config={editorConfiguration}
        data={value}
        disabled={disabled}
        onChange={(event: any, editor: any) => {
          const data = editor.getData();
          onChange(data);
        }}
        onReady={(editor: any) => {
          editorRef.current = editor;
          
          // 에디터 높이 설정
          const editingView = editor.editing.view;
          const editingRoot = editingView.document.getRoot();
          
          if (editingRoot) {
            editingView.change((writer: any) => {
              writer.setStyle('min-height', '300px', editingRoot);
            });
          }
        }}
        onError={(error: any, { willEditorRestart }: any) => {
          console.error('CKEditor 오류:', error);
          
          if (willEditorRestart) {
            console.log('에디터가 재시작됩니다.');
          }
        }}
      />
      
      {/* CKEditor 5 커스텀 스타일 */}
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
        
        /* 반응형 디자인 */
        @media (max-width: 768px) {
          .ckeditor5-container .ck-toolbar {
            flex-wrap: wrap;
          }
          
          .ckeditor5-container .ck-content {
            padding: 0.75rem;
            font-size: 0.8125rem;
          }
        }
      `}</style>
    </div>
  );
} 
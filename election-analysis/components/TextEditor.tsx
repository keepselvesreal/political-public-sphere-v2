"use client";

import { useRef, useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

type TextEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function TextEditor({ value, onChange }: TextEditorProps) {
  const quillRef = useRef<ReactQuill>(null);
  
  const modules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ color: [] }, { background: [] }],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      ['clean'],
    ],
  }), []);
  
  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'color', 'background',
    'blockquote', 'code-block',
    'link', 'image',
  ];
  
  return (
    <div className="bg-white dark:bg-gray-950 border border-input rounded-md">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        formats={formats}
        className="h-64"
      />
    </div>
  );
}
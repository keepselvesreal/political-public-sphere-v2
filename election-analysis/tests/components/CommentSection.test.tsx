/*
목차:
- CommentSection 컴포넌트 기본 테스트
- 중첩 댓글 구조 검증
- 댓글 작성 기능 검증
*/

import React from 'react';
import { render } from '@testing-library/react';
import CommentSection from '@/components/CommentSection';

// Mock dependencies
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: { id: 'user123', name: '테스트 사용자', image: '/test-avatar.jpg' }
    },
    status: 'authenticated'
  })
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  })
}));

jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
    dismiss: jest.fn(),
    toasts: [],
  }),
}));

jest.mock('swr', () => ({
  __esModule: true,
  default: () => ({
    data: {
      comments: [
        {
          id: '1',
          author: { name: '사용자 1234', avatar: '/avatars/default.jpg' },
          content: '최상위 댓글입니다.',
          date: '1시간 전',
          likes: 5,
          depth: 0,
          replies: [
            {
              id: '2',
              author: { name: '사용자 5678', avatar: '/avatars/default.jpg' },
              content: '첫 번째 답글입니다.',
              date: '30분 전',
              likes: 2,
              depth: 1,
              replies: []
            }
          ]
        }
      ],
      total: 2
    },
    error: null,
    mutate: jest.fn(),
    isLoading: false,
  }),
}));

// Mock fetch
global.fetch = jest.fn();

describe('CommentSection - 중첩 댓글 기능', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: '성공', comment: {} }),
    });
  });

  test('컴포넌트가 정상적으로 렌더링되어야 한다', () => {
    const { container } = render(<CommentSection postId="test-post-1" />);
    expect(container).toBeInTheDocument();
  });

  test('댓글 내용이 표시되어야 한다', () => {
    const { getByText } = render(<CommentSection postId="test-post-1" />);
    expect(getByText('최상위 댓글입니다.')).toBeInTheDocument();
    expect(getByText('첫 번째 답글입니다.')).toBeInTheDocument();
  });

  test('댓글 작성 폼이 표시되어야 한다', () => {
    const { getByPlaceholderText } = render(<CommentSection postId="test-post-1" />);
    expect(getByPlaceholderText('댓글을 작성해주세요...')).toBeInTheDocument();
  });

  test('답글 버튼이 표시되어야 한다', () => {
    const { getAllByText } = render(<CommentSection postId="test-post-1" />);
    const replyButtons = getAllByText('답글');
    expect(replyButtons.length).toBeGreaterThan(0);
  });
}); 
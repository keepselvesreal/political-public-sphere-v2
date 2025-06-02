/*
목차:
- CommentSection 컴포넌트 기본 테스트
- 중첩 댓글 구조 검증
- 댓글 작성 기능 검증
- 투표 기능 (좋아요/비추천) 검증
- 댓글 삭제 기능 검증
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
          dislikes: 1,
          userVote: null,
          depth: 0,
          authorId: 'user123',
          isDeleted: false,
          replies: [
            {
              id: '2',
              author: { name: '사용자 5678', avatar: '/avatars/default.jpg' },
              content: '첫 번째 답글입니다.',
              date: '30분 전',
              likes: 2,
              dislikes: 0,
              userVote: 'like',
              depth: 1,
              authorId: 'user456',
              isDeleted: false,
              replies: []
            }
          ]
        },
        {
          id: '3',
          author: { name: '사용자 9999', avatar: '/avatars/default.jpg' },
          content: '[삭제된 댓글입니다]',
          date: '2시간 전',
          likes: 0,
          dislikes: 0,
          userVote: null,
          depth: 0,
          authorId: 'user999',
          isDeleted: true,
          replies: []
        }
      ],
      total: 3
    },
    error: null,
    mutate: jest.fn(),
    isLoading: false,
  }),
}));

// Mock fetch
global.fetch = jest.fn();

describe('CommentSection - 중첩 댓글 및 투표/삭제 기능', () => {
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

  test('삭제된 댓글이 올바르게 표시되어야 한다', () => {
    const { getByText } = render(<CommentSection postId="test-post-1" />);
    expect(getByText('[삭제된 댓글입니다]')).toBeInTheDocument();
  });

  test('좋아요/비추천 버튼이 표시되어야 한다', () => {
    const { getAllByText } = render(<CommentSection postId="test-post-1" />);
    const likeButtons = getAllByText('5'); // 좋아요 수
    const dislikeButtons = getAllByText('1'); // 비추천 수
    expect(likeButtons.length).toBeGreaterThan(0);
    expect(dislikeButtons.length).toBeGreaterThan(0);
  });

  test('본인 댓글에 삭제 버튼이 표시되어야 한다', () => {
    const { getAllByText } = render(<CommentSection postId="test-post-1" />);
    const deleteButtons = getAllByText('삭제');
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  test('답글 버튼이 삭제되지 않은 댓글에만 표시되어야 한다', () => {
    const { getAllByText } = render(<CommentSection postId="test-post-1" />);
    const replyButtons = getAllByText('답글');
    // 삭제된 댓글에는 답글 버튼이 없어야 함
    expect(replyButtons.length).toBe(2); // 최상위 댓글과 첫 번째 답글에만
  });
}); 
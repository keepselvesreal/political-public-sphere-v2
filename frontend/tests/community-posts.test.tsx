/*
목차:
- CommunityPostList 컴포넌트 테스트 (라인 1-100)
- 기본 렌더링 및 상호작용 테스트 (라인 101-150)

작성자: AI Assistant
작성일: 2025-01-28
최종 수정: 2025-01-28 (TDD 테스트 구현 - 타입 오류 수정)
*/

import { render, screen, fireEvent } from '@testing-library/react';
import { CommunityPostList } from '@/components/community-posts/community-post-list';

// Mock useRouter
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// 테스트용 더미 데이터
const mockPosts = [
  {
    _id: '1',
    post_id: 'test_1',
    community: 'FM코리아',
    site: 'fmkorea',
    title: '테스트 게시글 1',
    author: '테스트유저1',
    created_at: '2025-01-28T00:00:00Z',
    views: 100,
    likes: 10,
    dislikes: 2,
    comments_count: 5,
    category: '정치',
    content: '테스트 내용 1',
    comments: [],
    likes_per_view: 0.1,
    comments_per_view: 0.05,
    views_per_exposure_hour: 10
  },
  {
    _id: '2',
    post_id: 'test_2',
    community: '루리웹',
    site: 'ruliweb',
    title: '테스트 게시글 2',
    author: '테스트유저2',
    created_at: '2025-01-27T00:00:00Z',
    views: 200,
    likes: 30,
    dislikes: 5,
    comments_count: 15,
    category: '사회',
    content: '테스트 내용 2',
    comments: [],
    likes_per_view: 0.15,
    comments_per_view: 0.075,
    views_per_exposure_hour: 15
  }
];

describe('CommunityPostList 컴포넌트', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  test('게시글 목록이 올바르게 렌더링된다', () => {
    render(
      <CommunityPostList
        likesPerView={mockPosts}
        commentsPerView={mockPosts}
        viewsPerHour={mockPosts}
      />
    );

    // 게시글 제목이 표시되는지 확인
    expect(screen.getByText('테스트 게시글 1')).toBeInTheDocument();
    expect(screen.getByText('테스트 게시글 2')).toBeInTheDocument();
  });

  test('메트릭 드롭다운이 존재한다', () => {
    render(
      <CommunityPostList
        likesPerView={mockPosts}
        commentsPerView={[]}
        viewsPerHour={[]}
      />
    );

    // 드롭다운이 존재하는지 확인
    const selectTrigger = screen.getByRole('combobox');
    expect(selectTrigger).toBeInTheDocument();
  });

  test('커뮤니티별로 게시글이 그룹화된다', () => {
    render(
      <CommunityPostList
        likesPerView={mockPosts}
        commentsPerView={[]}
        viewsPerHour={[]}
      />
    );

    // 커뮤니티 섹션 헤더가 표시되는지 확인
    expect(screen.getByText(/fmkorea 게시글/)).toBeInTheDocument();
    expect(screen.getByText(/ruliweb 게시글/)).toBeInTheDocument();
  });

  test('게시글 메트릭 정보가 표시된다', () => {
    render(
      <CommunityPostList
        likesPerView={mockPosts}
        commentsPerView={[]}
        viewsPerHour={[]}
      />
    );

    // 메트릭 정보가 표시되는지 확인
    expect(screen.getByText(/👀 100/)).toBeInTheDocument();
    expect(screen.getByText(/👍 10/)).toBeInTheDocument();
    expect(screen.getByText(/💬 5/)).toBeInTheDocument();
  });

  test('더보기 버튼이 많은 게시글에서 표시된다', () => {
    const manyPosts = Array.from({ length: 5 }, (_, i) => ({
      ...mockPosts[0],
      _id: `${i + 1}`,
      title: `테스트 게시글 ${i + 1}`
    }));

    render(
      <CommunityPostList
        likesPerView={manyPosts}
        commentsPerView={[]}
        viewsPerHour={[]}
      />
    );

    // 더보기 버튼이 표시되는지 확인
    const moreButton = screen.getByText(/더보기/);
    expect(moreButton).toBeInTheDocument();

    // 더보기 버튼 클릭
    fireEvent.click(moreButton);

    // 접기 버튼으로 변경되었는지 확인
    expect(screen.getByText('접기')).toBeInTheDocument();
  });

  test('빈 데이터에서도 오류 없이 렌더링된다', () => {
    render(
      <CommunityPostList
        likesPerView={[]}
        commentsPerView={[]}
        viewsPerHour={[]}
      />
    );

    // 통계 정보가 표시되는지 확인
    expect(screen.getByText(/0개 게시글 표시 중/)).toBeInTheDocument();
  });
}); 
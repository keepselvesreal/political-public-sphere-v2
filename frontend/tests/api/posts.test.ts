/*
목차:
- Posts API 테스트
- POST /api/posts 테스트 (게시글 작성)
- GET /api/posts 테스트 (게시글 목록)
- MongoDB 연결 및 데이터 검증
*/

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/posts/route';

// Mock MongoDB 연결
jest.mock('@/lib/mongoose', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
}));

// Mock Post 모델
const mockSave = jest.fn();
const mockFind = jest.fn();
const mockCountDocuments = jest.fn();

jest.mock('@/lib/models/Post', () => {
  return jest.fn().mockImplementation((data) => ({
    ...data,
    _id: 'mock-id-' + Date.now(),
    createdAt: new Date().toISOString(),
    save: mockSave,
  }));
});

// Post 모델의 static 메서드 모킹
const MockPost = require('@/lib/models/Post');
MockPost.find = mockFind;
MockPost.countDocuments = mockCountDocuments;

describe('/api/posts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/posts', () => {
    it('유효한 데이터로 게시글을 성공적으로 작성해야 함', async () => {
      // Arrange
      const postData = {
        title: '테스트 게시글',
        winner: '후보 A',
        gap: 15.5,
        keywords: ['테스트', '선거'],
        content: '이것은 테스트 게시글 내용입니다.',
        authorId: 'test-user-123'
      };

      const expectedSavedPost = {
        ...postData,
        _id: 'mock-id-123',
        votes: { up: 0, down: 0 },
        likes: 0,
        views: 0,
        createdAt: new Date().toISOString()
      };

      mockSave.mockResolvedValue(expectedSavedPost);

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify(postData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await POST(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(mockSave).toHaveBeenCalledTimes(1);
      expect(result.title).toBe(postData.title);
      expect(result.winner).toBe(postData.winner);
      expect(result.gap).toBe(postData.gap);
      expect(result.votes).toEqual({ up: 0, down: 0 });
    });

    it('필수 필드가 누락된 경우 400 에러를 반환해야 함', async () => {
      // Arrange
      const invalidData = {
        title: '테스트 게시글',
        // winner 누락
        gap: 15.5,
        content: '내용',
        authorId: 'test-user'
      };

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      // Act
      const response = await POST(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result.error).toContain('필수 필드가 누락되었습니다');
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('잘못된 gap 값에 대해 400 에러를 반환해야 함', async () => {
      // Arrange
      const invalidData = {
        title: '테스트 게시글',
        winner: '후보 A',
        gap: 150, // 100을 초과하는 잘못된 값
        content: '내용',
        authorId: 'test-user'
      };

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      // Act
      const response = await POST(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(result.error).toContain('득표율 격차는 0-100 사이의 숫자여야 합니다');
    });
  });

  describe('GET /api/posts', () => {
    it('게시글 목록을 성공적으로 반환해야 함', async () => {
      // Arrange
      const mockPosts = [
        {
          _id: 'post-1',
          title: '테스트 게시글 1',
          winner: '후보 A',
          gap: 10,
          votes: { up: 5, down: 1 },
          keywords: ['테스트'],
          authorId: 'user-1',
          createdAt: new Date().toISOString(),
          likes: 5,
          views: 100
        }
      ];

      mockFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockPosts)
              })
            })
          })
        })
      });

      mockCountDocuments.mockResolvedValue(1);

      const request = new NextRequest('http://localhost:3000/api/posts?skip=0&limit=10');

      // Act
      const response = await GET(request);
      const result = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(result.posts).toEqual(mockPosts);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.hasMore).toBe(false);
    });
  });
}); 
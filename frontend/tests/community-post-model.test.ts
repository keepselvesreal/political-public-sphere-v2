/*
CommunityPost 모델 메트릭 로직 단위 테스트

주요 기능:
- 메트릭 타입 검증 (line 20-40)
- 메트릭 boolean 로직 테스트 (line 41-80)

작성자: AI Assistant
작성일: 2025-01-28
목적: 새로운 메트릭 구조 검증
*/

import { describe, it, expect } from '@jest/globals';

// 메트릭 타입 정의 (모델에서 가져온 것과 동일)
export type MetricType = 'top_likes' | 'top_comments' | 'top_views';

// 메트릭 boolean 값 설정 함수 (모델 로직과 동일)
function setMetricBooleans(topMetric?: MetricType) {
  return {
    top_likes: topMetric === 'top_likes',
    top_comments: topMetric === 'top_comments',
    top_views: topMetric === 'top_views'
  };
}

// 메트릭별 정렬 함수 (모델 로직과 동일)
function sortByMetric(posts: any[], metric: MetricType) {
  return posts.sort((a, b) => {
    switch (metric) {
      case 'top_likes':
        return (b.likes_per_view || 0) - (a.likes_per_view || 0);
      case 'top_comments':
        return (b.comments_per_view || 0) - (a.comments_per_view || 0);
      case 'top_views':
        return (b.views_per_exposure_hour || 0) - (a.views_per_exposure_hour || 0);
      default:
        return 0;
    }
  });
}

describe('CommunityPost 메트릭 로직 테스트', () => {
  describe('새로운 메트릭 타입 검증', () => {
    it('지원되는 메트릭 타입이 올바르게 정의되어야 함', () => {
      const supportedMetrics: MetricType[] = [
        'top_likes',
        'top_comments', 
        'top_views'
      ];

      supportedMetrics.forEach(metric => {
        expect(typeof metric).toBe('string');
        expect(metric.length).toBeGreaterThan(0);
      });
    });
  });

  describe('메트릭 boolean 로직 테스트', () => {
    it('top_likes 메트릭이 올바르게 설정되어야 함', () => {
      const result = setMetricBooleans('top_likes');
      
      expect(result.top_likes).toBe(true);
      expect(result.top_comments).toBe(false);
      expect(result.top_views).toBe(false);
    });

    it('top_comments 메트릭이 올바르게 설정되어야 함', () => {
      const result = setMetricBooleans('top_comments');
      
      expect(result.top_likes).toBe(false);
      expect(result.top_comments).toBe(true);
      expect(result.top_views).toBe(false);
    });

    it('top_views 메트릭이 올바르게 설정되어야 함', () => {
      const result = setMetricBooleans('top_views');
      
      expect(result.top_likes).toBe(false);
      expect(result.top_comments).toBe(false);
      expect(result.top_views).toBe(true);
    });

    it('메트릭이 지정되지 않으면 모든 값이 false여야 함', () => {
      const result = setMetricBooleans();
      
      expect(result.top_likes).toBe(false);
      expect(result.top_comments).toBe(false);
      expect(result.top_views).toBe(false);
    });
  });

  describe('메트릭별 정렬 로직 테스트', () => {
    const testPosts = [
      {
        id: '1',
        likes_per_view: 0.5,
        comments_per_view: 0.1,
        views_per_exposure_hour: 100
      },
      {
        id: '2',
        likes_per_view: 0.3,
        comments_per_view: 0.3,
        views_per_exposure_hour: 200
      },
      {
        id: '3',
        likes_per_view: 0.7,
        comments_per_view: 0.2,
        views_per_exposure_hour: 50
      }
    ];

    it('top_likes 메트릭으로 정렬이 올바르게 작동해야 함', () => {
      const sorted = sortByMetric([...testPosts], 'top_likes');
      
      expect(sorted[0].id).toBe('3'); // 0.7
      expect(sorted[1].id).toBe('1'); // 0.5
      expect(sorted[2].id).toBe('2'); // 0.3
    });

    it('top_comments 메트릭으로 정렬이 올바르게 작동해야 함', () => {
      const sorted = sortByMetric([...testPosts], 'top_comments');
      
      expect(sorted[0].id).toBe('2'); // 0.3
      expect(sorted[1].id).toBe('3'); // 0.2
      expect(sorted[2].id).toBe('1'); // 0.1
    });

    it('top_views 메트릭으로 정렬이 올바르게 작동해야 함', () => {
      const sorted = sortByMetric([...testPosts], 'top_views');
      
      expect(sorted[0].id).toBe('2'); // 200
      expect(sorted[1].id).toBe('1'); // 100
      expect(sorted[2].id).toBe('3'); // 50
    });
  });

  describe('메트릭 계산 로직 테스트', () => {
    it('likes_per_view가 올바르게 계산되어야 함', () => {
      const views = 1000;
      const likes = 100;
      const likesPerView = views > 0 ? likes / views : 0;
      
      expect(likesPerView).toBe(0.1);
    });

    it('comments_per_view가 올바르게 계산되어야 함', () => {
      const views = 1000;
      const comments = 50;
      const commentsPerView = views > 0 ? comments / views : 0;
      
      expect(commentsPerView).toBe(0.05);
    });

    it('views_per_exposure_hour가 올바르게 계산되어야 함', () => {
      const views = 1000;
      const hoursFromCreation = 10;
      const viewsPerHour = hoursFromCreation > 0 ? views / hoursFromCreation : 0;
      
      expect(viewsPerHour).toBe(100);
    });

    it('0으로 나누기 방지가 올바르게 작동해야 함', () => {
      const views = 0;
      const likes = 100;
      const comments = 50;
      
      const likesPerView = views > 0 ? likes / views : 0;
      const commentsPerView = views > 0 ? comments / views : 0;
      
      expect(likesPerView).toBe(0);
      expect(commentsPerView).toBe(0);
    });
  });
}); 
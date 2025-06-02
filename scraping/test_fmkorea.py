"""
FM코리아 스크래퍼 테스트 실행 스크립트

주요 기능:
- test_scraping: 실제 FM코리아 스크래핑 테스트 (line 20-70)
- validate_comment_extraction: 댓글 추출 검증 (line 72-90)
- main: 메인 실행 함수 (line 92-120)

작성자: AI Assistant
작성일: 2025-01-28 16:00 KST
수정일: 2025-01-28 16:40 KST - 댓글 추출 검증 추가
"""

import asyncio
import json
import sys
import os
from datetime import datetime
from loguru import logger

# 상위 디렉토리를 sys.path에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scraping.scrapers.fmkorea_scraper import scrape_fmkorea


def validate_comment_extraction(result: dict) -> bool:
    """
    댓글 추출 검증 함수
    
    Args:
        result: 스크래핑 결과
        
    Returns:
        bool: 댓글 추출 성공 여부
    """
    try:
        top_posts = result.get('top_posts', {})
        total_comments_extracted = 0
        total_posts_with_comments = 0
        posts_with_comment_extraction = 0
        
        # 각 메트릭별 상위 게시글 확인
        for metric, posts in top_posts.items():
            for post in posts:
                # 댓글수가 0보다 큰 게시글 확인
                if post.get('comment_count', 0) > 0:
                    total_posts_with_comments += 1
                    
                    # 실제 댓글이 추출되었는지 확인
                    comments = post.get('comments', [])
                    if comments and len(comments) > 0:
                        posts_with_comment_extraction += 1
                        total_comments_extracted += len(comments)
                        
                        # 댓글 데이터 구조 검증
                        for comment in comments:
                            required_fields = ['author', 'content', 'date']
                            for field in required_fields:
                                if field not in comment or not comment[field]:
                                    logger.warning(f"⚠️ 댓글 필드 누락: {field}")
        
        logger.info(f"📊 댓글 추출 검증 결과:")
        logger.info(f"  - 댓글이 있는 게시글: {total_posts_with_comments}개")
        logger.info(f"  - 댓글 추출 성공 게시글: {posts_with_comment_extraction}개")
        logger.info(f"  - 총 추출된 댓글: {total_comments_extracted}개")
        
        # 댓글이 있는 게시글 중 50% 이상에서 댓글 추출 성공하면 통과
        if total_posts_with_comments > 0:
            success_rate = posts_with_comment_extraction / total_posts_with_comments
            logger.info(f"  - 댓글 추출 성공률: {success_rate:.1%}")
            return success_rate >= 0.5
        else:
            logger.info("  - 댓글이 있는 게시글이 없어 검증 불가")
            return True  # 댓글이 없으면 통과
            
    except Exception as e:
        logger.error(f"💥 댓글 추출 검증 실패: {e}")
        return False


async def test_scraping():
    """
    FM코리아 스크래핑 테스트 함수
    """
    try:
        logger.info("🚀 FM코리아 스크래핑 테스트 시작")
        
        # 정치 게시판 스크래핑 테스트
        result = await scrape_fmkorea()
        
        if result.get('error'):
            logger.error(f"💥 스크래핑 실패: {result['error']}")
            return False
        
        # 결과 출력
        total_posts = result.get('total_count', 0)
        top_posts = result.get('top_posts', {})
        
        logger.info(f"✅ 스크래핑 완료!")
        logger.info(f"📊 총 게시글 수: {total_posts}개")
        
        # 메트릭별 상위 게시글 정보 출력 (변경된 메트릭 반영)
        metric_names = {
            'likes_per_view': '추천수',
            'comments_per_view': '댓글수',
            'views_per_exposure_hour': '시간당 조회수'
        }
        
        for metric, posts in top_posts.items():
            metric_name = metric_names.get(metric, metric)
            logger.info(f"🏆 {metric_name} 상위 {len(posts)}개:")
            for i, post in enumerate(posts, 1):
                metric_value = post.get('metrics', {}).get(metric, 0)
                comment_count = len(post.get('comments', []))
                logger.info(f"  {i}. {post.get('title', 'N/A')} (조회수: {post.get('view_count', 0)}, {metric_name}: {metric_value}, 추출된 댓글: {comment_count}개)")
        
        # 댓글 추출 검증
        comment_validation = validate_comment_extraction(result)
        if comment_validation:
            logger.info("✅ 댓글 추출 검증 통과!")
        else:
            logger.error("❌ 댓글 추출 검증 실패!")
            return False
        
        # 결과를 JSON 파일로 저장
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"fmkorea_test_result_{timestamp}.json"
        
        # datetime 객체를 문자열로 변환
        result_copy = result.copy()
        if 'scraped_at' in result_copy:
            result_copy['scraped_at'] = result_copy['scraped_at'].isoformat()
        
        for posts_list in result_copy.get('all_posts', []):
            if 'scraped_at' in posts_list:
                posts_list['scraped_at'] = posts_list['scraped_at'].isoformat()
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(result_copy, f, ensure_ascii=False, indent=2)
        
        logger.info(f"💾 결과 저장: {filename}")
        return True
        
    except Exception as e:
        logger.error(f"💥 테스트 실행 중 오류: {e}")
        return False


def main():
    """
    메인 실행 함수
    """
    logger.info("=" * 50)
    logger.info("🧪 FM코리아 스크래퍼 테스트 (댓글 추출 검증 포함)")
    logger.info("=" * 50)
    
    # 비동기 실행
    success = asyncio.run(test_scraping())
    
    if success:
        logger.info("🎉 테스트 성공!")
    else:
        logger.error("💥 테스트 실패!")
    
    logger.info("=" * 50)


if __name__ == "__main__":
    main() 
 """
통합 스크래퍼 사용 예제

주요 기능:
- 추상 기본 클래스 기반 통합 스크래핑 (line 20-60)
- 지표별 선별 로직 적용 (line 62-120)
- CommunityPost 모델 출력 (line 122-180)
- MongoDB 저장 통합 (line 182-220)

작성자: AI Assistant
작성일: 2025-01-28
목적: TDD로 개발된 통합 스크래퍼 구조 실제 활용 예제
"""

import asyncio
import pymongo
from datetime import datetime
from typing import Dict, List, Any
from loguru import logger

# 통합 스크래퍼 import
from scraping.scrapers.fmkorea_scraper_v2 import FMKoreaScraper
from scraping.scrapers.ruliweb_scraper_v2 import RuliwebScraper
from scripts.community_post_utils import CommunityPostManager, SelectionCriteria


async def scrape_fmkorea_with_selection():
    """FM코리아 지표별 선별 스크래핑 예제"""
    logger.info("🚀 FM코리아 지표별 선별 스크래핑 시작")
    
    # FM코리아 정치 게시판
    board_url = "https://www.fmkorea.com/index.php?mid=politics"
    
    async with FMKoreaScraper() as scraper:
        # 지표별 선별 스크래핑 (각 기준당 3개씩)
        selected_posts = await scraper.scrape_board_with_selection(board_url, criteria_count=3)
        
        logger.info(f"✅ FM코리아 선별 완료:")
        for criteria, posts in selected_posts.items():
            logger.info(f"  - {criteria}: {len(posts)}개")
            for post in posts:
                logger.info(f"    📝 {post['title'][:40]}... (추천:{post['like_count']}, 댓글:{post['comment_count']}, 조회:{post['view_count']})")
        
        return selected_posts


async def scrape_ruliweb_with_selection():
    """루리웹 지표별 선별 스크래핑 예제"""
    logger.info("🚀 루리웹 지표별 선별 스크래핑 시작")
    
    # 루리웹 자유게시판
    board_url = "https://bbs.ruliweb.com/community/board/300143"
    
    async with RuliwebScraper() as scraper:
        # 지표별 선별 스크래핑 (각 기준당 3개씩)
        selected_posts = await scraper.scrape_board_with_selection(board_url, criteria_count=3)
        
        logger.info(f"✅ 루리웹 선별 완료:")
        for criteria, posts in selected_posts.items():
            logger.info(f"  - {criteria}: {len(posts)}개")
            for post in posts:
                logger.info(f"    📝 {post['title'][:40]}... (추천:{post['like_count']}, 댓글:{post['comment_count']}, 조회:{post['view_count']})")
        
        return selected_posts


async def scrape_post_details_with_criteria(scraper, selected_posts: Dict[str, List[Dict]], site: str):
    """선별된 게시글들의 상세 정보 스크래핑"""
    logger.info(f"🔍 {site} 선별된 게시글 상세 스크래핑 시작")
    
    detailed_posts = {}
    
    for criteria_name, posts in selected_posts.items():
        detailed_posts[criteria_name] = []
        
        # SelectionCriteria enum으로 변환
        try:
            criteria_enum = SelectionCriteria(criteria_name)
        except ValueError:
            logger.warning(f"⚠️ 알 수 없는 선별 기준: {criteria_name}")
            continue
        
        for post in posts:
            try:
                logger.info(f"📖 상세 스크래핑: {post['title'][:30]}...")
                
                # 게시글 상세 스크래핑
                post_detail = await scraper.scrape_post_detail(post['post_url'])
                
                # 선별 기준 정보 추가
                post_detail['selection_criteria'] = criteria_enum.value
                post_detail['site'] = site
                
                detailed_posts[criteria_name].append(post_detail)
                
                logger.info(f"✅ 상세 스크래핑 완료: 콘텐츠 {len(post_detail.get('content', []))}개, 댓글 {len(post_detail.get('comments', []))}개")
                
            except Exception as e:
                logger.error(f"💥 상세 스크래핑 실패: {post['title'][:30]}... - {e}")
                continue
    
    return detailed_posts


async def save_to_mongodb(detailed_posts: Dict[str, List[Dict]], site: str):
    """MongoDB에 CommunityPost 모델로 저장"""
    logger.info(f"💾 {site} 게시글 MongoDB 저장 시작")
    
    # MongoDB 연결 (실제 환경에서는 환경변수 사용)
    mongodb_uri = "mongodb://localhost:27017/"
    
    try:
        manager = CommunityPostManager(mongodb_uri)
        
        save_stats = {}
        total_saved = 0
        
        for criteria_name, posts in detailed_posts.items():
            saved_count = 0
            
            # SelectionCriteria enum으로 변환
            try:
                criteria_enum = SelectionCriteria(criteria_name)
            except ValueError:
                logger.warning(f"⚠️ 알 수 없는 선별 기준: {criteria_name}")
                continue
            
            for post_detail in posts:
                try:
                    # CommunityPost 모델로 변환 및 저장
                    success = manager.convert_and_save(post_detail, site, criteria_enum)
                    if success:
                        saved_count += 1
                        total_saved += 1
                except Exception as e:
                    logger.error(f"💥 저장 실패: {e}")
                    continue
            
            save_stats[criteria_name] = saved_count
            logger.info(f"✅ {criteria_name} 기준 저장: {saved_count}/{len(posts)}개")
        
        # 통계 조회
        stats = manager.get_stats(site)
        logger.info(f"📊 {site} 저장 통계:")
        logger.info(f"  - 총 게시글: {stats['total_posts']}개")
        logger.info(f"  - 기준별 통계: {stats['criteria_stats']}")
        
        manager.close()
        
        return save_stats, total_saved
        
    except Exception as e:
        logger.error(f"💥 MongoDB 저장 실패: {e}")
        return {}, 0


async def unified_scraping_workflow():
    """통합 스크래핑 워크플로우 예제"""
    logger.info("🌟 통합 스크래핑 워크플로우 시작")
    
    start_time = datetime.now()
    
    try:
        # 1단계: 게시판 목록 스크래핑 및 선별
        logger.info("📋 1단계: 게시판 목록 스크래핑 및 선별")
        
        # FM코리아 선별
        fmkorea_selected = await scrape_fmkorea_with_selection()
        
        # 루리웹 선별
        ruliweb_selected = await scrape_ruliweb_with_selection()
        
        # 2단계: 선별된 게시글 상세 스크래핑
        logger.info("🔍 2단계: 선별된 게시글 상세 스크래핑")
        
        # FM코리아 상세 스크래핑
        async with FMKoreaScraper() as fmkorea_scraper:
            fmkorea_detailed = await scrape_post_details_with_criteria(
                fmkorea_scraper, fmkorea_selected, 'fmkorea'
            )
        
        # 루리웹 상세 스크래핑
        async with RuliwebScraper() as ruliweb_scraper:
            ruliweb_detailed = await scrape_post_details_with_criteria(
                ruliweb_scraper, ruliweb_selected, 'ruliweb'
            )
        
        # 3단계: MongoDB 저장
        logger.info("💾 3단계: CommunityPost 모델로 MongoDB 저장")
        
        # FM코리아 저장
        fmkorea_save_stats, fmkorea_saved = await save_to_mongodb(fmkorea_detailed, 'fmkorea')
        
        # 루리웹 저장
        ruliweb_save_stats, ruliweb_saved = await save_to_mongodb(ruliweb_detailed, 'ruliweb')
        
        # 4단계: 결과 요약
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        logger.info("🎉 통합 스크래핑 워크플로우 완료!")
        logger.info(f"⏱️ 총 소요시간: {duration:.2f}초")
        logger.info(f"📊 최종 결과:")
        logger.info(f"  - FM코리아: {fmkorea_saved}개 저장")
        logger.info(f"  - 루리웹: {ruliweb_saved}개 저장")
        logger.info(f"  - 총 저장: {fmkorea_saved + ruliweb_saved}개")
        
        return {
            'fmkorea': {
                'selected': fmkorea_selected,
                'detailed': fmkorea_detailed,
                'saved': fmkorea_saved,
                'save_stats': fmkorea_save_stats
            },
            'ruliweb': {
                'selected': ruliweb_selected,
                'detailed': ruliweb_detailed,
                'saved': ruliweb_saved,
                'save_stats': ruliweb_save_stats
            },
            'duration': duration
        }
        
    except Exception as e:
        logger.error(f"💥 통합 스크래핑 워크플로우 실패: {e}")
        return None


async def quick_test_example():
    """빠른 테스트 예제 (저장 없이 스크래핑만)"""
    logger.info("⚡ 빠른 테스트 시작 (저장 없이 스크래핑만)")
    
    try:
        # FM코리아 빠른 테스트
        async with FMKoreaScraper() as scraper:
            board_url = "https://www.fmkorea.com/index.php?mid=politics"
            posts = await scraper.scrape_board_list(board_url)
            
            logger.info(f"✅ FM코리아: {len(posts)}개 게시글 추출")
            if posts:
                logger.info(f"📝 첫 번째 게시글: {posts[0]['title'][:50]}...")
        
        # 루리웹 빠른 테스트
        async with RuliwebScraper() as scraper:
            board_url = "https://bbs.ruliweb.com/community/board/300143"
            posts = await scraper.scrape_board_list(board_url)
            
            logger.info(f"✅ 루리웹: {len(posts)}개 게시글 추출")
            if posts:
                logger.info(f"📝 첫 번째 게시글: {posts[0]['title'][:50]}...")
        
        logger.info("🎉 빠른 테스트 완료!")
        
    except Exception as e:
        logger.error(f"💥 빠른 테스트 실패: {e}")


if __name__ == "__main__":
    # 사용 예제 선택
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "quick":
        # 빠른 테스트
        asyncio.run(quick_test_example())
    elif len(sys.argv) > 1 and sys.argv[1] == "fmkorea":
        # FM코리아만 테스트
        asyncio.run(scrape_fmkorea_with_selection())
    elif len(sys.argv) > 1 and sys.argv[1] == "ruliweb":
        # 루리웹만 테스트
        asyncio.run(scrape_ruliweb_with_selection())
    else:
        # 전체 워크플로우
        result = asyncio.run(unified_scraping_workflow())
        if result:
            print("\n🎯 워크플로우 성공!")
            print(f"📊 FM코리아: {result['fmkorea']['saved']}개 저장")
            print(f"📊 루리웹: {result['ruliweb']['saved']}개 저장")
            print(f"⏱️ 소요시간: {result['duration']:.2f}초")
        else:
            print("\n❌ 워크플로우 실패!")
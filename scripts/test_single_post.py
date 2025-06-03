"""
개별 게시글 상세 스크래핑 테스트

주요 기능:
- 특정 게시글 URL로 상세 스크래핑 테스트 (line 20-60)
- 스크래핑 과정 상세 로깅 (line 62-100)
- 문제점 진단 및 해결 방안 제시 (line 102-150)

작성자: AI Assistant
작성일: 2025-01-28
목적: 상세 스크래핑 실패 원인 분석
"""

import asyncio
import json
import sys
from pathlib import Path
from loguru import logger

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from scraping.scrapers.fmkorea_scraper_v2 import FMKoreaScraper
from scraping.scrapers.ruliweb_scraper_v2 import RuliwebScraper


async def test_fmkorea_single_post():
    """FM코리아 개별 게시글 상세 테스트"""
    logger.info("🧪 FM코리아 개별 게시글 테스트 시작")
    
    # 테스트할 게시글 URL (최근 스크래핑된 것 중 하나)
    test_url = "https://www.fmkorea.com/8468491390"
    
    try:
        async with FMKoreaScraper() as scraper:
            logger.info(f"🔗 테스트 URL: {test_url}")
            
            # 페이지 이동
            logger.info("📄 페이지 이동 중...")
            await scraper.navigate_to_post(test_url)
            
            # 페이지 로딩 확인
            page_title = await scraper.page.title()
            logger.info(f"📋 페이지 제목: {page_title}")
            
            # 게시글 요소 대기
            logger.info("⏳ 게시글 요소 대기 중...")
            await scraper.wait_for_post_elements()
            
            # 메타데이터 추출 테스트
            logger.info("📊 메타데이터 추출 테스트...")
            metadata = await scraper.extract_post_metadata()
            logger.info(f"✅ 메타데이터: {metadata}")
            
            # 본문 컨테이너 확인
            logger.info("📝 본문 컨테이너 확인...")
            for selector in scraper.site_config.selectors['post_container']:
                try:
                    element = await scraper.page.query_selector(selector)
                    if element:
                        text_content = await element.inner_text()
                        logger.info(f"✅ 컨테이너 발견 ({selector}): {len(text_content)}자")
                        logger.info(f"   내용 미리보기: {text_content[:100]}...")
                        break
                    else:
                        logger.warning(f"❌ 컨테이너 없음: {selector}")
                except Exception as e:
                    logger.warning(f"💥 컨테이너 확인 실패 ({selector}): {e}")
            
            # 본문 콘텐츠 추출 테스트
            logger.info("📄 본문 콘텐츠 추출 테스트...")
            content = await scraper.extract_content_in_order()
            logger.info(f"✅ 본문 콘텐츠: {len(content)}개 요소")
            
            if content:
                for i, item in enumerate(content[:3]):  # 처음 3개만 출력
                    logger.info(f"   [{i+1}] {item.get('type', 'unknown')}: {str(item.get('data', {}))[:100]}...")
            
            # 댓글 컨테이너 확인
            logger.info("💬 댓글 컨테이너 확인...")
            for selector in scraper.site_config.selectors['comment_container']:
                try:
                    element = await scraper.page.query_selector(selector)
                    if element:
                        comment_elements = await element.query_selector_all('*')
                        logger.info(f"✅ 댓글 컨테이너 발견 ({selector}): {len(comment_elements)}개 하위 요소")
                        break
                    else:
                        logger.warning(f"❌ 댓글 컨테이너 없음: {selector}")
                except Exception as e:
                    logger.warning(f"💥 댓글 컨테이너 확인 실패 ({selector}): {e}")
            
            # 댓글 추출 테스트
            logger.info("💬 댓글 추출 테스트...")
            comments = await scraper.extract_comments_data()
            logger.info(f"✅ 댓글: {len(comments)}개")
            
            if comments:
                for i, comment in enumerate(comments[:2]):  # 처음 2개만 출력
                    logger.info(f"   [{i+1}] {comment.get('author', 'Unknown')}: {comment.get('content', '')[:50]}...")
            
            # 전체 상세 스크래핑 테스트
            logger.info("🎯 전체 상세 스크래핑 테스트...")
            post_detail = await scraper.scrape_post_detail(test_url)
            
            if post_detail:
                logger.info("✅ 전체 상세 스크래핑 성공!")
                logger.info(f"   - 메타데이터: {len(post_detail.get('metadata', {}))}개 필드")
                logger.info(f"   - 본문: {len(post_detail.get('content', []))}개 요소")
                logger.info(f"   - 댓글: {len(post_detail.get('comments', []))}개")
                return post_detail
            else:
                logger.error("❌ 전체 상세 스크래핑 실패")
                return None
            
    except Exception as e:
        logger.error(f"💥 FM코리아 개별 게시글 테스트 실패: {e}")
        return None


async def test_ruliweb_single_post():
    """루리웹 개별 게시글 상세 테스트"""
    logger.info("🧪 루리웹 개별 게시글 테스트 시작")
    
    # 테스트할 게시글 URL (최근 스크래핑된 것 중 하나)
    test_url = "https://bbs.ruliweb.com/community/board/300148/read/38050322"
    
    try:
        async with RuliwebScraper() as scraper:
            logger.info(f"🔗 테스트 URL: {test_url}")
            
            # 페이지 이동
            logger.info("📄 페이지 이동 중...")
            await scraper.navigate_to_post(test_url)
            
            # 페이지 로딩 확인
            page_title = await scraper.page.title()
            logger.info(f"📋 페이지 제목: {page_title}")
            
            # 게시글 요소 대기
            logger.info("⏳ 게시글 요소 대기 중...")
            await scraper.wait_for_post_elements()
            
            # 메타데이터 추출 테스트
            logger.info("📊 메타데이터 추출 테스트...")
            metadata = await scraper.extract_post_metadata()
            logger.info(f"✅ 메타데이터: {metadata}")
            
            # 본문 컨테이너 확인
            logger.info("📝 본문 컨테이너 확인...")
            for selector in scraper.site_config.selectors['post_container']:
                try:
                    element = await scraper.page.query_selector(selector)
                    if element:
                        text_content = await element.inner_text()
                        logger.info(f"✅ 컨테이너 발견 ({selector}): {len(text_content)}자")
                        logger.info(f"   내용 미리보기: {text_content[:100]}...")
                        break
                    else:
                        logger.warning(f"❌ 컨테이너 없음: {selector}")
                except Exception as e:
                    logger.warning(f"💥 컨테이너 확인 실패 ({selector}): {e}")
            
            # 본문 콘텐츠 추출 테스트
            logger.info("📄 본문 콘텐츠 추출 테스트...")
            content = await scraper.extract_content_in_order()
            logger.info(f"✅ 본문 콘텐츠: {len(content)}개 요소")
            
            if content:
                for i, item in enumerate(content[:3]):  # 처음 3개만 출력
                    logger.info(f"   [{i+1}] {item.get('type', 'unknown')}: {str(item.get('data', {}))[:100]}...")
            
            # 댓글 컨테이너 확인
            logger.info("💬 댓글 컨테이너 확인...")
            for selector in scraper.site_config.selectors['comment_container']:
                try:
                    element = await scraper.page.query_selector(selector)
                    if element:
                        comment_elements = await element.query_selector_all('*')
                        logger.info(f"✅ 댓글 컨테이너 발견 ({selector}): {len(comment_elements)}개 하위 요소")
                        break
                    else:
                        logger.warning(f"❌ 댓글 컨테이너 없음: {selector}")
                except Exception as e:
                    logger.warning(f"💥 댓글 컨테이너 확인 실패 ({selector}): {e}")
            
            # 댓글 추출 테스트
            logger.info("💬 댓글 추출 테스트...")
            comments = await scraper.extract_comments_data()
            logger.info(f"✅ 댓글: {len(comments)}개")
            
            if comments:
                for i, comment in enumerate(comments[:2]):  # 처음 2개만 출력
                    logger.info(f"   [{i+1}] {comment.get('author', 'Unknown')}: {comment.get('content', '')[:50]}...")
            
            # 전체 상세 스크래핑 테스트
            logger.info("🎯 전체 상세 스크래핑 테스트...")
            post_detail = await scraper.scrape_post_detail(test_url)
            
            if post_detail:
                logger.info("✅ 전체 상세 스크래핑 성공!")
                logger.info(f"   - 메타데이터: {len(post_detail.get('metadata', {}))}개 필드")
                logger.info(f"   - 본문: {len(post_detail.get('content', []))}개 요소")
                logger.info(f"   - 댓글: {len(post_detail.get('comments', []))}개")
                return post_detail
            else:
                logger.error("❌ 전체 상세 스크래핑 실패")
                return None
            
    except Exception as e:
        logger.error(f"💥 루리웹 개별 게시글 테스트 실패: {e}")
        return None


async def main():
    """메인 실행 함수"""
    logger.info("🚀 개별 게시글 상세 스크래핑 테스트 시작")
    
    results = {}
    
    # FM코리아 테스트
    logger.info("=" * 60)
    fmkorea_result = await test_fmkorea_single_post()
    results["fmkorea"] = fmkorea_result
    
    # 사이트 간 간격
    await asyncio.sleep(3)
    
    # 루리웹 테스트
    logger.info("=" * 60)
    ruliweb_result = await test_ruliweb_single_post()
    results["ruliweb"] = ruliweb_result
    
    # 결과 요약
    logger.info("=" * 60)
    logger.info("📊 테스트 결과 요약:")
    
    for site_name, result in results.items():
        if result:
            logger.info(f"✅ {site_name}: 성공")
            logger.info(f"   - 본문: {len(result.get('content', []))}개 요소")
            logger.info(f"   - 댓글: {len(result.get('comments', []))}개")
        else:
            logger.error(f"❌ {site_name}: 실패")
    
    logger.info("🎉 개별 게시글 테스트 완료!")


if __name__ == "__main__":
    asyncio.run(main()) 
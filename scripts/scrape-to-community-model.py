"""
CommunityPost 모델로 직접 스크래핑 및 저장 (Playwright 버전)

주요 기능:
- Playwright + Stealth 모드로 봇 차단 우회 (line 20-60)
- CommunityPost 구조로 직접 저장 (line 61-120)
- 정식 스크래퍼 방식 적용 (line 121-160)

작성자: AI Assistant
작성일: 2025-01-28
목적: 새로운 모델 구조로 실제 스크래핑
"""

import asyncio
import pymongo
from datetime import datetime
from typing import Dict, List, Any, Optional
from loguru import logger
import sys
import os

# 정식 스크래퍼 import
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'scraping', 'scrapers'))
from fmkorea_scraper import FMKoreaScraper

from playwright.async_api import async_playwright
from playwright_stealth import stealth_async


class CommunityPostPlaywrightScraper:
    """Playwright 기반 CommunityPost 스크래퍼"""
    
    def __init__(self, mongodb_uri: str):
        self.client = pymongo.MongoClient(mongodb_uri)
        self.db = self.client.political_public_sphere
        self.collection = self.db.community_posts
        
        # 정식 스크래퍼 설정 적용
        self.base_url = "https://www.fmkorea.com"
        
    async def scrape_main_page_posts(self) -> List[Dict[str, Any]]:
        """메인 페이지에서 게시글 URL 목록 수집"""
        try:
            logger.info("🚀 Playwright로 메인 페이지 스크래핑 시작")
            
            playwright = await async_playwright().start()
            
            # 정식 스크래퍼와 동일한 브라우저 설정
            browser = await playwright.chromium.launch(
                headless=False,  # headless=False로 봇 차단 우회
                args=[
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled',
                    '--window-size=1920,1080'
                ]
            )
            
            page = await browser.new_page()
            
            # Stealth 모드 적용
            await stealth_async(page)
            
            # 추가 설정
            await page.set_viewport_size({"width": 1920, "height": 1080})
            await page.set_extra_http_headers({
                'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
            })
            
            # FM코리아 메인 페이지 접속
            await page.goto(self.base_url, wait_until="networkidle", timeout=30000)
            
            # 페이지 로드 확인
            page_title = await page.title()
            logger.info(f"📄 페이지 제목: {page_title}")
            
            # 게시글 링크 수집
            post_links = []
            
            # 다양한 셀렉터로 게시글 링크 찾기
            link_selectors = [
                'a[href*="document_srl"]',
                'a[href*="/board/"]',
                'a[href*="srl="]',
                'a[href*="fmkorea.com/"]'
            ]
            
            for selector in link_selectors:
                try:
                    elements = await page.query_selector_all(selector)
                    logger.info(f"셀렉터 '{selector}': {len(elements)}개 링크 발견")
                    
                    for element in elements[:10]:  # 처음 10개만
                        try:
                            href = await element.get_attribute('href')
                            if href and 'document_srl=' in href:
                                # 절대 URL로 변환
                                if href.startswith('/'):
                                    href = self.base_url + href
                                
                                # 제목 추출
                                title = await element.inner_text()
                                title = title.strip() if title else '제목 없음'
                                
                                # post_id 추출
                                import re
                                post_id_match = re.search(r'document_srl=(\d+)', href)
                                if post_id_match:
                                    post_id = post_id_match.group(1)
                                    
                                    post_links.append({
                                        'post_id': post_id,
                                        'post_url': href,
                                        'title': title
                                    })
                                    
                                    logger.info(f"게시글 발견: {post_id} - {title[:30]}...")
                        except Exception as e:
                            logger.warning(f"링크 처리 실패: {e}")
                            continue
                    
                    if post_links:
                        break  # 링크를 찾았으면 다른 셀렉터는 시도하지 않음
                        
                except Exception as e:
                    logger.warning(f"셀렉터 '{selector}' 처리 실패: {e}")
                    continue
            
            await browser.close()
            await playwright.stop()
            
            logger.info(f"✅ 총 {len(post_links)}개 게시글 링크 수집 완료")
            return post_links
            
        except Exception as e:
            logger.error(f"💥 메인 페이지 스크래핑 실패: {e}")
            return []
    
    async def scrape_post_with_official_scraper(self, post_url: str) -> Optional[Dict[str, Any]]:
        """정식 스크래퍼로 게시글 상세 스크래핑"""
        try:
            logger.info(f"🔍 정식 스크래퍼로 상세 스크래핑: {post_url}")
            
            # 정식 스크래퍼 사용
            async with FMKoreaScraper() as scraper:
                experiment_data = await scraper.scrape_post_detail(post_url)
                
                if experiment_data and 'error' not in experiment_data:
                    # CommunityPost 모델 구조로 변환
                    community_post = self.convert_to_community_post(experiment_data)
                    return community_post
                else:
                    logger.warning(f"정식 스크래퍼 실패: {experiment_data.get('error', '알 수 없는 오류')}")
                    return None
                    
        except Exception as e:
            logger.error(f"💥 정식 스크래퍼 사용 실패: {e}")
            return None
    
    def convert_to_community_post(self, experiment_data: Dict[str, Any]) -> Dict[str, Any]:
        """정식 스크래퍼 결과를 CommunityPost 모델로 변환"""
        try:
            now = datetime.now()
            
            community_post = {
                'post_id': experiment_data.get('post_id'),
                'post_url': experiment_data.get('post_url'),
                'site': 'fmkorea',
                'scraped_at': experiment_data.get('scraped_at', now.isoformat()),
                'metadata': {
                    'title': experiment_data.get('metadata', {}).get('title', '제목 없음'),
                    'author': experiment_data.get('metadata', {}).get('author', '익명'),
                    'date': experiment_data.get('metadata', {}).get('date', now.isoformat()),
                    'view_count': experiment_data.get('metadata', {}).get('view_count', 0),
                    'like_count': experiment_data.get('metadata', {}).get('like_count', 0),
                    'dislike_count': experiment_data.get('metadata', {}).get('dislike_count', 0),
                    'comment_count': experiment_data.get('metadata', {}).get('comment_count', 0)
                },
                'content': experiment_data.get('content', []),
                'comments': experiment_data.get('comments', []),
                'created_at': now,
                'updated_at': now
            }
            
            return community_post
            
        except Exception as e:
            logger.error(f"💥 CommunityPost 변환 실패: {e}")
            return {}
    
    async def save_post(self, post: Dict[str, Any]) -> bool:
        """게시글 저장"""
        try:
            # 중복 확인
            existing = self.collection.find_one({
                'site': 'fmkorea',
                'post_id': post['post_id']
            })
            
            if existing:
                logger.debug(f"이미 존재하는 게시글: {post['post_id']}")
                return False
            
            # 저장
            result = self.collection.insert_one(post)
            
            if result.inserted_id:
                logger.info(f"✅ 게시글 저장 성공: {post['post_id']} - {post['metadata']['title'][:30]}...")
                return True
            else:
                logger.error(f"❌ 게시글 저장 실패: {post['post_id']}")
                return False
                
        except Exception as e:
            logger.error(f"💥 게시글 저장 중 오류: {e}")
            return False
    
    async def scrape_and_save(self, max_posts: int = 5) -> Dict[str, int]:
        """스크래핑 및 저장 실행"""
        stats = {
            'total_found': 0,
            'total_scraped': 0,
            'total_saved': 0,
            'errors': 0
        }
        
        try:
            logger.info(f"🚀 Playwright 기반 CommunityPost 스크래핑 시작 (최대 {max_posts}개)")
            
            # 1. 메인 페이지에서 게시글 링크 수집
            post_links = await self.scrape_main_page_posts()
            stats['total_found'] = len(post_links)
            
            if not post_links:
                logger.warning("⚠️ 게시글 링크를 찾을 수 없습니다.")
                return stats
            
            # 2. 각 게시글 상세 스크래핑
            processed_count = 0
            for post_link in post_links[:max_posts]:
                try:
                    logger.info(f"📝 처리 중: {processed_count + 1}/{min(max_posts, len(post_links))}")
                    
                    # 정식 스크래퍼로 상세 스크래핑
                    community_post = await self.scrape_post_with_official_scraper(post_link['post_url'])
                    
                    if community_post:
                        stats['total_scraped'] += 1
                        
                        # 저장
                        if await self.save_post(community_post):
                            stats['total_saved'] += 1
                    else:
                        stats['errors'] += 1
                    
                    processed_count += 1
                    
                    # 딜레이 (서버 부하 방지)
                    await asyncio.sleep(3)
                    
                except Exception as e:
                    logger.error(f"💥 게시글 처리 실패: {e}")
                    stats['errors'] += 1
                    continue
            
            logger.info(f"✅ 스크래핑 완료: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"💥 스크래핑 중 오류: {e}")
            raise
    
    def get_collection_stats(self) -> Dict[str, int]:
        """저장된 데이터 통계"""
        try:
            total_count = self.collection.count_documents({'site': 'fmkorea'})
            
            # 최근 저장된 게시글
            recent_posts = list(self.collection.find(
                {'site': 'fmkorea'}, 
                {'post_id': 1, 'metadata.title': 1, 'created_at': 1}
            ).sort('created_at', -1).limit(5))
            
            return {
                'total_posts': total_count,
                'recent_posts': recent_posts
            }
            
        except Exception as e:
            logger.error(f"💥 통계 조회 실패: {e}")
            return {'total_posts': 0, 'recent_posts': []}
    
    def close(self):
        """연결 종료"""
        self.client.close()


async def main():
    """메인 실행 함수"""
    mongodb_uri = "mongodb+srv://nadle:miQXsXpzayvMQAzE@cluster0.bh7mhfi.mongodb.net/"
    
    scraper = CommunityPostPlaywrightScraper(mongodb_uri)
    
    try:
        logger.info("🚀 Playwright 기반 CommunityPost 스크래핑 프로세스 시작")
        
        # 1. 현재 상태 확인
        logger.info("1️⃣ 현재 데이터베이스 상태 확인")
        current_stats = scraper.get_collection_stats()
        logger.info(f"현재 저장된 게시글: {current_stats['total_posts']}개")
        
        # 2. 스크래핑 설정 확인
        max_posts = 3  # 테스트용으로 3개만
        
        logger.info(f"스크래핑 설정: 최대 {max_posts}개 게시글")
        
        user_input = input(f"\nPlaywright 스크래핑을 시작하시겠습니까? (y/N): ")
        if user_input.lower() != 'y':
            logger.info("스크래핑 취소됨")
            return
        
        # 3. 스크래핑 실행
        logger.info("2️⃣ Playwright 스크래핑 실행")
        scraping_stats = await scraper.scrape_and_save(max_posts=max_posts)
        
        # 4. 결과 확인
        logger.info("3️⃣ 스크래핑 결과 확인")
        final_stats = scraper.get_collection_stats()
        
        logger.info("✅ Playwright 스크래핑 완료!")
        logger.info(f"스크래핑 통계: {scraping_stats}")
        logger.info(f"최종 저장된 게시글: {final_stats['total_posts']}개")
        
        if final_stats['recent_posts']:
            logger.info("최근 저장된 게시글:")
            for post in final_stats['recent_posts']:
                logger.info(f"  - {post['post_id']}: {post['metadata']['title'][:50]}...")
        
    except Exception as e:
        logger.error(f"💥 스크래핑 중 오류 발생: {e}")
        raise
    finally:
        scraper.close()


if __name__ == "__main__":
    asyncio.run(main()) 
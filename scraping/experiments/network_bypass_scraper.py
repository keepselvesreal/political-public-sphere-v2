#!/usr/bin/env python3
"""
네트워크 차단 우회 스크래퍼 (에펨코리아 + 루리웹)

목차:
1. 모듈 임포트 및 설정 (1-50)
2. 네트워크 우회 설정 클래스 (51-150)
3. 브라우저 설정 최적화 (151-250)
4. 에펨코리아 스크래퍼 (251-400)
5. 루리웹 스크래퍼 (401-550)
6. 통합 실행 함수 (551-650)

작성자: AI Assistant
작성일: 2025년 6월 5일 11:25 (KST)
목적: 공공 도서관 등 제한된 네트워크 환경에서 스크래핑 가능하도록 최적화
"""

import asyncio
import json
import re
import time
import random
from datetime import datetime
from typing import List, Dict, Optional, Any
from urllib.parse import urljoin, urlparse
import pytz
import requests
import os
import sys

from playwright.async_api import async_playwright, Page, Browser
from playwright_stealth import stealth_async
from loguru import logger

# 프로젝트 루트 경로 추가
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(project_root)

class NetworkBypassConfig:
    """네트워크 우회 설정 클래스"""
    
    def __init__(self):
        # 실제 브라우저와 동일한 User-Agent들
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
        ]
        
        # 다양한 접근 URL (HTTP 우선)
        self.fmkorea_urls = [
            'http://www.fmkorea.com',
            'http://m.fmkorea.com',
            'https://www.fmkorea.com',
            'https://m.fmkorea.com'
        ]
        
        self.ruliweb_urls = [
            'http://bbs.ruliweb.com',
            'https://bbs.ruliweb.com'
        ]
        
        # 브라우저 설정들
        self.browser_configs = [
            {
                'name': 'bypass_security',
                'headless': False,  # 항상 headless=False
                'args': [
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-web-security',
                    '--ignore-certificate-errors',
                    '--ignore-ssl-errors',
                    '--ignore-certificate-errors-spki-list',
                    '--allow-running-insecure-content',
                    '--disable-extensions',
                    '--disable-plugins',
                    '--disable-images',  # 이미지 로딩 비활성화로 속도 향상
                    '--disable-javascript',  # 필요시 JavaScript 비활성화
                    '--window-size=1920,1080',
                    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                ]
            },
            {
                'name': 'minimal_security',
                'headless': False,
                'args': [
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--ignore-certificate-errors',
                    '--allow-running-insecure-content',
                    '--window-size=1920,1080'
                ]
            },
            {
                'name': 'basic_bypass',
                'headless': False,
                'args': [
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--window-size=1920,1080'
                ]
            }
        ]

class NetworkBypassScraper:
    """네트워크 차단 우회 스크래퍼"""
    
    def __init__(self):
        self.config = NetworkBypassConfig()
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.playwright = None
        self.kst = pytz.timezone('Asia/Seoul')
        
        # 성공한 설정 기록
        self.successful_config = None
        self.successful_fmkorea_url = None
        self.successful_ruliweb_url = None
        
        # 로깅 설정
        logger.remove()
        logger.add(
            sys.stdout,
            format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{function}</cyan> - <level>{message}</level>",
            level="INFO"
        )
    
    async def setup_browser(self, config_name: str = None) -> bool:
        """브라우저 설정 (특정 설정 또는 순차 시도)"""
        configs_to_try = [config_name] if config_name else [c['name'] for c in self.config.browser_configs]
        
        for config_name in configs_to_try:
            config = next((c for c in self.config.browser_configs if c['name'] == config_name), None)
            if not config:
                continue
                
            try:
                logger.info(f"🔧 브라우저 설정 시도: {config['name']}")
                
                # 이전 브라우저 정리
                await self.close_browser()
                
                self.playwright = await async_playwright().start()
                
                # 브라우저 실행
                self.browser = await self.playwright.chromium.launch(
                    headless=config['headless'],
                    args=config['args']
                )
                
                # 새 페이지 생성
                self.page = await self.browser.new_page()
                
                # Stealth 모드 적용
                await stealth_async(self.page)
                
                # 뷰포트 설정
                await self.page.set_viewport_size({"width": 1920, "height": 1080})
                
                # User-Agent 설정
                user_agent = random.choice(self.config.user_agents)
                await self.page.set_extra_http_headers({
                    'User-Agent': user_agent,
                    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                })
                
                self.successful_config = config
                logger.info(f"✅ 브라우저 설정 성공: {config['name']}")
                return True
                
            except Exception as e:
                logger.warning(f"⚠️ 브라우저 설정 {config['name']} 실패: {e}")
                await self.close_browser()
                continue
        
        logger.error("❌ 모든 브라우저 설정 실패")
        return False
    
    async def test_fmkorea_connection(self) -> str:
        """에펨코리아 연결 테스트"""
        logger.info("🔍 에펨코리아 연결 테스트 시작")
        
        for url in self.config.fmkorea_urls:
            try:
                test_url = f"{url}/politics"
                logger.info(f"🧪 테스트 URL: {test_url}")
                
                response = await self.page.goto(
                    test_url,
                    wait_until="domcontentloaded",
                    timeout=30000
                )
                
                if response and response.status == 200:
                    title = await self.page.title()
                    logger.info(f"📄 페이지 제목: {title}")
                    
                    if title and ('fmkorea' in title.lower() or '정치' in title or 'fm코리아' in title):
                        self.successful_fmkorea_url = url
                        logger.info(f"✅ 에펨코리아 연결 성공: {url}")
                        return url
                
                await asyncio.sleep(2)
                
            except Exception as e:
                logger.warning(f"⚠️ {url} 연결 실패: {str(e)[:100]}...")
                continue
        
        logger.error("❌ 에펨코리아 모든 URL 연결 실패")
        return ""
    
    async def test_ruliweb_connection(self) -> str:
        """루리웹 연결 테스트"""
        logger.info("🔍 루리웹 연결 테스트 시작")
        
        for url in self.config.ruliweb_urls:
            try:
                test_url = f"{url}/community/board/300148"
                logger.info(f"🧪 테스트 URL: {test_url}")
                
                response = await self.page.goto(
                    test_url,
                    wait_until="domcontentloaded",
                    timeout=30000
                )
                
                if response and response.status == 200:
                    title = await self.page.title()
                    logger.info(f"📄 페이지 제목: {title}")
                    
                    if title and ('ruliweb' in title.lower() or '루리웹' in title or '정치' in title):
                        self.successful_ruliweb_url = url
                        logger.info(f"✅ 루리웹 연결 성공: {url}")
                        return url
                
                await asyncio.sleep(2)
                
            except Exception as e:
                logger.warning(f"⚠️ {url} 연결 실패: {str(e)[:100]}...")
                continue
        
        logger.error("❌ 루리웹 모든 URL 연결 실패")
        return ""
    
    async def scrape_fmkorea_simple(self, limit: int = 5) -> List[Dict]:
        """에펨코리아 간단 스크래핑"""
        if not self.successful_fmkorea_url:
            logger.error("❌ 에펨코리아 연결 URL이 없습니다.")
            return []
        
        try:
            url = f"{self.successful_fmkorea_url}/politics"
            logger.info(f"📋 에펨코리아 게시글 목록 스크래핑: {url}")
            
            await self.page.goto(url, wait_until="networkidle", timeout=45000)
            await self.page.wait_for_timeout(3000)
            
            # 게시글 목록 추출 (간단한 버전)
            posts = []
            
            # 테이블 행들 찾기
            rows = await self.page.query_selector_all("table.bd_lst tbody tr")
            logger.info(f"📝 발견된 행 수: {len(rows)}")
            
            for i, row in enumerate(rows[:limit]):
                try:
                    # 제목 추출
                    title_element = await row.query_selector("td.title a")
                    if not title_element:
                        continue
                    
                    title = await title_element.inner_text()
                    href = await title_element.get_attribute('href')
                    
                    if not title or not href:
                        continue
                    
                    # 절대 URL로 변환
                    if href.startswith('/'):
                        post_url = urljoin(self.successful_fmkorea_url, href)
                    else:
                        post_url = href
                    
                    # 게시글 ID 추출
                    post_id = self.parse_post_id_from_url(post_url)
                    
                    # 작성자 추출
                    author_element = await row.query_selector("td.author")
                    author = await author_element.inner_text() if author_element else ""
                    
                    # 조회수 추출
                    view_element = await row.query_selector("td.m_no")
                    view_count = 0
                    if view_element:
                        view_text = await view_element.inner_text()
                        view_count = int(view_text) if view_text.isdigit() else 0
                    
                    post_data = {
                        "post_id": post_id,
                        "post_url": post_url,
                        "scraped_at": datetime.now(self.kst).isoformat(),
                        "metadata": {
                            "title": title.strip(),
                            "category": "정치",
                            "author": author.strip(),
                            "date": datetime.now(self.kst).isoformat(),
                            "view_count": view_count,
                            "up_count": 0,
                            "down_count": 0,
                            "comment_count": 0
                        },
                        "content": [
                            {
                                "type": "text",
                                "order": 0,
                                "data": {"text": f"제목: {title}\n\n(본문 내용은 개별 스크래핑이 필요합니다)"}
                            }
                        ],
                        "comments": []
                    }
                    
                    posts.append(post_data)
                    logger.info(f"✅ 게시글 {i+1}: {title[:30]}...")
                    
                except Exception as e:
                    logger.warning(f"⚠️ 게시글 {i+1} 처리 실패: {e}")
                    continue
            
            logger.info(f"📊 에펨코리아 스크래핑 완료: {len(posts)}개")
            return posts
            
        except Exception as e:
            logger.error(f"💥 에펨코리아 스크래핑 실패: {e}")
            return []
    
    async def scrape_ruliweb_simple(self, limit: int = 5) -> List[Dict]:
        """루리웹 간단 스크래핑"""
        if not self.successful_ruliweb_url:
            logger.error("❌ 루리웹 연결 URL이 없습니다.")
            return []
        
        try:
            url = f"{self.successful_ruliweb_url}/community/board/300148"
            logger.info(f"📋 루리웹 게시글 목록 스크래핑: {url}")
            
            await self.page.goto(url, wait_until="networkidle", timeout=45000)
            await self.page.wait_for_timeout(3000)
            
            # 게시글 목록 추출 (간단한 버전)
            posts = []
            
            # 테이블 행들 찾기
            rows = await self.page.query_selector_all("table.board_list_table tbody tr.table_body")
            logger.info(f"📝 발견된 행 수: {len(rows)}")
            
            for i, row in enumerate(rows[:limit]):
                try:
                    # 제목 추출
                    title_element = await row.query_selector("td.subject a.subject_link")
                    if not title_element:
                        continue
                    
                    title = await title_element.inner_text()
                    href = await title_element.get_attribute('href')
                    
                    if not title or not href:
                        continue
                    
                    # 절대 URL로 변환
                    if href.startswith('/'):
                        post_url = urljoin(self.successful_ruliweb_url, href)
                    else:
                        post_url = href
                    
                    # 게시글 ID 추출
                    post_id = self.parse_post_id_from_url(post_url)
                    
                    # 작성자 추출
                    author_element = await row.query_selector("td.writer a")
                    author = await author_element.inner_text() if author_element else ""
                    
                    # 조회수 추출
                    hit_element = await row.query_selector("td.hit")
                    hit_count = 0
                    if hit_element:
                        hit_text = await hit_element.inner_text()
                        hit_count = int(hit_text) if hit_text.isdigit() else 0
                    
                    # 추천수 추출
                    recommend_element = await row.query_selector("td.recomd")
                    recommend_count = 0
                    if recommend_element:
                        recommend_text = await recommend_element.inner_text()
                        recommend_count = int(recommend_text) if recommend_text.isdigit() else 0
                    
                    post_data = {
                        "post_id": post_id,
                        "post_url": post_url,
                        "scraped_at": datetime.now(self.kst).isoformat(),
                        "metadata": {
                            "title": title.strip(),
                            "category": "정치유머",
                            "author": author.strip(),
                            "date": datetime.now(self.kst).isoformat(),
                            "view_count": hit_count,
                            "up_count": recommend_count,
                            "down_count": 0,
                            "comment_count": 0
                        },
                        "content": [
                            {
                                "type": "text",
                                "order": 0,
                                "data": {"text": f"제목: {title}\n\n(본문 내용은 개별 스크래핑이 필요합니다)"}
                            }
                        ],
                        "comments": []
                    }
                    
                    posts.append(post_data)
                    logger.info(f"✅ 게시글 {i+1}: {title[:30]}...")
                    
                except Exception as e:
                    logger.warning(f"⚠️ 게시글 {i+1} 처리 실패: {e}")
                    continue
            
            logger.info(f"📊 루리웹 스크래핑 완료: {len(posts)}개")
            return posts
            
        except Exception as e:
            logger.error(f"💥 루리웹 스크래핑 실패: {e}")
            return []
    
    def parse_post_id_from_url(self, url: str) -> str:
        """URL에서 게시글 ID 추출"""
        try:
            # 루리웹 패턴
            if '/read/' in url:
                match = re.search(r'/read/(\d+)', url)
                if match:
                    return match.group(1)
            
            # 에펨코리아 패턴
            if 'document_srl' in url:
                from urllib.parse import parse_qs, urlparse
                parsed = urlparse(url)
                params = parse_qs(parsed.query)
                if 'document_srl' in params:
                    return params['document_srl'][0]
            
            # 일반적인 숫자 패턴
            numbers = re.findall(r'\d+', url)
            if numbers:
                return max(numbers, key=len)
            
            return 'unknown'
            
        except Exception as e:
            logger.error(f"💥 게시글 ID 추출 실패: {e}")
            return 'unknown'
    
    async def close_browser(self):
        """브라우저 종료"""
        try:
            if self.page:
                await self.page.close()
                self.page = None
                
            if self.browser:
                await self.browser.close()
                self.browser = None
                
            if self.playwright:
                await self.playwright.stop()
                self.playwright = None
                
        except Exception as e:
            logger.warning(f"⚠️ 브라우저 종료 중 오류: {e}")

# 통합 실행 함수
async def run_network_bypass_experiment(config: Optional[Dict] = None) -> Dict:
    """네트워크 차단 우회 스크래핑 실험"""
    if config is None:
        config = {}
    
    logger.info("🚀 네트워크 차단 우회 스크래핑 실험 시작")
    start_time = time.time()
    
    scraper = NetworkBypassScraper()
    results = {
        'fmkorea': [],
        'ruliweb': [],
        'success': False,
        'errors': [],
        'execution_time': 0
    }
    
    try:
        # 브라우저 설정
        browser_success = await scraper.setup_browser()
        if not browser_success:
            results['errors'].append("브라우저 설정 실패")
            return results
        
        # 에펨코리아 연결 테스트
        fmkorea_url = await scraper.test_fmkorea_connection()
        if fmkorea_url:
            logger.info("🎮 에펨코리아 스크래핑 시작")
            fmkorea_posts = await scraper.scrape_fmkorea_simple(limit=config.get('post_limit', 5))
            results['fmkorea'] = fmkorea_posts
        else:
            results['errors'].append("에펨코리아 연결 실패")
        
        # 루리웹 연결 테스트
        ruliweb_url = await scraper.test_ruliweb_connection()
        if ruliweb_url:
            logger.info("🎯 루리웹 스크래핑 시작")
            ruliweb_posts = await scraper.scrape_ruliweb_simple(limit=config.get('post_limit', 5))
            results['ruliweb'] = ruliweb_posts
        else:
            results['errors'].append("루리웹 연결 실패")
        
        # 결과 저장
        all_posts = results['fmkorea'] + results['ruliweb']
        if all_posts:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            
            # 데이터 폴더 생성
            data_dir = os.path.join(project_root, "scraping", "data")
            os.makedirs(data_dir, exist_ok=True)
            
            # 통합 파일 저장
            combined_filename = f"network_bypass_experiment_{timestamp}.json"
            combined_filepath = os.path.join(data_dir, combined_filename)
            
            with open(combined_filepath, 'w', encoding='utf-8') as f:
                json.dump(all_posts, f, ensure_ascii=False, indent=2)
            
            logger.info(f"💾 결과 저장: {combined_filepath}")
            
            # API 전송 시도
            api_url = config.get('api_url', 'http://localhost:3000/api/scraping-data')
            if api_url:
                try:
                    response = requests.post(api_url, json=all_posts, timeout=30)
                    if response.status_code == 200:
                        logger.info(f"✅ API 전송 성공: {len(all_posts)}개 게시글")
                    else:
                        logger.warning(f"⚠️ API 전송 실패: {response.status_code}")
                except Exception as e:
                    logger.warning(f"⚠️ API 전송 오류: {e}")
        
        results['success'] = len(all_posts) > 0
        results['execution_time'] = time.time() - start_time
        
        # 최종 결과 출력
        total_posts = len(results['fmkorea']) + len(results['ruliweb'])
        logger.info(f"🎉 실험 완료!")
        logger.info(f"📊 총 {total_posts}개 게시글 수집")
        logger.info(f"  - 에펨코리아: {len(results['fmkorea'])}개")
        logger.info(f"  - 루리웹: {len(results['ruliweb'])}개")
        logger.info(f"⏱️ 실행 시간: {results['execution_time']:.2f}초")
        
        if results['errors']:
            logger.warning(f"⚠️ 오류 발생: {len(results['errors'])}개")
            for error in results['errors']:
                logger.warning(f"  - {error}")
        
        return results
        
    except Exception as e:
        logger.error(f"💥 실험 실행 실패: {e}")
        results['errors'].append(str(e))
        results['execution_time'] = time.time() - start_time
        return results
        
    finally:
        await scraper.close_browser()

# 메인 실행
async def main():
    """메인 실행 함수"""
    logger.info("🚀 네트워크 차단 우회 스크래퍼 시작")
    
    config = {
        'post_limit': 5,
        'api_url': 'http://localhost:3000/api/scraping-data'
    }
    
    result = await run_network_bypass_experiment(config)
    
    if result['success']:
        logger.info("✅ 스크래핑 실험 성공적으로 완료")
    else:
        logger.error("❌ 스크래핑 실험 실패")
    
    return result

if __name__ == "__main__":
    asyncio.run(main()) 
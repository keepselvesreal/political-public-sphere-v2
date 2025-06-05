#!/usr/bin/env python3
"""
개선된 FM코리아 스크래퍼 v3 (공공 도서관 HTTPS 차단 대응)

목차:
1. 모듈 임포트 및 설정 (1-40)
2. 네트워크 우회 설정 (41-120)
3. FMKoreaScraper 클래스 (121-200)
4. 브라우저 설정 및 관리 (201-350)
5. 게시글 목록 스크래핑 (351-450)
6. 개별 게시글 스크래핑 (451-550)
7. 데이터 추출 함수들 (551-650)
8. 메인 실행 함수 (651-750)

작성자: AI Assistant
작성일: 2025년 6월 5일 11:03 (KST)
목적: 공공 도서관 HTTPS 차단 문제 해결을 위한 다중 대안 적용 (API 수정)
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

from playwright.async_api import async_playwright, Page, Browser
from playwright_stealth import stealth_async
from loguru import logger

class NetworkBypassConfig:
    """네트워크 우회 설정 클래스"""
    
    def __init__(self):
        # 대안 1: 다양한 User-Agent 로테이션
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0',
            # 모바일 User-Agent 추가
            'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
        ]
        
        # 대안 2: 다양한 접근 URL (HTTP 우선 시도)
        self.alternative_urls = [
            'http://www.fmkorea.com',   # HTTP 버전 (차단 우회 가능성 높음)
            'http://m.fmkorea.com',    # 모바일 HTTP 버전
            'https://www.fmkorea.com', # HTTPS 버전
            'https://m.fmkorea.com',   # 모바일 HTTPS 버전
        ]
        
        # 대안 3: 다양한 브라우저 설정
        self.browser_configs = [
            {
                'name': 'http_first_chrome',
                'headless': False,
                'args': [
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled',
                    '--window-size=1920,1080',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor',
                    '--ignore-certificate-errors',
                    '--ignore-ssl-errors',
                    '--ignore-certificate-errors-spki-list',
                    '--allow-running-insecure-content',
                    '--disable-extensions'
                ]
            },
            {
                'name': 'stealth_minimal',
                'headless': True,
                'args': [
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--ignore-certificate-errors',
                    '--disable-features=VizDisplayCompositor',
                    '--allow-running-insecure-content'
                ]
            },
            {
                'name': 'mobile_bypass',
                'headless': False,
                'args': [
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--window-size=375,812',
                    '--disable-web-security',
                    '--ignore-certificate-errors',
                    '--allow-running-insecure-content'
                ]
            }
        ]
        
        # 대안 4: 타임아웃 및 재시도 설정
        self.timeout_configs = [
            {'navigation': 20000, 'wait': 10000},  # 짧은 타임아웃
            {'navigation': 45000, 'wait': 20000},  # 중간 타임아웃
            {'navigation': 90000, 'wait': 45000}   # 긴 타임아웃
        ]

class ImprovedFMKoreaScraper:
    """개선된 FM코리아 스크래퍼 (네트워크 차단 대응)"""
    
    def __init__(self):
        self.bypass_config = NetworkBypassConfig()
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.playwright = None
        self.kst = pytz.timezone('Asia/Seoul')
        
        # 현재 사용 중인 설정
        self.current_base_url = None
        self.current_config = None
        self.current_timeout = None
        self.current_user_agent = None
        
        # 성공한 설정 기록
        self.successful_configs = []
    
    async def __aenter__(self):
        """비동기 컨텍스트 매니저 진입"""
        success = await self.setup_browser_with_alternatives()
        if not success:
            raise Exception("모든 브라우저 설정 대안이 실패했습니다.")
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """비동기 컨텍스트 매니저 종료"""
        await self.close_browser()
    
    async def setup_browser_with_alternatives(self) -> bool:
        """여러 대안을 시도하여 브라우저 설정"""
        logger.info("🔧 네트워크 차단 대응을 위한 다중 브라우저 설정 시도")
        
        for i, config in enumerate(self.bypass_config.browser_configs):
            try:
                logger.info(f"🧪 브라우저 설정 {i+1}/{len(self.bypass_config.browser_configs)} 시도: {config['name']}")
                
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
                if 'mobile' in config['name']:
                    await self.page.set_viewport_size({"width": 375, "height": 812})
                else:
                    await self.page.set_viewport_size({"width": 1920, "height": 1080})
                
                # User-Agent 설정 (올바른 방법)
                user_agent = random.choice(self.bypass_config.user_agents)
                self.current_user_agent = user_agent
                
                # HTTP 헤더 설정 (User-Agent 포함)
                await self.page.set_extra_http_headers({
                    'User-Agent': user_agent,
                    'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Cache-Control': 'no-cache'
                })
                
                # 연결 테스트
                success = await self.test_connection()
                if success:
                    self.current_config = config
                    logger.info(f"✅ 브라우저 설정 성공: {config['name']}")
                    logger.info(f"🌐 성공한 URL: {self.current_base_url}")
                    logger.info(f"👤 사용된 User-Agent: {user_agent[:50]}...")
                    return True
                else:
                    logger.warning(f"⚠️ 브라우저 설정 {config['name']} 연결 실패")
                    
            except Exception as e:
                logger.warning(f"⚠️ 브라우저 설정 {config['name']} 실패: {e}")
                await self.close_browser()
                continue
        
        logger.error("❌ 모든 브라우저 설정 대안이 실패했습니다.")
        return False
    
    async def test_connection(self) -> bool:
        """연결 테스트 (여러 URL 대안 시도)"""
        logger.info("🔍 연결 테스트 시작")
        
        for i, base_url in enumerate(self.bypass_config.alternative_urls):
            for j, timeout_config in enumerate(self.bypass_config.timeout_configs):
                try:
                    test_url = f"{base_url}/politics"
                    logger.info(f"🧪 연결 테스트 {i+1}-{j+1}: {test_url}")
                    
                    # 페이지 이동 시도
                    response = await self.page.goto(
                        test_url, 
                        wait_until="domcontentloaded", 
                        timeout=timeout_config['navigation']
                    )
                    
                    # 응답 상태 확인
                    if response and response.status == 200:
                        # 페이지 로드 확인
                        title = await self.page.title()
                        logger.info(f"📄 페이지 제목: {title}")
                        
                        # FM코리아 페이지인지 확인
                        if title and ('fmkorea' in title.lower() or '정치' in title or 'fm코리아' in title):
                            self.current_base_url = base_url
                            self.current_timeout = timeout_config
                            logger.info(f"✅ 연결 성공: {test_url}")
                            return True
                        else:
                            logger.warning(f"⚠️ 예상과 다른 페이지: {title}")
                    else:
                        status = response.status if response else 'No Response'
                        logger.warning(f"⚠️ HTTP 상태 오류: {status}")
                    
                except Exception as e:
                    logger.warning(f"⚠️ 연결 실패 {test_url}: {str(e)[:100]}...")
                    continue
                
                # 각 시도 간 짧은 대기
                await asyncio.sleep(1)
        
        logger.error("❌ 모든 URL 대안 연결 실패")
        return False
    
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
    
    async def scrape_politics_page_list(self, limit: int = 20) -> List[Dict]:
        """정치 게시판 목록 스크래핑 (차단 대응)"""
        try:
            if not self.current_base_url:
                raise Exception("연결된 기본 URL이 없습니다.")
            
            url = f"{self.current_base_url}/politics"
            logger.info(f"🔍 정치 게시판 목록 스크래핑: {url}")
            
            # 페이지 이동 (현재 성공한 타임아웃 설정 사용)
            response = await self.page.goto(
                url, 
                wait_until="networkidle", 
                timeout=self.current_timeout['navigation']
            )
            
            if not response or response.status != 200:
                logger.error(f"❌ 페이지 로드 실패: HTTP {response.status if response else 'No Response'}")
                return []
            
            # 페이지 로드 확인
            page_title = await self.page.title()
            logger.info(f"📄 페이지 제목: {page_title}")
            
            # 게시글 목록 테이블 확인 (여러 셀렉터 시도)
            table_selectors = [
                'table.bd_lst.bd_tb_lst.bd_tb',
                'table.bd_lst.bd_tb_lst',
                'table.bd_lst',
                '.bd_lst'
            ]
            
            table_element = None
            for selector in table_selectors:
                try:
                    element = await self.page.query_selector(selector)
                    if element:
                        table_element = element
                        logger.info(f"✅ 게시글 목록 테이블 발견: {selector}")
                        break
                except:
                    continue
            
            if not table_element:
                logger.error("❌ 게시글 목록 테이블을 찾을 수 없습니다.")
                # 페이지 소스 일부 확인
                content = await self.page.content()
                logger.info(f"📄 페이지 소스 길이: {len(content)} 문자")
                return []
            
            # 게시글 행들 추출 (여러 셀렉터 시도)
            row_selectors = [
                'table.bd_lst tbody tr:not(.notice)',
                'table.bd_lst tr:not(.notice)',
                '.bd_lst tbody tr',
                '.bd_lst tr'
            ]
            
            post_rows = []
            for selector in row_selectors:
                try:
                    rows = await self.page.query_selector_all(selector)
                    if rows:
                        post_rows = rows
                        logger.info(f"✅ 게시글 행 발견: {len(rows)}개 ({selector})")
                        break
                except:
                    continue
            
            if not post_rows:
                logger.error("❌ 게시글 행을 찾을 수 없습니다.")
                return []
            
            # 게시글 정보 추출
            posts = []
            for i, row in enumerate(post_rows[:limit]):
                try:
                    post_info = await self.extract_post_list_info(row)
                    if post_info and post_info.get('title'):
                        posts.append(post_info)
                        logger.info(f"📝 게시글 {i+1}: {post_info.get('title', 'N/A')[:30]}...")
                except Exception as e:
                    logger.warning(f"⚠️ 게시글 {i+1} 추출 실패: {e}")
                    continue
            
            logger.info(f"✅ 총 {len(posts)}개 게시글 목록 수집 완료")
            return posts
            
        except Exception as e:
            logger.error(f"💥 게시글 목록 스크래핑 실패: {e}")
            return []
    
    async def extract_post_list_info(self, row_element) -> Optional[Dict]:
        """게시글 목록 정보 추출 (강화된 셀렉터)"""
        try:
            post_info = {}
            
            # 카테고리 추출 (여러 셀렉터 시도)
            category_selectors = ['td.cate a', 'td.cate span', '.cate a', '.cate span', '.category']
            for selector in category_selectors:
                try:
                    cate_element = await row_element.query_selector(selector)
                    if cate_element:
                        category = await cate_element.inner_text()
                        if category and category.strip():
                            post_info['category'] = category.strip()
                            break
                except:
                    continue
            post_info.setdefault('category', '')
            
            # 제목 및 URL 추출 (여러 셀렉터 시도)
            title_selectors = ['td.title a', '.title a', 'td a[href*="/"]', 'a[href*="/"]']
            for selector in title_selectors:
                try:
                    title_element = await row_element.query_selector(selector)
                    if title_element:
                        title = await title_element.inner_text()
                        href = await title_element.get_attribute('href')
                        
                        if title and title.strip() and href:
                            post_info['title'] = title.strip()
                            
                            # 절대 URL로 변환
                            if href.startswith('/'):
                                post_info['url'] = urljoin(self.current_base_url, href)
                            else:
                                post_info['url'] = href
                            
                            # 게시글 ID 추출
                            post_info['post_id'] = self.parse_post_id_from_url(post_info['url'])
                            break
                except:
                    continue
            
            if not post_info.get('title'):
                return None
            
            # 댓글 수 추출
            reply_selectors = ['td.title a.replyNum', '.replyNum', 'a[class*="reply"]']
            for selector in reply_selectors:
                try:
                    reply_element = await row_element.query_selector(selector)
                    if reply_element:
                        reply_text = await reply_element.inner_text()
                        if reply_text and reply_text.strip().isdigit():
                            post_info['comment_count'] = int(reply_text.strip())
                            break
                except:
                    continue
            post_info.setdefault('comment_count', 0)
            
            # 작성자 추출
            author_selectors = ['td.author a.member_plate', 'td.author span', '.author a', '.author span', '.member_plate']
            for selector in author_selectors:
                try:
                    author_element = await row_element.query_selector(selector)
                    if author_element:
                        author = await author_element.inner_text()
                        if author and author.strip():
                            post_info['author'] = author.strip()
                            break
                except:
                    continue
            post_info.setdefault('author', '')
            
            # 작성시간 추출
            time_selectors = ['td.time', '.time', 'td[class*="date"]', '.date']
            for selector in time_selectors:
                try:
                    time_element = await row_element.query_selector(selector)
                    if time_element:
                        time_text = await time_element.inner_text()
                        if time_text and time_text.strip():
                            post_info['date'] = time_text.strip()
                            break
                except:
                    continue
            post_info.setdefault('date', '')
            
            # 조회수 및 추천수 추출
            number_elements = await row_element.query_selector_all('td.m_no, .m_no, td[class*="num"]')
            
            if len(number_elements) >= 1:
                try:
                    view_text = await number_elements[0].inner_text()
                    post_info['view_count'] = int(view_text.strip()) if view_text.strip().isdigit() else 0
                except:
                    post_info['view_count'] = 0
            else:
                post_info['view_count'] = 0
            
            if len(number_elements) >= 2:
                try:
                    vote_text = await number_elements[-1].inner_text()
                    vote_text = vote_text.strip()
                    
                    if vote_text.startswith('-'):
                        post_info['up_count'] = 0
                        post_info['down_count'] = abs(int(vote_text)) if vote_text[1:].isdigit() else 0
                    elif vote_text.isdigit():
                        post_info['up_count'] = int(vote_text)
                        post_info['down_count'] = 0
                    else:
                        post_info['up_count'] = 0
                        post_info['down_count'] = 0
                except:
                    post_info['up_count'] = 0
                    post_info['down_count'] = 0
            else:
                post_info['up_count'] = 0
                post_info['down_count'] = 0
            
            return post_info
            
        except Exception as e:
            logger.warning(f"⚠️ 게시글 정보 추출 실패: {e}")
            return None
    
    def parse_post_id_from_url(self, url: str) -> str:
        """URL에서 게시글 ID 추출"""
        try:
            if '/index.php' in url:
                from urllib.parse import parse_qs, urlparse
                parsed = urlparse(url)
                params = parse_qs(parsed.query)
                if 'document_srl' in params:
                    return params['document_srl'][0]
            else:
                match = re.search(r'/(\d+)/?$', url)
                if match:
                    return match.group(1)
            
            numbers = re.findall(r'\d+', url)
            if numbers:
                return max(numbers, key=len)
            
            return 'unknown'
            
        except Exception as e:
            logger.error(f"💥 게시글 ID 추출 실패: {e}")
            return 'unknown'

# 편의 함수들
async def test_network_bypass():
    """네트워크 차단 우회 테스트 함수"""
    logger.info("🚀 네트워크 차단 우회 테스트 시작")
    logger.info(f"⏰ 시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        async with ImprovedFMKoreaScraper() as scraper:
            # 게시글 목록 스크래핑 테스트
            posts = await scraper.scrape_politics_page_list(limit=10)
            
            logger.info("📊 테스트 결과 요약")
            logger.info("=" * 50)
            logger.info(f"✅ 성공적으로 스크래핑된 게시글: {len(posts)}개")
            logger.info(f"🌐 사용된 URL: {scraper.current_base_url}")
            logger.info(f"⚙️ 사용된 설정: {scraper.current_config['name'] if scraper.current_config else 'N/A'}")
            
            for i, post in enumerate(posts):
                logger.info(f"📝 게시글 {i+1}: {post.get('title', 'N/A')[:50]}...")
                logger.info(f"   - 작성자: {post.get('author', 'N/A')}")
                logger.info(f"   - 조회수: {post.get('view_count', 0)}")
                logger.info(f"   - 추천수: {post.get('up_count', 0)}")
                logger.info(f"   - URL: {post.get('url', 'N/A')}")
            
            # 결과를 JSON 파일로 저장
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"network_bypass_test_{timestamp}.json"
            
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(posts, f, ensure_ascii=False, indent=2)
            
            logger.info(f"💾 결과 저장: {filename}")
            
            return posts
            
    except Exception as e:
        logger.error(f"💥 테스트 실패: {e}")
        return []
    
    finally:
        logger.info(f"⏰ 완료 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    asyncio.run(test_network_bypass()) 
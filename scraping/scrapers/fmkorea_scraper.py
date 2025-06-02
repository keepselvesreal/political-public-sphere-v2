"""
FM코리아 스크래퍼 모듈

주요 기능:
- scrape_fmkorea: FM코리아 정치 게시판 스크래핑 (line 30-80)
- FMKoreaScraper: FM코리아 스크래퍼 클래스 (line 82-200)
- scrape_board_posts: 게시판 게시글 목록 스크래핑 (line 202-300)
- extract_post_info: 개별 게시글 정보 추출 (line 302-400)

작성자: AI Assistant
작성일: 2025-01-28 17:00 KST
목적: FM코리아 게시글 목록 스크래핑 및 상세 정보 수집
"""

import asyncio
import re
import json
from datetime import datetime
from typing import List, Dict, Optional, Any
from urllib.parse import urljoin, urlparse
import pytz

from playwright.async_api import async_playwright, Page, Browser
from playwright_stealth import stealth_async
from loguru import logger


async def scrape_fmkorea() -> Dict:
    """
    FM코리아 정치 게시판 스크래핑 편의 함수
    
    Returns:
        Dict: 스크래핑 결과
    """
    async with FMKoreaScraper() as scraper:
        return await scraper.scrape_board_posts()


class FMKoreaScraper:
    """
    FM코리아 스크래퍼 클래스
    
    정치 게시판의 게시글 목록을 스크래핑하고
    각 게시글의 기본 정보를 수집합니다.
    """
    
    def __init__(self):
        self.base_url = 'https://www.fmkorea.com'
        self.politics_url = 'https://www.fmkorea.com/politics'
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        
        # 한국 시간대 설정
        self.kst = pytz.timezone('Asia/Seoul')
        
        # 스크래핑 설정
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
        
        # 대기 시간 설정
        self.wait_timeout = 15000  # 15초
        self.navigation_timeout = 30000  # 30초
    
    async def __aenter__(self):
        """비동기 컨텍스트 매니저 진입"""
        await self.setup_browser()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """비동기 컨텍스트 매니저 종료"""
        await self.close_browser()
    
    async def setup_browser(self):
        """브라우저 설정 및 초기화"""
        try:
            playwright = await async_playwright().start()
            
            # 브라우저 옵션 설정
            self.browser = await playwright.chromium.launch(
                headless=False,  # 헤드리스 모드 해제하여 봇 차단 우회
                args=[
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled',
                    '--window-size=1920,1080'
                ]
            )
            
            # 새 페이지 생성
            self.page = await self.browser.new_page()
            
            # Stealth 모드 적용
            await stealth_async(self.page)
            
            # 추가 설정
            await self.page.set_viewport_size({"width": 1920, "height": 1080})
            await self.page.set_extra_http_headers({
                'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
            })
            
            logger.info("✅ 브라우저 설정 완료")
            
        except Exception as e:
            logger.error(f"💥 브라우저 설정 실패: {e}")
            raise
    
    async def close_browser(self):
        """브라우저 종료"""
        try:
            if self.page:
                await self.page.close()
                self.page = None
                
            if self.browser:
                # 모든 컨텍스트와 페이지를 안전하게 종료
                contexts = self.browser.contexts
                for context in contexts:
                    try:
                        await context.close()
                    except:
                        pass
                
                # 브라우저 프로세스 종료
                await self.browser.close()
                self.browser = None
                
            # 추가 대기 시간으로 완전한 종료 보장
            await asyncio.sleep(0.5)
            
            logger.info("✅ 브라우저 종료 완료")
            
        except Exception as e:
            logger.error(f"⚠️ 브라우저 종료 중 오류: {e}")
            # 강제 종료 시도
            try:
                if self.browser:
                    await self.browser.close()
            except:
                pass
    
    async def scrape_board_posts(self) -> Dict:
        """
        FM코리아 정치 게시판 게시글 목록 스크래핑
        
        Returns:
            Dict: 스크래핑 결과
        """
        try:
            logger.info("🚀 FM코리아 정치 게시판 스크래핑 시작")
            
            if self.page is None:
                logger.error("💥 브라우저가 초기화되지 않았습니다.")
                return {'error': '브라우저 초기화 실패'}
            
            # 정치 게시판 페이지 이동
            await self.page.goto(self.politics_url, wait_until="networkidle", timeout=self.navigation_timeout)
            
            # 게시글 목록이 로드될 때까지 대기
            try:
                await self.page.wait_for_selector('table.bd_tb, .bd_tb, .board_list', timeout=self.wait_timeout)
            except:
                logger.warning("⚠️ 게시글 목록을 찾을 수 없습니다. 계속 진행합니다.")
            
            # 페이지 제목 확인
            page_title = await self.page.title()
            logger.info(f"📄 페이지 제목: {page_title}")
            
            # 게시글 목록 추출
            posts = await self.extract_post_list()
            
            # 상위 게시글들의 상세 정보 수집 (처음 5개)
            detailed_posts = []
            for i, post in enumerate(posts[:5]):
                try:
                    logger.info(f"📝 게시글 {i+1}/5 상세 정보 수집 중: {post.get('title', 'N/A')}")
                    detailed_post = await self.get_post_details(post)
                    if detailed_post:
                        detailed_posts.append(detailed_post)
                    
                    # 요청 간 대기
                    await asyncio.sleep(2)
                    
                except Exception as e:
                    logger.warning(f"⚠️ 게시글 상세 정보 수집 실패: {e}")
                    detailed_posts.append(post)
            
            # 메트릭 계산
            top_posts = self.calculate_metrics(detailed_posts)
            
            result = {
                'scraped_at': datetime.now(self.kst),
                'total_count': len(posts),
                'all_posts': posts,
                'detailed_posts': detailed_posts,
                'top_posts': top_posts,
                'page_title': page_title,
                'source_url': self.politics_url
            }
            
            logger.info(f"✅ 스크래핑 완료! 총 {len(posts)}개 게시글, {len(detailed_posts)}개 상세 정보 수집")
            return result
            
        except Exception as e:
            logger.error(f"💥 게시판 스크래핑 실패: {e}")
            return {
                'error': str(e),
                'scraped_at': datetime.now(self.kst),
                'source_url': self.politics_url
            }
    
    async def extract_post_list(self) -> List[Dict]:
        """게시글 목록 추출"""
        try:
            posts = []
            
            # FM코리아 게시글 목록 셀렉터들
            post_selectors = [
                'table.bd_tb tbody tr',
                '.bd_tb tbody tr',
                '.board_list tbody tr',
                'tbody tr'
            ]
            
            post_elements = []
            for selector in post_selectors:
                try:
                    elements = await self.page.query_selector_all(selector)
                    if elements:
                        # 실제 게시글인지 확인 (제목 링크가 있는 것만)
                        valid_elements = []
                        for element in elements:
                            title_link = await element.query_selector('td.title a, .title a, a[href*="/"]')
                            if title_link:
                                valid_elements.append(element)
                        
                        if valid_elements:
                            post_elements = valid_elements
                            logger.info(f"✅ {len(valid_elements)}개 게시글 요소 발견 (셀렉터: {selector})")
                            break
                except Exception as e:
                    logger.warning(f"⚠️ 셀렉터 {selector} 실패: {e}")
                    continue
            
            if not post_elements:
                logger.warning("⚠️ 게시글 요소를 찾을 수 없습니다.")
                return []
            
            # 각 게시글 요소에서 기본 정보 추출
            for element in post_elements:
                try:
                    post_info = await self.extract_post_info(element)
                    if post_info and post_info.get('title'):
                        posts.append(post_info)
                except Exception as e:
                    logger.warning(f"⚠️ 게시글 정보 추출 실패: {e}")
                    continue
            
            logger.info(f"✅ 총 {len(posts)}개 게시글 기본 정보 수집 완료")
            return posts
            
        except Exception as e:
            logger.error(f"💥 게시글 목록 추출 실패: {e}")
            return []
    
    async def extract_post_info(self, post_element) -> Optional[Dict]:
        """개별 게시글 기본 정보 추출"""
        try:
            post_info = {}
            
            # 제목과 링크 추출
            title_selectors = [
                'td.title a',
                '.title a',
                'a[href*="/"]'
            ]
            
            title_found = False
            for selector in title_selectors:
                try:
                    title_element = await post_element.query_selector(selector)
                    if title_element:
                        title_text = await title_element.inner_text()
                        href = await title_element.get_attribute('href')
                        
                        if title_text and href:
                            post_info['title'] = title_text.strip()
                            
                            # 절대 URL로 변환
                            if href.startswith('/'):
                                post_info['url'] = urljoin(self.base_url, href)
                            else:
                                post_info['url'] = href
                            
                            # 게시글 ID 추출
                            post_info['post_id'] = self.parse_post_id_from_url(post_info['url'])
                            title_found = True
                            break
                except:
                    continue
            
            if not title_found:
                return None
            
            # 작성자 추출
            author_selectors = [
                'td.author .member_plate',
                '.author .member_plate',
                'td.author a',
                '.author a',
                'td.author',
                '.author'
            ]
            
            for selector in author_selectors:
                try:
                    author_element = await post_element.query_selector(selector)
                    if author_element:
                        author_text = await author_element.inner_text()
                        if author_text and author_text.strip():
                            post_info['author'] = author_text.strip()
                            break
                except:
                    continue
            
            # 작성 시간 추출
            date_selectors = [
                'td.time',
                '.time',
                'td.date',
                '.date'
            ]
            
            for selector in date_selectors:
                try:
                    date_element = await post_element.query_selector(selector)
                    if date_element:
                        date_text = await date_element.inner_text()
                        if date_text and date_text.strip():
                            post_info['date'] = date_text.strip()
                            break
                except:
                    continue
            
            # 조회수 추출
            view_selectors = [
                'td.m_no:has-text("조회")',
                '.view_count',
                'td:has-text("조회")'
            ]
            
            view_count = 0
            for selector in view_selectors:
                try:
                    view_element = await post_element.query_selector(selector)
                    if view_element:
                        view_text = await view_element.inner_text()
                        numbers = re.findall(r'\d+', view_text)
                        if numbers:
                            view_count = int(numbers[-1])
                            break
                except:
                    continue
            
            post_info['view_count'] = view_count
            
            # 추천수 추출
            like_selectors = [
                'td.m_no:has-text("추천")',
                '.like_count',
                'td:has-text("추천")'
            ]
            
            like_count = 0
            for selector in like_selectors:
                try:
                    like_element = await post_element.query_selector(selector)
                    if like_element:
                        like_text = await like_element.inner_text()
                        numbers = re.findall(r'\d+', like_text)
                        if numbers:
                            like_count = int(numbers[-1])
                            break
                except:
                    continue
            
            post_info['like_count'] = like_count
            
            # 댓글수 추출
            comment_selectors = [
                'td.m_no:has-text("댓글")',
                '.comment_count',
                'td:has-text("댓글")'
            ]
            
            comment_count = 0
            for selector in comment_selectors:
                try:
                    comment_element = await post_element.query_selector(selector)
                    if comment_element:
                        comment_text = await comment_element.inner_text()
                        numbers = re.findall(r'\d+', comment_text)
                        if numbers:
                            comment_count = int(numbers[-1])
                            break
                except:
                    continue
            
            post_info['comment_count'] = comment_count
            
            return post_info
            
        except Exception as e:
            logger.error(f"💥 게시글 정보 추출 실패: {e}")
            return None
    
    async def get_post_details(self, post_info: Dict) -> Optional[Dict]:
        """게시글 상세 정보 수집 (실험용 스크래퍼 활용)"""
        try:
            from ..fmkorea_experiment_scraper import FMKoreaExperimentScraper
            
            # 실험용 스크래퍼로 상세 정보 수집
            async with FMKoreaExperimentScraper() as experiment_scraper:
                detailed_data = await experiment_scraper.scrape_post_experiment(post_info['url'])
                
                if detailed_data and not detailed_data.get('error'):
                    # 기본 정보와 상세 정보 병합
                    post_info.update({
                        'experiment_data': detailed_data,
                        'content': detailed_data.get('content', []),
                        'comments': detailed_data.get('comments', []),
                        'metadata': detailed_data.get('metadata', {})
                    })
                    
                    # 메타데이터에서 추가 정보 업데이트
                    metadata = detailed_data.get('metadata', {})
                    if metadata.get('view_count'):
                        post_info['view_count'] = metadata['view_count']
                    if metadata.get('like_count'):
                        post_info['like_count'] = metadata['like_count']
                    if metadata.get('comment_count'):
                        post_info['comment_count'] = metadata['comment_count']
                
                return post_info
                
        except Exception as e:
            logger.warning(f"⚠️ 게시글 상세 정보 수집 실패: {e}")
            return post_info
    
    def calculate_metrics(self, posts: List[Dict]) -> Dict:
        """게시글 메트릭 계산 및 상위 게시글 선정"""
        try:
            # 메트릭 계산
            for post in posts:
                view_count = post.get('view_count', 0)
                like_count = post.get('like_count', 0)
                comment_count = post.get('comment_count', 0)
                
                # 안전한 나눗셈을 위한 처리
                metrics = {}
                
                # 조회수 대비 추천수 비율
                if view_count > 0:
                    metrics['likes_per_view'] = like_count / view_count
                else:
                    metrics['likes_per_view'] = 0
                
                # 조회수 대비 댓글수 비율
                if view_count > 0:
                    metrics['comments_per_view'] = comment_count / view_count
                else:
                    metrics['comments_per_view'] = 0
                
                # 시간당 조회수 (임시로 조회수 사용)
                metrics['views_per_exposure_hour'] = view_count
                
                post['metrics'] = metrics
            
            # 각 메트릭별 상위 3개 선정
            top_posts = {}
            
            # 추천수 대비 조회수
            sorted_by_likes = sorted(posts, key=lambda x: x.get('metrics', {}).get('likes_per_view', 0), reverse=True)
            top_posts['likes_per_view'] = sorted_by_likes[:3]
            
            # 댓글수 대비 조회수
            sorted_by_comments = sorted(posts, key=lambda x: x.get('metrics', {}).get('comments_per_view', 0), reverse=True)
            top_posts['comments_per_view'] = sorted_by_comments[:3]
            
            # 시간당 조회수
            sorted_by_views = sorted(posts, key=lambda x: x.get('metrics', {}).get('views_per_exposure_hour', 0), reverse=True)
            top_posts['views_per_exposure_hour'] = sorted_by_views[:3]
            
            return top_posts
            
        except Exception as e:
            logger.error(f"💥 메트릭 계산 실패: {e}")
            return {}
    
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
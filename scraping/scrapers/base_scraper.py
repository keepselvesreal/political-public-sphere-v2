"""
커뮤니티 스크래퍼 추상 기본 클래스

주요 기능:
- BaseCommunityScaper: 모든 커뮤니티 스크래퍼의 기본 클래스 (line 20-80)
- 템플릿 메서드 패턴으로 공통 로직 정의 (line 82-150)
- 사이트별 구현이 필요한 추상 메서드 정의 (line 152-200)
- 브라우저 관리 및 에러 핸들링 공통화 (line 202-280)
- 게시글 선별 및 워크플로우 통합 (line 282-350)

작성자: AI Assistant
작성일: 2025-01-28
목적: 커뮤니티 스크래퍼 통일성 및 유지보수성 향상
"""

import asyncio
import re
from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Dict, Optional, Any, Protocol
from urllib.parse import urljoin
import pytz

from playwright.async_api import async_playwright, Page, Browser
from playwright_stealth import stealth_async
from loguru import logger


class SiteConfig(Protocol):
    """사이트별 설정 프로토콜"""
    base_url: str
    selectors: Dict[str, List[str]]
    wait_timeout: int
    navigation_timeout: int


class BaseCommunityScaper(ABC):
    """
    커뮤니티 스크래퍼 추상 기본 클래스
    
    템플릿 메서드 패턴을 사용하여 공통 로직은 기본 클래스에서 처리하고,
    사이트별 차이점만 하위 클래스에서 구현하도록 설계
    
    워크플로우: 게시판 목록 → 메타데이터 추출 → 선별 → 상세 스크래핑 → 저장
    """
    
    def __init__(self, site_config: SiteConfig):
        self.site_config = site_config
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.playwright = None
        
        # 한국 시간대 설정
        self.kst = pytz.timezone('Asia/Seoul')
        
        # 공통 브라우저 설정
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
    
    async def __aenter__(self):
        """비동기 컨텍스트 매니저 진입"""
        await self.setup_browser()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """비동기 컨텍스트 매니저 종료"""
        await self.close_browser()
    
    # 공통 브라우저 관리 메서드들
    async def setup_browser(self):
        """브라우저 설정 및 초기화 (공통 로직)"""
        try:
            self.playwright = await async_playwright().start()
            
            self.browser = await self.playwright.chromium.launch(
                headless=False,
                args=[
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled',
                    '--window-size=1920,1080'
                ]
            )
            
            self.page = await self.browser.new_page()
            await stealth_async(self.page)
            
            await self.page.set_viewport_size({"width": 1920, "height": 1080})
            await self.page.set_extra_http_headers({
                'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
            })
            
            logger.info(f"✅ {self.get_site_name()} 브라우저 설정 완료")
            
        except Exception as e:
            logger.error(f"💥 브라우저 설정 실패: {e}")
            raise
    
    async def close_browser(self):
        """브라우저 종료 (공통 로직)"""
        try:
            if self.page and not self.page.is_closed():
                await asyncio.wait_for(self.page.close(), timeout=5.0)
                self.page = None
            
            if self.browser and self.browser.is_connected():
                contexts = self.browser.contexts
                for context in contexts:
                    if not context.is_closed():
                        await asyncio.wait_for(context.close(), timeout=3.0)
                
                await asyncio.wait_for(self.browser.close(), timeout=10.0)
                self.browser = None
            
            if self.playwright:
                await asyncio.wait_for(self.playwright.stop(), timeout=5.0)
                self.playwright = None
            
            await asyncio.sleep(0.5)
            import gc
            gc.collect()
            
            logger.info(f"✅ {self.get_site_name()} 브라우저 종료 완료")
            
        except Exception as e:
            logger.debug(f"브라우저 종료 중 오류 (무시됨): {e}")
            self.page = None
            self.browser = None
            self.playwright = None
    
    # 템플릿 메서드들 (공통 워크플로우)
    async def scrape_board_list(self, board_url: str, page: int = 1) -> List[Dict]:
        """
        게시판 목록 스크래핑 (템플릿 메서드)
        
        워크플로우:
        1. 페이지 이동
        2. 게시글 목록 요소 대기
        3. 게시글 목록 추출 (사이트별 구현)
        """
        try:
            logger.info(f"🧪 {self.get_site_name()} 게시판 목록 스크래핑 시작: {board_url}")
            
            if self.page is None:
                raise Exception("브라우저가 초기화되지 않았습니다.")
            
            # 1. 페이지 이동
            await self.navigate_to_board(board_url, page)
            
            # 2. 게시글 목록 요소 대기
            await self.wait_for_board_elements()
            
            # 3. 게시글 목록 추출 (사이트별 구현)
            posts = await self.extract_board_posts()
            
            logger.info(f"✅ {self.get_site_name()} 게시판 목록 스크래핑 완료: {len(posts)}개")
            return posts
            
        except Exception as e:
            logger.error(f"💥 {self.get_site_name()} 게시판 목록 스크래핑 실패: {e}")
            return []
    
    async def scrape_post_detail(self, post_url: str) -> Dict:
        """
        게시글 상세 스크래핑 (템플릿 메서드)
        
        워크플로우:
        1. 페이지 이동
        2. 게시글 요소 대기
        3. 데이터 추출 (메타데이터, 본문, 댓글)
        4. CommunityPost 모델 구조로 결과 구성
        """
        try:
            logger.info(f"🧪 {self.get_site_name()} 게시글 상세 스크래핑 시작: {post_url}")
            
            if self.page is None:
                raise Exception("브라우저가 초기화되지 않았습니다.")
            
            # 1. 페이지 이동
            await self.navigate_to_post(post_url)
            
            # 2. 게시글 요소 대기
            await self.wait_for_post_elements()
            
            # 3. 데이터 추출
            post_id = self.parse_post_id_from_url(post_url)
            metadata = await self.extract_post_metadata()
            content = await self.extract_content_in_order()
            comments = await self.extract_comments_data()
            
            # 실제 추출된 댓글 수로 메타데이터 업데이트
            metadata['comment_count'] = len(comments)
            
            # 4. CommunityPost 모델 구조로 결과 구성
            result = {
                'post_id': post_id,
                'post_url': post_url,
                'scraped_at': datetime.now(self.kst).isoformat(),
                'metadata': metadata,
                'content': content,
                'comments': comments,
                'experiment_purpose': f'{self.get_site_name()}_post_reproduction',
                'page_title': await self.page.title()
            }
            
            logger.info(f"✅ {self.get_site_name()} 게시글 스크래핑 완료: {len(content)}개 콘텐츠, {len(comments)}개 댓글")
            return result
            
        except Exception as e:
            logger.error(f"💥 {self.get_site_name()} 게시글 스크래핑 실패: {e}")
            raise
    
    async def scrape_board_with_selection(self, board_url: str, criteria_count: int = 3) -> Dict[str, List[Dict]]:
        """
        게시판 스크래핑 및 지표별 선별 (통합 워크플로우)
        
        워크플로우:
        1. 게시판 목록 스크래핑
        2. 메타데이터 추출
        3. 지표별 선별 (추천수, 댓글수, 조회수)
        4. 선별된 게시글 반환
        """
        try:
            logger.info(f"🚀 {self.get_site_name()} 지표별 선별 스크래핑 시작")
            
            # 1. 게시판 목록 스크래핑
            posts_with_metadata = await self.scrape_board_list(board_url)
            
            if not posts_with_metadata:
                logger.warning("⚠️ 게시글을 찾을 수 없습니다.")
                return {}
            
            # 2. 지표별 선별
            selected_posts = self.select_posts_by_criteria(posts_with_metadata, criteria_count)
            
            logger.info(f"✅ {self.get_site_name()} 지표별 선별 완료")
            return selected_posts
            
        except Exception as e:
            logger.error(f"💥 {self.get_site_name()} 지표별 선별 실패: {e}")
            return {}
    
    # 공통 유틸리티 메서드들
    async def navigate_to_board(self, board_url: str, page: int):
        """게시판 페이지 이동 (공통 로직)"""
        if page > 1:
            separator = '&' if '?' in board_url else '?'
            board_url = f"{board_url}{separator}page={page}"
        
        await self.page.goto(board_url, wait_until="networkidle", 
                           timeout=self.site_config.navigation_timeout)
    
    async def navigate_to_post(self, post_url: str):
        """게시글 페이지 이동 (공통 로직)"""
        await self.page.goto(post_url, wait_until="networkidle", 
                           timeout=self.site_config.navigation_timeout)
    
    def make_absolute_url(self, url: str) -> str:
        """상대 URL을 절대 URL로 변환 (공통 로직)"""
        if url.startswith('//'):
            return 'https:' + url
        elif url.startswith('/'):
            return urljoin(self.site_config.base_url, url)
        return url
    
    def select_posts_by_criteria(self, posts: List[Dict], criteria_count: int = 3) -> Dict[str, List[Dict]]:
        """
        지표별로 상위 게시글 선별 (중복 제거)
        
        Args:
            posts: 게시글 목록
            criteria_count: 각 기준별 선별할 게시글 수
        
        Returns:
            Dict: 기준별 선별된 게시글 목록
        """
        try:
            selected_posts = {
                'likes': [],
                'comments': [],
                'views': []
            }
            
            selected_post_ids = set()  # 중복 방지용
            
            # 1. 추천수 기준 상위 선별
            likes_sorted = sorted(posts, key=lambda x: x.get('like_count', 0), reverse=True)
            for post in likes_sorted:
                if len(selected_posts['likes']) >= criteria_count:
                    break
                if post.get('post_id') not in selected_post_ids:
                    selected_posts['likes'].append(post)
                    selected_post_ids.add(post.get('post_id'))
            
            # 2. 댓글수 기준 상위 선별 (중복 제외)
            comments_sorted = sorted(posts, key=lambda x: x.get('comment_count', 0), reverse=True)
            for post in comments_sorted:
                if len(selected_posts['comments']) >= criteria_count:
                    break
                if post.get('post_id') not in selected_post_ids:
                    selected_posts['comments'].append(post)
                    selected_post_ids.add(post.get('post_id'))
            
            # 3. 조회수 기준 상위 선별 (중복 제외)
            views_sorted = sorted(posts, key=lambda x: x.get('view_count', 0), reverse=True)
            for post in views_sorted:
                if len(selected_posts['views']) >= criteria_count:
                    break
                if post.get('post_id') not in selected_post_ids:
                    selected_posts['views'].append(post)
                    selected_post_ids.add(post.get('post_id'))
            
            # 로깅
            total_selected = sum(len(posts) for posts in selected_posts.values())
            logger.info(f"✅ 게시글 선별 완료: 총 {total_selected}개")
            for criteria, posts_list in selected_posts.items():
                logger.info(f"  - {criteria}: {len(posts_list)}개")
            
            return selected_posts
            
        except Exception as e:
            logger.error(f"💥 게시글 선별 실패: {e}")
            return {'likes': [], 'comments': [], 'views': []}
    
    # 추상 메서드들 (사이트별 구현 필요)
    @abstractmethod
    def get_site_name(self) -> str:
        """사이트 이름 반환"""
        pass
    
    @abstractmethod
    async def wait_for_board_elements(self):
        """게시판 요소 로딩 대기"""
        pass
    
    @abstractmethod
    async def wait_for_post_elements(self):
        """게시글 요소 로딩 대기"""
        pass
    
    @abstractmethod
    async def extract_board_posts(self) -> List[Dict]:
        """게시판에서 게시글 목록 추출 (메타데이터 포함)"""
        pass
    
    @abstractmethod
    async def extract_post_metadata(self) -> Dict:
        """게시글 메타데이터 추출"""
        pass
    
    @abstractmethod
    async def extract_content_in_order(self) -> List[Dict]:
        """게시글 본문 내용 순서대로 추출"""
        pass
    
    @abstractmethod
    async def extract_comments_data(self) -> List[Dict]:
        """댓글 데이터 추출"""
        pass
    
    @abstractmethod
    def parse_post_id_from_url(self, url: str) -> str:
        """URL에서 게시글 ID 추출"""
        pass


class FMKoreaConfig:
    """FM코리아 사이트 설정"""
    
    def __init__(self):
        self.base_url = "https://www.fmkorea.com"
        self.wait_timeout = 10000
        self.navigation_timeout = 30000
        
        # FM코리아 특화 셀렉터들 (기존 스크래퍼에서 검증된 것들)
        self.selectors = {
            'title': [
                '.xe_content h1',
                '.board_title',
                'h1.title',
                '.document_title'
            ],
            'author': [
                '.member_info .nickname',
                '.author .nickname',
                '.writer .nickname'
            ],
            'date': [
                '.date',
                '.time',
                '.regdate'
            ],
            'post_container': [
                '.xe_content .document_content',
                '.document_content',
                '.content'
            ],
            'board_list': [
                '.fmk_list_table tbody tr',
                '.board_list tbody tr'
            ]
        }


class RuliwebConfig:
    """루리웹 사이트 설정"""
    
    def __init__(self):
        self.base_url = "https://bbs.ruliweb.com"
        self.wait_timeout = 10000
        self.navigation_timeout = 30000
        
        # 루리웹 특화 셀렉터들 (기존 스크래퍼에서 검증된 것들)
        self.selectors = {
            'title': [
                '.board_main_top .subject_text',
                '.subject_text',
                'h1.title'
            ],
            'author': [
                '.board_main_top .nick',
                '.writer .nick',
                '.user .nick'
            ],
            'date': [
                '.board_main_top .time',
                '.time',
                '.regdate'
            ],
            'post_container': [
                '.view_content .article_content',
                '.article_content',
                '.content'
            ],
            'board_list': [
                '.board_list_table tbody tr.table_body',
                '.board_list tbody tr'
            ]
        } 
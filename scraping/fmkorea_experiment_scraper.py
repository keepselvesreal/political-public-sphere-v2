"""
FM코리아 실험용 스크래퍼 모듈

주요 기능:
- FMKoreaExperimentScraper: 실험용 스크래퍼 클래스 (line 35-80)
- scrape_post_experiment: 개별 게시글 상세 스크래핑 (line 82-150)
- extract_content_in_order: 본문 내용을 순서대로 추출 (line 152-250)
- extract_post_metadata: 게시글 메타데이터 추출 (line 252-320)
- parse_post_id_from_url: URL에서 게시글 ID 추출 (line 322-350)

작성자: AI Assistant
작성일: 2025-05-29 17:00 KST
목적: FM코리아 게시글 재현 실험용 정밀 스크래핑
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


class FMKoreaExperimentScraper:
    """
    FM코리아 실험용 스크래퍼 클래스
    
    개별 게시글의 상세 정보를 순서대로 스크래핑하여 
    원본 게시글 재현이 가능하도록 정밀하게 데이터를 수집합니다.
    """
    
    def __init__(self):
        self.base_url = 'https://www.fmkorea.com'
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        
        # 한국 시간대 설정
        self.kst = pytz.timezone('Asia/Seoul')
        
        # 스크래핑 설정 (기존 성공한 설정 적용)
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
        
        # 대기 시간 설정 (기존 성공한 설정)
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
        """브라우저 설정 및 초기화 (기존 성공한 설정과 동일)"""
        try:
            playwright = await async_playwright().start()
            
            # 브라우저 옵션 설정 (헤드리스 모드 해제)
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
            
            # 추가 설정 (기존 성공한 설정과 동일)
            await self.page.set_viewport_size({"width": 1920, "height": 1080})
            await self.page.set_extra_http_headers({
                'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
            })
            
            logger.info("✅ 실험용 브라우저 설정 완료")
            
        except Exception as e:
            logger.error(f"💥 브라우저 설정 실패: {e}")
            raise
    
    async def close_browser(self):
        """브라우저 종료 (I/O 파이프 오류 방지)"""
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
    
    async def scrape_post_experiment(self, post_url: str) -> Dict:
        """
        실험용 게시글 상세 스크래핑 (기존 스크래퍼와 동일한 방식)
        재시도 로직 제거하여 빠른 피드백 제공
        
        Args:
            post_url: 게시글 URL
        
        Returns:
            Dict: 실험용 게시글 데이터 (순서 보존)
        """
        try:
            logger.info(f"🧪 실험용 게시글 스크래핑 시작: {post_url}")
            
            # 브라우저가 초기화되지 않은 경우 처리
            if self.page is None:
                logger.error("💥 브라우저가 초기화되지 않았습니다.")
                return {}
            
            # 페이지 이동 (기존 스크래퍼와 동일한 방식)
            await self.page.goto(post_url, wait_until="networkidle", timeout=self.navigation_timeout)
            
            # 게시글 본문 영역이 로드될 때까지 대기
            try:
                await self.page.wait_for_selector('article, .xe_content, .rd_body', timeout=self.wait_timeout)
            except:
                logger.warning("⚠️ 게시글 본문 영역을 찾을 수 없습니다. 계속 진행합니다.")
            
            # 페이지 로드 확인
            page_title = await self.page.title()
            logger.info(f"📄 페이지 제목: {page_title}")
            
            # 게시글 ID 추출
            post_id = self.parse_post_id_from_url(post_url)
            
            # 메타데이터 추출
            metadata = await self.extract_post_metadata()
            
            # 본문 내용을 순서대로 추출
            content_list = await self.extract_content_in_order()
            
            # 댓글 데이터 추출
            comments = await self.extract_comments_data()
            
            # 실제 추출된 댓글 수로 메타데이터 업데이트
            metadata['comment_count'] = len(comments)
            
            experiment_data = {
                'post_id': post_id,
                'post_url': post_url,
                'scraped_at': datetime.now(self.kst).isoformat(),
                'metadata': metadata,
                'content': content_list,
                'comments': comments,
                'experiment_purpose': 'fmkorea_post_reproduction',
                'page_title': page_title
            }
            
            logger.info(f"✅ 실험용 게시글 스크래핑 완료: {len(content_list)}개 콘텐츠 요소")
            return experiment_data
            
        except Exception as e:
            logger.error(f"💥 실험용 게시글 스크래핑 실패: {e}")
            return {
                'post_id': self.parse_post_id_from_url(post_url),
                'post_url': post_url,
                'scraped_at': datetime.now(self.kst).isoformat(),
                'error': str(e),
                'experiment_purpose': 'fmkorea_post_reproduction'
            }

    async def extract_content_in_order(self) -> List[Dict]:
        """
        게시글 본문 내용을 DOM 순서대로 추출
        이미지, 텍스트, 동영상을 등장 순서대로 수집
        
        Returns:
            List[Dict]: 순서가 보존된 콘텐츠 리스트
        """
        try:
            content_list: List[Dict] = []
            order = 1
            
            # 브라우저가 초기화되지 않은 경우 처리
            if self.page is None:
                logger.error("💥 브라우저가 초기화되지 않았습니다.")
                return []
            
            # FM코리아 게시글 본문 컨테이너 찾기
            article_selectors = [
                'article .xe_content',
                'article div[class*="document_"]',
                'div.rd_body article',
                'article'
            ]
            
            article_element = None
            for selector in article_selectors:
                try:
                    element = await self.page.query_selector(selector)
                    if element:
                        article_element = element
                        logger.info(f"✅ 본문 컨테이너 발견: {selector}")
                        break
                except:
                    continue
            
            if not article_element:
                logger.warning("⚠️ 게시글 본문 컨테이너를 찾을 수 없습니다.")
                return []
            
            # 개선된 콘텐츠 추출: 모든 하위 요소를 순회하여 누락 방지
            order = await self.extract_elements_recursively(article_element, content_list, order)
            
            logger.info(f"✅ 총 {len(content_list)}개 콘텐츠 요소 순서대로 추출 완료")
            return content_list
            
        except Exception as e:
            logger.error(f"💥 순서대로 콘텐츠 추출 실패: {e}")
            return []

    async def extract_elements_recursively(self, parent_element, content_list: List[Dict], order_start: int) -> int:
        """
        요소를 재귀적으로 순회하여 콘텐츠 추출 (개선된 방식)
        
        Args:
            parent_element: 부모 요소
            content_list: 콘텐츠 리스트 (참조로 수정됨)
            order_start: 시작 순서 번호
            
        Returns:
            int: 다음 순서 번호
        """
        current_order = order_start
        
        try:
            # 모든 자식 요소 순회
            child_elements = await parent_element.query_selector_all('*')
            processed_elements = set()  # 중복 처리 방지
            
            for element in child_elements:
                try:
                    # 이미 처리된 요소는 건너뛰기
                    element_handle = await element.evaluate('el => el')
                    if id(element_handle) in processed_elements:
                        continue
                    processed_elements.add(id(element_handle))
                    
                    tag_name = await element.evaluate('el => el.tagName.toLowerCase()')
                    
                    # 이미지 처리 (data-original 우선 확인)
                    if tag_name == 'img':
                        # data-original이나 src 확인
                        data_original = await element.get_attribute('data-original')
                        src = await element.get_attribute('src')
                        
                        if data_original or src:
                            # 부모 링크 요소 확인
                            parent_a = await element.evaluate('el => el.closest("a")')
                            img_data = await self.extract_image_data(parent_a, element, current_order)
                            if img_data:
                                content_list.append(img_data)
                                current_order += 1
                    
                    # 링크 내부 이미지 처리 (a > img)
                    elif tag_name == 'a':
                        img_elements = await element.query_selector_all('img')
                        for img in img_elements:
                            # 이미 처리되지 않은 이미지만 처리
                            img_handle = await img.evaluate('el => el')
                            if id(img_handle) not in processed_elements:
                                data_original = await img.get_attribute('data-original')
                                src = await img.get_attribute('src')
                                
                                if data_original or src:
                                    img_data = await self.extract_image_data(element, img, current_order)
                                    if img_data:
                                        content_list.append(img_data)
                                        current_order += 1
                                        processed_elements.add(id(img_handle))
                    
                    # 동영상 처리
                    elif tag_name == 'video':
                        video_data = await self.extract_video_data(element, current_order)
                        if video_data:
                            content_list.append(video_data)
                            current_order += 1
                    
                    # 텍스트 요소 처리 (순수 텍스트만 있는 요소)
                    elif tag_name in ['p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                        # 하위에 img나 video가 없는 경우에만 텍스트로 처리
                        has_media = await element.query_selector('img, video')
                        if not has_media:
                            text_content = await element.evaluate('el => el.textContent?.trim()')
                            if text_content and len(text_content.strip()) > 0:
                                text_data = await self.extract_text_data(element, current_order)
                                if text_data:
                                    content_list.append(text_data)
                                    current_order += 1
                
                except Exception as e:
                    logger.warning(f"⚠️ 요소 처리 실패: {e}")
                    continue
            
            return current_order
            
        except Exception as e:
            logger.error(f"💥 재귀적 요소 추출 실패: {e}")
            return current_order

    async def extract_image_data(self, link_element, img_element, order: int) -> Optional[Dict]:
        """이미지 데이터 추출 (data-original 속성 강화)"""
        try:
            # 이미지 소스 우선순위: data-original > src
            src = await img_element.get_attribute('data-original')
            if not src:
                src = await img_element.get_attribute('src')
            
            if not src:
                return None
            
            # 절대 URL로 변환
            if src.startswith('//'):
                src = 'https:' + src
            elif src.startswith('/'):
                src = urljoin(self.base_url, src)
            
            # 원본 src도 보존 (fallback용)
            original_src = await img_element.get_attribute('src')
            if original_src and original_src.startswith('//'):
                original_src = 'https:' + original_src
            elif original_src and original_src.startswith('/'):
                original_src = urljoin(self.base_url, original_src)
            
            img_data = {
                'type': 'image',
                'order': order,
                'data': {
                    'src': src,
                    'original_src': original_src if original_src != src else '',
                    'width': await img_element.get_attribute('width'),
                    'height': await img_element.get_attribute('height'),
                    'style': await img_element.get_attribute('style') or '',
                    'alt': await img_element.get_attribute('alt') or '',
                    'class': await img_element.get_attribute('class') or '',
                    'title': await img_element.get_attribute('title') or '',
                    'data_original': await img_element.get_attribute('data-original') or '',
                    'data_file_srl': await img_element.get_attribute('data-file-srl') or ''
                }
            }
            
            # 링크 정보 추가
            if link_element:
                href = await link_element.get_attribute('href')
                if href:
                    if href.startswith('//'):
                        href = 'https:' + href
                    elif href.startswith('/'):
                        href = urljoin(self.base_url, href)
                    img_data['data']['href'] = href
                    img_data['data']['link_class'] = await link_element.get_attribute('class') or ''
                    img_data['data']['link_rel'] = await link_element.get_attribute('rel') or ''
            
            return img_data
            
        except Exception as e:
            logger.warning(f"⚠️ 이미지 데이터 추출 실패: {e}")
            return None

    async def extract_video_data(self, video_element, order: int) -> Optional[Dict]:
        """동영상 데이터 추출 (자동재생 감지 강화)"""
        try:
            # 동영상 소스 추출
            src = await video_element.get_attribute('src')
            if not src:
                # source 태그에서 추출 시도
                source = await video_element.query_selector('source')
                if source:
                    src = await source.get_attribute('src')
            
            if not src:
                return None
            
            # 절대 URL로 변환
            if src.startswith('//'):
                src = 'https:' + src
            elif src.startswith('/'):
                src = urljoin(self.base_url, src)
            
            # 자동재생 속성 강화 감지
            autoplay = False
            autoplay_attr = await video_element.get_attribute('autoplay')
            if autoplay_attr is not None:
                autoplay = True
            else:
                # data-autoplay 같은 속성도 확인
                data_autoplay = await video_element.get_attribute('data-autoplay')
                if data_autoplay:
                    autoplay = True
            
            # 음소거 속성 감지
            muted = False
            muted_attr = await video_element.get_attribute('muted')
            if muted_attr is not None:
                muted = True
            else:
                # 자동재생이면 음소거 처리 (브라우저 정책)
                if autoplay:
                    muted = True
            
            video_data = {
                'type': 'video',
                'order': order,
                'data': {
                    'src': src,
                    'poster': await video_element.get_attribute('poster') or '',
                    'width': await video_element.get_attribute('width'),
                    'height': await video_element.get_attribute('height'),
                    'autoplay': autoplay,
                    'loop': await video_element.get_attribute('loop') is not None,
                    'muted': muted,
                    'controls': await video_element.get_attribute('controls') is not None,
                    'class': await video_element.get_attribute('class') or '',
                    'preload': await video_element.get_attribute('preload') or 'metadata'
                }
            }
            
            return video_data
            
        except Exception as e:
            logger.warning(f"⚠️ 동영상 데이터 추출 실패: {e}")
            return None

    async def extract_text_data(self, text_element, order: int) -> Optional[Dict]:
        """텍스트 데이터 추출"""
        try:
            text_content = await text_element.evaluate('el => el.textContent?.trim()')
            if not text_content or len(text_content.strip()) == 0:
                return None
            
            tag_name = await text_element.evaluate('el => el.tagName.toLowerCase()')
            
            text_data = {
                'type': 'text',
                'order': order,
                'data': {
                    'tag': tag_name,
                    'text': text_content,
                    'id': await text_element.get_attribute('id') or '',
                    'class': await text_element.get_attribute('class') or '',
                    'style': await text_element.get_attribute('style') or '',
                    'innerHTML': await text_element.inner_html()
                }
            }
            
            return text_data
            
        except Exception as e:
            logger.warning(f"⚠️ 텍스트 데이터 추출 실패: {e}")
            return None

    async def extract_post_metadata(self) -> Dict:
        """게시글 메타데이터 추출 (원본 HTML 구조 기반)"""
        try:
            metadata = {}
            
            # 브라우저가 초기화되지 않은 경우 처리
            if self.page is None:
                logger.error("💥 브라우저가 초기화되지 않았습니다.")
                return {}
            
            # 제목 추출 (원본 구조: h1.np_18px span.np_18px_span)
            title_selectors = [
                'h1.np_18px span.np_18px_span',
                'h1.np_18px',
                'h1.title',
                'h1',
                '.document_title h1',
                '.rd_hd h1',
                'div.rd_hd h1',
                'article h1'
            ]
            
            for selector in title_selectors:
                try:
                    title_element = await self.page.query_selector(selector)
                    if title_element:
                        title_text = await title_element.inner_text()
                        if title_text and title_text.strip():
                            metadata['title'] = title_text.strip()
                            break
                except:
                    continue
            
            # 작성자 추출 (원본 구조: .member_plate)
            author_selectors = [
                '.btm_area .side .member_plate',
                '.member_plate',
                '.meta .member_plate',
                '.document_info .member_plate',
                '.rd_hd .member_plate',
                'td.author .member_plate',
                '.author .member_plate'
            ]
            
            for selector in author_selectors:
                try:
                    author_element = await self.page.query_selector(selector)
                    if author_element:
                        author_text = await author_element.inner_text()
                        if author_text and author_text.strip():
                            metadata['author'] = author_text.strip()
                            break
                except:
                    continue
            
            # 작성 시간 추출 (원본 구조: .top_area .date.m_no)
            date_selectors = [
                '.top_area .date.m_no',
                '.rd_hd .date.m_no',
                '.meta .date',
                '.document_info .date',
                '.rd_hd .date',
                'td.time',
                '.time',
                'span.date'
            ]
            
            for selector in date_selectors:
                try:
                    date_element = await self.page.query_selector(selector)
                    if date_element:
                        date_text = await date_element.inner_text()
                        if date_text and date_text.strip():
                            metadata['date'] = date_text.strip()
                            break
                except:
                    continue
            
            # 통계 정보 추출 (원본 구조: .btm_area .side.fr span)
            # 조회수 추출
            view_count = 0
            view_selectors = [
                '.btm_area .side.fr span:has-text("조회")',
                '.side.fr span:has-text("조회")',
                'td.m_no:has-text("조회")',
                '.meta .m_no:has-text("조회")',
                '.document_info .view_count',
                'span:has-text("조회")',
                '.view_count'
            ]
            
            for selector in view_selectors:
                try:
                    view_element = await self.page.query_selector(selector)
                    if view_element:
                        view_text = await view_element.inner_text()
                        # "조회 수 44035" 또는 "조회 44035" 형태에서 숫자만 추출
                        import re
                        numbers = re.findall(r'\d+', view_text)
                        if numbers:
                            view_count = int(numbers[-1])  # 마지막 숫자가 조회수
                            break
                except:
                    continue
            
            metadata['view_count'] = view_count
            
            # 추천수 추출
            like_count = 0
            like_selectors = [
                '.btm_area .side.fr span:has-text("추천")',
                '.side.fr span:has-text("추천")',
                'td.m_no:has-text("추천")',
                '.meta .m_no:has-text("추천")',
                '.document_info .like_count',
                'span:has-text("추천")',
                '.like_count',
                '.voted_count'
            ]
            
            for selector in like_selectors:
                try:
                    like_element = await self.page.query_selector(selector)
                    if like_element:
                        like_text = await like_element.inner_text()
                        # "추천 수 229" 또는 "추천 229" 형태에서 숫자만 추출
                        import re
                        numbers = re.findall(r'\d+', like_text)
                        if numbers:
                            like_count = int(numbers[-1])  # 마지막 숫자가 추천수
                            break
                except:
                    continue
            
            metadata['like_count'] = like_count
            
            # 비추천수 추출
            dislike_count = 0
            dislike_selectors = [
                '.btm_area .side.fr span:has-text("비추천")',
                '.side.fr span:has-text("비추천")',
                'td.m_no:has-text("비추천")',
                '.meta .m_no:has-text("비추천")',
                '.document_info .dislike_count',
                'span:has-text("비추천")',
                '.dislike_count',
                '.blamed_count'
            ]
            
            for selector in dislike_selectors:
                try:
                    dislike_element = await self.page.query_selector(selector)
                    if dislike_element:
                        dislike_text = await dislike_element.inner_text()
                        # "비추천 3" 형태에서 숫자만 추출
                        import re
                        numbers = re.findall(r'\d+', dislike_text)
                        if numbers:
                            dislike_count = int(numbers[-1])
                            break
                except:
                    continue
            
            metadata['dislike_count'] = dislike_count
            
            # 댓글수 추출 (원본 구조: .btm_area .side.fr span:has-text("댓글"))
            comment_count = 0
            comment_count_selectors = [
                '.btm_area .side.fr span:has-text("댓글")',
                '.side.fr span:has-text("댓글")',
                'td.m_no:has-text("댓글")',
                '.meta .m_no:has-text("댓글")',
                '.document_info .comment_count',
                'span:has-text("댓글")',
                '.comment_count'
            ]
            
            for selector in comment_count_selectors:
                try:
                    comment_element = await self.page.query_selector(selector)
                    if comment_element:
                        comment_text = await comment_element.inner_text()
                        # "댓글 90" 형태에서 숫자만 추출
                        import re
                        numbers = re.findall(r'\d+', comment_text)
                        if numbers:
                            comment_count = int(numbers[-1])
                            break
                except:
                    continue
            
            metadata['comment_count'] = comment_count
            
            # 카테고리 추출 (기존 성공한 셀렉터들)
            category_selectors = [
                '.cate',
                '.category',
                '.board_category',
                'td.cate a'
            ]
            
            for selector in category_selectors:
                try:
                    category_element = await self.page.query_selector(selector)
                    if category_element:
                        category_text = await category_element.inner_text()
                        if category_text and category_text.strip():
                            metadata['category'] = category_text.strip()
                            break
                except:
                    continue
            
            logger.info(f"✅ 메타데이터 추출 완료: 제목={metadata.get('title', 'N/A')}, 작성자={metadata.get('author', 'N/A')}, 조회수={metadata.get('view_count', 0)}, 추천수={metadata.get('like_count', 0)}")
            return metadata
            
        except Exception as e:
            logger.error(f"💥 메타데이터 추출 실패: {e}")
            return {}

    async def extract_comments_data(self) -> List[Dict]:
        """댓글 데이터 추출 (기존 성공한 로직 기반)"""
        try:
            comments = []
            
            # 브라우저가 초기화되지 않은 경우 처리
            if self.page is None:
                logger.error("💥 브라우저가 초기화되지 않았습니다.")
                return []
            
            # FM코리아 댓글 구조에 맞는 셀렉터들 (기존 성공한 셀렉터)
            comment_selectors = [
                'ul.fdb_lst_ul li',
                'div.fdb_lst_ul li',
                'ul.comment_list li',
                'div.comment_list li'
            ]
            
            comment_elements = []
            for selector in comment_selectors:
                try:
                    elements = await self.page.query_selector_all(selector)
                    if elements:
                        # 실제 댓글인지 확인 (comment_ ID가 있는 것만)
                        valid_elements = []
                        for element in elements:
                            element_id = await element.get_attribute('id')
                            if element_id and element_id.startswith('comment_'):
                                valid_elements.append(element)
                        
                        if valid_elements:
                            comment_elements = valid_elements
                            logger.info(f"✅ {len(valid_elements)}개 댓글 요소 발견 (셀렉터: {selector})")
                            break
                except Exception as e:
                    logger.warning(f"⚠️ 셀렉터 {selector} 실패: {e}")
                    continue
            
            if not comment_elements:
                logger.warning("⚠️ 댓글 요소를 찾을 수 없습니다.")
                return []
            
            # 각 댓글 요소에서 데이터 추출
            for comment_element in comment_elements:
                try:
                    comment_data = await self.extract_single_comment_data(comment_element)
                    if comment_data and comment_data.get('content'):
                        comments.append(comment_data)
                except Exception as e:
                    logger.warning(f"⚠️ 댓글 추출 실패: {e}")
                    continue
            
            logger.info(f"✅ 총 {len(comments)}개 댓글 수집 완료")
            return comments
            
        except Exception as e:
            logger.error(f"💥 댓글 데이터 추출 실패: {e}")
            return []

    async def extract_single_comment_data(self, comment_element) -> Optional[Dict]:
        """개별 댓글 데이터 추출 (기존 성공한 로직 기반 + 레벨 정보 추가)"""
        try:
            comment_data = {}
            
            # 댓글 ID
            comment_data['comment_id'] = await comment_element.get_attribute('id') or ''
            
            # 작성자 (기존 성공한 셀렉터들)
            author_selectors = [
                'div.side a.member_plate', 
                'div.meta a.member_plate', 
                'div.meta a',
                '.member_plate',
                '.comment_author',
                '.author'
            ]
            
            author_found = False
            for selector in author_selectors:
                try:
                    author_element = await comment_element.query_selector(selector)
                    if author_element:
                        author_text = await author_element.inner_text()
                        if author_text and author_text.strip():
                            comment_data['author'] = author_text.strip()
                            author_found = True
                            break
                except:
                    continue
            
            if not author_found:
                comment_data['author'] = '익명'
            
            # 댓글 내용 (기존 성공한 셀렉터들)
            content_selectors = [
                'div.comment-content div',
                'div.comment-content',
                '.comment_content',
                '.content',
                '.comment_text'
            ]
            
            content_found = False
            for selector in content_selectors:
                try:
                    content_element = await comment_element.query_selector(selector)
                    if content_element:
                        content_text = await content_element.inner_text()
                        if content_text and content_text.strip():
                            comment_data['content'] = content_text.strip()
                            content_found = True
                            break
                except:
                    continue
            
            if not content_found:
                comment_data['content'] = ''
            
            # 작성 시간 (기존 성공한 셀렉터들)
            date_selectors = [
                'div.meta span.date',
                'span.date.m_no',
                '.date',
                '.comment_date',
                '.time'
            ]
            
            date_found = False
            for selector in date_selectors:
                try:
                    date_element = await comment_element.query_selector(selector)
                    if date_element:
                        date_text = await date_element.inner_text()
                        if date_text and date_text.strip():
                            comment_data['date'] = date_text.strip()
                            date_found = True
                            break
                except:
                    continue
            
            if not date_found:
                comment_data['date'] = ''
            
            # 댓글 레벨 추출 (들여쓰기 기준) - 중요한 추가 부분
            try:
                # style 속성에서 margin-left 확인
                style_attr = await comment_element.get_attribute('style')
                class_attr = await comment_element.get_attribute('class')
                
                level = 0
                
                # margin-left로 레벨 계산
                if style_attr and 'margin-left:' in style_attr:
                    import re
                    margin_match = re.search(r'margin-left:(\d+)%', style_attr)
                    if margin_match:
                        margin_left = int(margin_match.group(1))
                        level = margin_left // 2  # 2%당 1레벨
                
                # 클래스명으로도 확인
                if class_attr and ('re' in class_attr or 'reply' in class_attr or 'depth' in class_attr):
                    level = max(level, 1)
                
                # 대댓글 표시 확인 (FM코리아 특성)
                reply_indicators = await comment_element.query_selector_all('a.findParent, .reply_to, .parent_comment')
                if reply_indicators:
                    level = max(level, 1)
                
                comment_data['level'] = level
                comment_data['is_reply'] = level > 0
                
            except:
                comment_data['level'] = 0
                comment_data['is_reply'] = False
            
            # 부모 댓글 정보 (대댓글인 경우)
            try:
                if comment_data['is_reply']:
                    parent_selectors = [
                        'a.findParent',
                        '.parent_comment',
                        '.reply_to'
                    ]
                    
                    parent_comment = ''
                    for selector in parent_selectors:
                        try:
                            parent_element = await comment_element.query_selector(selector)
                            if parent_element:
                                parent_text = await parent_element.inner_text()
                                if parent_text and parent_text.strip():
                                    parent_comment = parent_text.strip()
                                    break
                        except:
                            continue
                    
                    comment_data['parent_comment'] = parent_comment
                else:
                    comment_data['parent_comment'] = ''
                    
            except:
                comment_data['parent_comment'] = ''
            
            # 추천수/비추천수 추출 (기존 성공한 로직)
            try:
                # 추천수
                vote_selectors = [
                    'span.vote span.voted_count',
                    'span.voted_count',
                    '.comment_likes',
                    '.likes',
                    '.vote_up'
                ]
                
                vote_count = 0
                for selector in vote_selectors:
                    try:
                        vote_element = await comment_element.query_selector(selector)
                        if vote_element:
                            vote_text = await vote_element.inner_text()
                            if vote_text and vote_text.strip().isdigit():
                                vote_count = int(vote_text.strip())
                                break
                    except:
                        continue
                
                comment_data['vote_count'] = vote_count
                
            except:
                comment_data['vote_count'] = 0
            
            try:
                # 비추천수
                blame_selectors = [
                    'span.vote span.blamed_count',
                    'span.blamed_count',
                    '.comment_dislikes',
                    '.dislikes',
                    '.vote_down'
                ]
                
                blame_count = 0
                for selector in blame_selectors:
                    try:
                        blame_element = await comment_element.query_selector(selector)
                        if blame_element:
                            blame_text = await blame_element.inner_text()
                            if blame_text and blame_text.strip().isdigit():
                                blame_count = int(blame_text.strip())
                                break
                    except:
                        continue
                
                comment_data['blame_count'] = blame_count
                
            except:
                comment_data['blame_count'] = 0
            
            return comment_data
            
        except Exception as e:
            logger.error(f"💥 개별 댓글 데이터 추출 실패: {e}")
            return None

    def parse_post_id_from_url(self, url: str) -> str:
        """URL에서 게시글 ID 추출"""
        try:
            # FM코리아 URL 패턴들
            # https://www.fmkorea.com/8449897319
            # https://www.fmkorea.com/index.php?mid=politics&document_srl=8450144891
            
            if '/index.php' in url:
                # URL 파라미터에서 document_srl 추출
                from urllib.parse import parse_qs, urlparse
                parsed = urlparse(url)
                params = parse_qs(parsed.query)
                if 'document_srl' in params:
                    return params['document_srl'][0]
            else:
                # 직접 URL에서 숫자 추출
                match = re.search(r'/(\d+)/?$', url)
                if match:
                    return match.group(1)
            
            # 최후 수단: URL에서 가장 긴 숫자 시퀀스 추출
            numbers = re.findall(r'\d+', url)
            if numbers:
                return max(numbers, key=len)
            
            return 'unknown'
            
        except Exception as e:
            logger.error(f"💥 게시글 ID 추출 실패: {e}")
            return 'unknown'


# 편의 함수
async def scrape_fmkorea_experiment(post_url: str) -> Dict:
    """
    FM코리아 실험용 스크래핑 편의 함수
    
    Args:
        post_url: 게시글 URL
    
    Returns:
        Dict: 실험용 스크래핑 결과
    """
    async with FMKoreaExperimentScraper() as scraper:
        return await scraper.scrape_post_experiment(post_url)


async def scrape_multiple_posts_experiment(post_urls: List[str]) -> List[Dict]:
    """
    여러 게시글 실험용 스크래핑 편의 함수
    
    Args:
        post_urls: 게시글 URL 리스트
    
    Returns:
        List[Dict]: 실험용 스크래핑 결과 리스트
    """
    results = []
    
    async with FMKoreaExperimentScraper() as scraper:
        for url in post_urls:
            try:
                result = await scraper.scrape_post_experiment(url)
                results.append(result)
                
                # 요청 간 대기 (서버 부하 방지)
                await asyncio.sleep(2)
                
            except Exception as e:
                logger.error(f"💥 {url} 스크래핑 실패: {e}")
                results.append({
                    'post_url': url,
                    'error': str(e),
                    'scraped_at': datetime.now().isoformat()
                })
    
    return results 
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
        게시글 본문 내용을 DOM 순서대로 추출 (개선된 버전)
        중복 이미지 문제 해결 및 정확한 콘텐츠 추출
        
        Returns:
            List[Dict]: 순서가 보존된 콘텐츠 리스트
        """
        try:
            content_list: List[Dict] = []
            order = 0
            
            # 브라우저가 초기화되지 않은 경우 처리
            if self.page is None:
                logger.error("💥 브라우저가 초기화되지 않았습니다.")
                return []
            
            # FM코리아 게시글 본문 컨테이너 찾기 (실제 HTML 구조 기반)
            article_selectors = [
                'article div.xe_content',  # 실제 구조
                'article .xe_content',
                'div.xe_content',
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
            
            # 개선된 콘텐츠 추출: 중복 방지 및 순서 보장
            order = await self.extract_elements_improved(article_element, content_list, order)
            
            logger.info(f"✅ 총 {len(content_list)}개 콘텐츠 요소 순서대로 추출 완료")
            return content_list
            
        except Exception as e:
            logger.error(f"💥 순서대로 콘텐츠 추출 실패: {e}")
            return []

    async def extract_elements_improved(self, parent_element, content_list: List[Dict], order_start: int) -> int:
        """
        개선된 요소 추출 (중복 이미지 문제 해결)
        
        Args:
            parent_element: 부모 요소
            content_list: 콘텐츠 리스트 (참조로 수정됨)
            order_start: 시작 순서 번호
            
        Returns:
            int: 다음 순서 번호
        """
        current_order = order_start
        processed_images = set()  # 처리된 이미지 src 추적
        
        try:
            # 직접 자식 요소들을 순서대로 처리
            child_elements = await parent_element.query_selector_all('> *')
            
            for element in child_elements:
                try:
                    tag_name = await element.evaluate('el => el.tagName.toLowerCase()')
                    
                    # 1. 링크 내부 이미지 처리 (a.highslide > img)
                    if tag_name == 'a':
                        href = await element.get_attribute('href')
                        class_name = await element.get_attribute('class') or ''
                        
                        # highslide 클래스가 있는 링크만 처리 (실제 HTML 구조)
                        if 'highslide' in class_name:
                            img_elements = await element.query_selector_all('img')
                            for img in img_elements:
                                src = await img.get_attribute('src')
                                data_original = await img.get_attribute('data-original')
                                image_src = data_original or src
                                
                                if image_src and image_src not in processed_images:
                                    img_data = await self.extract_image_data(element, img, current_order)
                                    if img_data:
                                        content_list.append(img_data)
                                        processed_images.add(image_src)
                                        current_order += 1
                    
                    # 2. 독립적인 이미지 처리 (이미 링크로 처리되지 않은 것만)
                    elif tag_name == 'img':
                        src = await element.get_attribute('src')
                        data_original = await element.get_attribute('data-original')
                        image_src = data_original or src
                        
                        if image_src and image_src not in processed_images:
                            img_data = await self.extract_image_data(None, element, current_order)
                            if img_data:
                                content_list.append(img_data)
                                processed_images.add(image_src)
                                current_order += 1
                    
                    # 3. 동영상 처리
                    elif tag_name == 'video':
                        video_data = await self.extract_video_data(element, current_order)
                        if video_data:
                            content_list.append(video_data)
                            current_order += 1
                    
                    # 4. 텍스트 요소 처리 (미디어가 없는 순수 텍스트만)
                    elif tag_name in ['p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br']:
                        # br 태그는 건너뛰기
                        if tag_name == 'br':
                            continue
                            
                        # 하위에 이미지나 비디오가 있는지 확인
                        has_media = await element.query_selector('img, video, a.highslide')
                        if not has_media:
                            text_content = await element.evaluate('el => el.textContent?.trim()')
                            if text_content and len(text_content.strip()) > 0:
                                # 비디오 fallback 텍스트 제외
                                if "Video 태그를 지원하지 않는 브라우저입니다" not in text_content:
                                    text_data = await self.extract_text_data(element, current_order)
                                    if text_data:
                                        content_list.append(text_data)
                                        current_order += 1
                        else:
                            # 미디어가 있는 요소는 재귀적으로 처리
                            current_order = await self.extract_elements_improved(element, content_list, current_order)
                
                except Exception as e:
                    logger.warning(f"⚠️ 요소 처리 실패: {e}")
                    continue
            
            return current_order
            
        except Exception as e:
            logger.error(f"💥 개선된 요소 추출 실패: {e}")
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
        """게시글 메타데이터 추출 (실제 HTML 구조 기반)"""
        try:
            metadata = {}
            
            # 브라우저가 초기화되지 않은 경우 처리
            if self.page is None:
                logger.error("💥 브라우저가 초기화되지 않았습니다.")
                return {}
            
            # 제목 추출 (실제 HTML 구조: h1.np_18px span.np_18px_span)
            title_selectors = [
                'h1.np_18px span.np_18px_span',  # 실제 구조
                'h1.np_18px',
                'h1 span',
                'h1',
                '.document_title h1',
                'article h1'
            ]
            
            for selector in title_selectors:
                try:
                    title_element = await self.page.query_selector(selector)
                    if title_element:
                        title_text = await title_element.inner_text()
                        if title_text and title_text.strip():
                            metadata['title'] = title_text.strip()
                            logger.info(f"✅ 제목 추출 성공: {title_text.strip()}")
                            break
                except:
                    continue
            
            # 작성자 추출 (실제 HTML 구조: .member_plate)
            author_selectors = [
                '.btm_area .side .member_plate',  # 실제 구조
                '.member_plate',
                '.side .member_plate'
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
            
            # 작성 시간 추출 (실제 HTML 구조: .top_area .date.m_no)
            date_selectors = [
                '.top_area .date.m_no',  # 실제 구조
                '.date.m_no',
                '.date',
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
            
            # 통계 정보 추출 (실제 HTML 구조: .btm_area .side.fr span)
            stats_selectors = [
                '.btm_area .side.fr span',  # 실제 구조
                '.side.fr span',
                '.btm_area span'
            ]
            
            view_count = 0
            like_count = 0
            dislike_count = 0
            comment_count = 0
            
            for selector in stats_selectors:
                try:
                    stat_elements = await self.page.query_selector_all(selector)
                    for element in stat_elements:
                        text = await element.inner_text()
                        if '조회 수' in text:
                            numbers = re.findall(r'\d+', text)
                            if numbers:
                                view_count = int(numbers[-1])
                        elif '추천 수' in text:
                            numbers = re.findall(r'\d+', text)
                            if numbers:
                                like_count = int(numbers[-1])
                        elif '비추천' in text:
                            numbers = re.findall(r'\d+', text)
                            if numbers:
                                dislike_count = int(numbers[-1])
                        elif '댓글' in text:
                            numbers = re.findall(r'\d+', text)
                            if numbers:
                                comment_count = int(numbers[-1])
                    break
                except:
                    continue
            
            metadata.update({
                'view_count': view_count,
                'like_count': like_count,
                'dislike_count': dislike_count,
                'comment_count': comment_count
            })
            
            logger.info(f"✅ 메타데이터 추출 완료: 조회수 {view_count}, 추천 {like_count}, 댓글 {comment_count}")
            return metadata
            
        except Exception as e:
            logger.error(f"💥 메타데이터 추출 실패: {e}")
            return {}

    async def extract_comments_data(self) -> List[Dict]:
        """댓글 데이터 추출 (실제 HTML 구조 기반)"""
        try:
            comments = []
            
            # 브라우저가 초기화되지 않은 경우 처리
            if self.page is None:
                logger.error("💥 브라우저가 초기화되지 않았습니다.")
                return []
            
            # 댓글 컨테이너 찾기 (실제 HTML 구조)
            comment_selectors = [
                'ul.fdb_lst_ul li.fdb_itm',  # 실제 구조
                '.fdb_lst_ul .fdb_itm',
                '.fdb_itm',
                'li[id^="comment_"]'
            ]
            
            comment_elements = []
            for selector in comment_selectors:
                try:
                    elements = await self.page.query_selector_all(selector)
                    if elements:
                        comment_elements = elements
                        logger.info(f"✅ 댓글 요소 발견: {len(elements)}개 ({selector})")
                        break
                except:
                    continue
            
            if not comment_elements:
                logger.warning("⚠️ 댓글을 찾을 수 없습니다.")
                return []
            
            # 각 댓글 요소 처리
            for i, comment_element in enumerate(comment_elements):
                try:
                    comment_data = await self.extract_single_comment_improved(comment_element, i)
                    if comment_data:
                        comments.append(comment_data)
                except Exception as e:
                    logger.warning(f"⚠️ 댓글 {i+1} 추출 실패: {e}")
                    continue
            
            logger.info(f"✅ 총 {len(comments)}개 댓글 추출 완료")
            return comments
            
        except Exception as e:
            logger.error(f"💥 댓글 데이터 추출 실패: {e}")
            return []

    async def extract_single_comment_improved(self, comment_element, index: int) -> Optional[Dict]:
        """개별 댓글 데이터 추출 (실제 HTML 구조 기반)"""
        try:
            # 댓글 ID 추출
            comment_id = await comment_element.get_attribute('id')
            if not comment_id:
                comment_id = f'comment_{index}'
            
            # 댓글 계층 구조 파악 (margin-left 스타일 기반)
            style = await comment_element.get_attribute('style') or ''
            depth = 0
            is_reply = False
            
            if 'margin-left' in style:
                # margin-left: 2%, 4%, 6% 등에서 depth 계산
                import re
                margin_match = re.search(r'margin-left:\s*(\d+)%', style)
                if margin_match:
                    margin_percent = int(margin_match.group(1))
                    depth = margin_percent // 2  # 2% = depth 1, 4% = depth 2, 6% = depth 3
                    is_reply = depth > 0
            
            # 작성자 추출 (실제 구조: .member_plate)
            author = '익명'
            try:
                author_element = await comment_element.query_selector('.member_plate')
                if author_element:
                    author_text = await author_element.inner_text()
                    if author_text and author_text.strip():
                        author = author_text.strip()
            except:
                pass
            
            # 댓글 내용 추출 (실제 구조: .comment-content .xe_content)
            content = ''
            try:
                content_selectors = [
                    '.comment-content .xe_content',
                    '.xe_content',
                    '.comment-content',
                    '.fdb_itm_content'
                ]
                
                for selector in content_selectors:
                    content_element = await comment_element.query_selector(selector)
                    if content_element:
                        content_text = await content_element.inner_text()
                        if content_text and content_text.strip():
                            content = content_text.strip()
                            break
            except:
                pass
            
            # 작성 시간 추출 (실제 구조: .meta .date)
            date = ''
            try:
                date_element = await comment_element.query_selector('.meta .date, .date')
                if date_element:
                    date_text = await date_element.inner_text()
                    if date_text and date_text.strip():
                        date = date_text.strip()
            except:
                pass
            
            # 추천/비추천 수 추출 (실제 구조: .vote .voted_count, .blamed_count)
            like_count = 0
            dislike_count = 0
            
            try:
                # 추천수
                voted_element = await comment_element.query_selector('.voted_count')
                if voted_element:
                    voted_text = await voted_element.inner_text()
                    if voted_text and voted_text.strip().isdigit():
                        like_count = int(voted_text.strip())
                
                # 비추천수
                blamed_element = await comment_element.query_selector('.blamed_count')
                if blamed_element:
                    blamed_text = await blamed_element.inner_text()
                    if blamed_text and blamed_text.strip().isdigit():
                        dislike_count = int(blamed_text.strip())
            except:
                pass
            
            # 부모 댓글 정보 추출 (대댓글인 경우)
            parent_comment = ''
            if is_reply:
                try:
                    parent_link = await comment_element.query_selector('.findParent')
                    if parent_link:
                        parent_text = await parent_link.inner_text()
                        if parent_text and parent_text.strip():
                            parent_comment = parent_text.strip()
                except:
                    pass
            
            # 댓글 데이터 구성
            comment_data = {
                'id': comment_id,
                'author': author,
                'content': content,
                'date': date,
                'like_count': like_count,
                'dislike_count': dislike_count,
                'is_reply': is_reply,
                'depth': depth,
                'parent_id': parent_comment,
                'is_best': False,  # FM코리아는 베스트 댓글 시스템이 다름
                'is_author': False  # 작성자 댓글 구분 로직 추가 가능
            }
            
            # 이미지나 비디오가 있는 댓글 처리
            try:
                img_element = await comment_element.query_selector('img')
                if img_element:
                    img_src = await img_element.get_attribute('src')
                    if img_src:
                        comment_data['image_url'] = img_src
                        
                        # 이미지 링크 확인
                        img_link = await comment_element.query_selector('a')
                        if img_link:
                            href = await img_link.get_attribute('href')
                            if href:
                                comment_data['image_link'] = href
                
                video_element = await comment_element.query_selector('video')
                if video_element:
                    video_src = await video_element.get_attribute('src')
                    if video_src:
                        comment_data['video_url'] = video_src
                        comment_data['video_autoplay'] = await video_element.get_attribute('autoplay') is not None
                        comment_data['video_loop'] = await video_element.get_attribute('loop') is not None
                        comment_data['video_muted'] = await video_element.get_attribute('muted') is not None
            except:
                pass
            
            return comment_data
            
        except Exception as e:
            logger.warning(f"⚠️ 개별 댓글 추출 실패: {e}")
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
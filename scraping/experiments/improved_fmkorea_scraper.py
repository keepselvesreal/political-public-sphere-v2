#!/usr/bin/env python3
"""
개선된 FM코리아 스크래퍼 모듈

목차:
1. 모듈 임포트 및 설정 (1-30)
2. ImprovedFMKoreaScraper 클래스 (31-120)
3. 브라우저 설정 및 관리 (121-200)
4. 게시글 목록 스크래핑 (201-300)
5. 개별 게시글 스크래핑 (301-450)
6. 데이터 추출 함수들 (451-600)
7. 유틸리티 함수들 (601-700)
8. 메인 실행 함수 (701-800)

작성자: AI Assistant
작성일: 2025년 6월 5일 10:52 (KST)
목적: 제공된 HTML 구조와 Stealth 설정을 반영한 개선된 스크래퍼
"""

import asyncio
import json
import re
import time
from datetime import datetime
from typing import List, Dict, Optional, Any
from urllib.parse import urljoin, urlparse
import pytz

from playwright.async_api import async_playwright, Page, Browser
from playwright_stealth import stealth_async
from loguru import logger

class ImprovedFMKoreaScraper:
    """
    개선된 FM코리아 스크래퍼 클래스
    
    주요 개선사항:
    - playwright-stealth 적용
    - 제공된 HTML 구조 기반 셀렉터 사용
    - 헤드리스 모드 해제로 봇 차단 우회
    - 타임아웃 증가 및 안정성 강화
    """
    
    def __init__(self):
        self.base_url = 'https://www.fmkorea.com'
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.playwright = None
        
        # 한국 시간대 설정
        self.kst = pytz.timezone('Asia/Seoul')
        
        # 개선된 설정 (성공한 테스트 스크래퍼 기반)
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
        
        # 타임아웃 설정 (증가)
        self.wait_timeout = 30000  # 30초
        self.navigation_timeout = 60000  # 60초
    
    async def __aenter__(self):
        """비동기 컨텍스트 매니저 진입"""
        await self.setup_browser()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """비동기 컨텍스트 매니저 종료"""
        await self.close_browser()
    
    async def setup_browser(self):
        """브라우저 설정 및 초기화 (Stealth 모드 적용)"""
        try:
            self.playwright = await async_playwright().start()
            
            # 브라우저 옵션 설정 (헤드리스 모드 해제)
            self.browser = await self.playwright.chromium.launch(
                headless=False,  # 헤드리스 모드 해제하여 봇 차단 우회
                args=[
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled',
                    '--window-size=1920,1080',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            )
            
            # 새 페이지 생성
            self.page = await self.browser.new_page()
            
            # Stealth 모드 적용 (중요!)
            await stealth_async(self.page)
            
            # 추가 설정
            await self.page.set_viewport_size({"width": 1920, "height": 1080})
            await self.page.set_extra_http_headers({
                'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            })
            
            logger.info("✅ 개선된 브라우저 설정 완료 (Stealth 모드 적용)")
            
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
                await self.browser.close()
                self.browser = None
                
            if self.playwright:
                await self.playwright.stop()
                self.playwright = None
                
            logger.info("✅ 브라우저 종료 완료")
            
        except Exception as e:
            logger.error(f"⚠️ 브라우저 종료 중 오류: {e}")
    
    async def scrape_politics_page_list(self, limit: int = 20) -> List[Dict]:
        """
        FM코리아 정치 게시판 목록 스크래핑 (제공된 HTML 구조 기반)
        
        Args:
            limit: 스크래핑할 게시글 수
        
        Returns:
            List[Dict]: 게시글 목록
        """
        try:
            url = 'https://www.fmkorea.com/politics'
            logger.info(f"🔍 정치 게시판 목록 스크래핑 시작: {url}")
            
            # 페이지 이동 (타임아웃 증가)
            await self.page.goto(url, wait_until="networkidle", timeout=self.navigation_timeout)
            
            # 페이지 로드 확인
            page_title = await self.page.title()
            logger.info(f"📄 페이지 제목: {page_title}")
            
            # 게시글 목록 테이블 확인 (제공된 HTML 구조)
            table_selector = 'table.bd_lst.bd_tb_lst.bd_tb'
            table_element = await self.page.query_selector(table_selector)
            
            if not table_element:
                logger.error("❌ 게시글 목록 테이블을 찾을 수 없습니다.")
                return []
            
            logger.info("✅ 게시글 목록 테이블 발견")
            
            # 게시글 행들 추출 (공지사항 제외)
            post_rows = await self.page.query_selector_all('table.bd_lst tbody tr:not(.notice)')
            
            if not post_rows:
                logger.error("❌ 게시글 행을 찾을 수 없습니다.")
                return []
            
            logger.info(f"✅ 게시글 행 발견: {len(post_rows)}개")
            
            # 게시글 정보 추출
            posts = []
            for i, row in enumerate(post_rows[:limit]):
                try:
                    post_info = await self.extract_post_list_info(row)
                    if post_info:
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
        """게시글 목록 정보 추출 (제공된 HTML 구조 기반)"""
        try:
            post_info = {}
            
            # 카테고리 추출
            try:
                cate_element = await row_element.query_selector('td.cate a')
                if cate_element:
                    category = await cate_element.inner_text()
                    post_info['category'] = category.strip()
                else:
                    post_info['category'] = ''
            except:
                post_info['category'] = ''
            
            # 제목 및 URL 추출
            try:
                title_element = await row_element.query_selector('td.title a')
                if title_element:
                    title = await title_element.inner_text()
                    href = await title_element.get_attribute('href')
                    
                    post_info['title'] = title.strip()
                    
                    # 절대 URL로 변환
                    if href:
                        if href.startswith('/'):
                            post_info['url'] = urljoin(self.base_url, href)
                        else:
                            post_info['url'] = href
                        
                        # 게시글 ID 추출
                        post_info['post_id'] = self.parse_post_id_from_url(post_info['url'])
                else:
                    return None
            except:
                return None
            
            # 댓글 수 추출 (제목 옆의 replyNum)
            try:
                reply_element = await row_element.query_selector('td.title a.replyNum')
                if reply_element:
                    reply_text = await reply_element.inner_text()
                    post_info['comment_count'] = int(reply_text) if reply_text.isdigit() else 0
                else:
                    post_info['comment_count'] = 0
            except:
                post_info['comment_count'] = 0
            
            # 작성자 추출
            try:
                author_element = await row_element.query_selector('td.author a.member_plate')
                if author_element:
                    author = await author_element.inner_text()
                    post_info['author'] = author.strip()
                else:
                    post_info['author'] = ''
            except:
                post_info['author'] = ''
            
            # 작성시간 추출
            try:
                time_element = await row_element.query_selector('td.time')
                if time_element:
                    time_text = await time_element.inner_text()
                    post_info['date'] = time_text.strip()
                else:
                    post_info['date'] = ''
            except:
                post_info['date'] = ''
            
            # 조회수 추출 (첫 번째 td.m_no)
            try:
                view_elements = await row_element.query_selector_all('td.m_no')
                if len(view_elements) >= 1:
                    view_text = await view_elements[0].inner_text()
                    post_info['view_count'] = int(view_text.strip()) if view_text.strip().isdigit() else 0
                else:
                    post_info['view_count'] = 0
            except:
                post_info['view_count'] = 0
            
            # 추천수 추출 (마지막 td.m_no)
            try:
                vote_elements = await row_element.query_selector_all('td.m_no')
                if len(vote_elements) >= 2:
                    vote_text = await vote_elements[-1].inner_text()
                    vote_text = vote_text.strip()
                    
                    # 비추천수 처리 (음수)
                    if vote_text.startswith('-'):
                        post_info['up_count'] = 0
                        post_info['down_count'] = abs(int(vote_text)) if vote_text[1:].isdigit() else 0
                    elif vote_text.isdigit():
                        post_info['up_count'] = int(vote_text)
                        post_info['down_count'] = 0
                    else:
                        post_info['up_count'] = 0
                        post_info['down_count'] = 0
                else:
                    post_info['up_count'] = 0
                    post_info['down_count'] = 0
            except:
                post_info['up_count'] = 0
                post_info['down_count'] = 0
            
            return post_info
            
        except Exception as e:
            logger.warning(f"⚠️ 게시글 정보 추출 실패: {e}")
            return None
    
    async def scrape_post_detail(self, post_url: str) -> Dict:
        """
        개별 게시글 상세 스크래핑 (실험용 스크래퍼 기반)
        
        Args:
            post_url: 게시글 URL
        
        Returns:
            Dict: 게시글 상세 데이터
        """
        try:
            logger.info(f"🧪 게시글 상세 스크래핑 시작: {post_url}")
            
            # 페이지 이동
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
            
            post_data = {
                'post_id': post_id,
                'post_url': post_url,
                'scraped_at': datetime.now(self.kst).isoformat(),
                'metadata': metadata,
                'content': content_list,
                'comments': comments,
                'scraper_version': 'improved_v1',
                'page_title': page_title
            }
            
            logger.info(f"✅ 게시글 상세 스크래핑 완료: {len(content_list)}개 콘텐츠, {len(comments)}개 댓글")
            return post_data
            
        except Exception as e:
            logger.error(f"💥 게시글 상세 스크래핑 실패: {e}")
            return {
                'post_id': self.parse_post_id_from_url(post_url),
                'post_url': post_url,
                'scraped_at': datetime.now(self.kst).isoformat(),
                'error': str(e),
                'scraper_version': 'improved_v1'
            }
    
    async def extract_content_in_order(self) -> List[Dict]:
        """게시글 본문 내용을 DOM 순서대로 추출"""
        try:
            content_list: List[Dict] = []
            order = 1
            
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
            
            # 모든 하위 요소를 순회하여 콘텐츠 추출
            child_elements = await article_element.query_selector_all('*')
            processed_elements = set()
            
            for element in child_elements:
                try:
                    # 이미 처리된 요소는 건너뛰기
                    element_id = id(element)
                    if element_id in processed_elements:
                        continue
                    processed_elements.add(element_id)
                    
                    tag_name = await element.evaluate('el => el.tagName.toLowerCase()')
                    
                    # 이미지 처리
                    if tag_name == 'img':
                        img_data = await self.extract_image_data(element, order)
                        if img_data:
                            content_list.append(img_data)
                            order += 1
                    
                    # 동영상 처리
                    elif tag_name == 'video':
                        video_data = await self.extract_video_data(element, order)
                        if video_data:
                            content_list.append(video_data)
                            order += 1
                    
                    # 텍스트 요소 처리
                    elif tag_name in ['p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                        # 하위에 img나 video가 없는 경우에만 텍스트로 처리
                        has_media = await element.query_selector('img, video')
                        if not has_media:
                            text_content = await element.evaluate('el => el.textContent?.trim()')
                            if text_content and len(text_content.strip()) > 0:
                                text_data = await self.extract_text_data(element, order)
                                if text_data:
                                    content_list.append(text_data)
                                    order += 1
                
                except Exception as e:
                    logger.warning(f"⚠️ 요소 처리 실패: {e}")
                    continue
            
            logger.info(f"✅ 총 {len(content_list)}개 콘텐츠 요소 순서대로 추출 완료")
            return content_list
            
        except Exception as e:
            logger.error(f"💥 순서대로 콘텐츠 추출 실패: {e}")
            return []
    
    async def extract_image_data(self, img_element, order: int) -> Optional[Dict]:
        """이미지 데이터 추출"""
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
            
            img_data = {
                'type': 'image',
                'order': order,
                'data': {
                    'src': src,
                    'width': await img_element.get_attribute('width'),
                    'height': await img_element.get_attribute('height'),
                    'alt': await img_element.get_attribute('alt') or '',
                    'class': await img_element.get_attribute('class') or ''
                }
            }
            
            return img_data
            
        except Exception as e:
            logger.warning(f"⚠️ 이미지 데이터 추출 실패: {e}")
            return None
    
    async def extract_video_data(self, video_element, order: int) -> Optional[Dict]:
        """동영상 데이터 추출"""
        try:
            src = await video_element.get_attribute('src')
            if not src:
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
            
            video_data = {
                'type': 'video',
                'order': order,
                'data': {
                    'src': src,
                    'poster': await video_element.get_attribute('poster') or '',
                    'width': await video_element.get_attribute('width'),
                    'height': await video_element.get_attribute('height'),
                    'autoplay': await video_element.get_attribute('autoplay') is not None,
                    'muted': await video_element.get_attribute('muted') is not None,
                    'controls': await video_element.get_attribute('controls') is not None
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
                    'class': await text_element.get_attribute('class') or ''
                }
            }
            
            return text_data
            
        except Exception as e:
            logger.warning(f"⚠️ 텍스트 데이터 추출 실패: {e}")
            return None
    
    async def extract_post_metadata(self) -> Dict:
        """게시글 메타데이터 추출"""
        try:
            metadata = {}
            
            # 제목 추출
            title_selectors = [
                'h1.np_18px span.np_18px_span',
                'h1.np_18px',
                'h1.title',
                'h1'
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
            
            # 작성자 추출
            author_selectors = [
                '.btm_area .side .member_plate',
                '.member_plate',
                '.meta .member_plate'
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
            
            # 작성 시간 추출
            date_selectors = [
                '.top_area .date.m_no',
                '.rd_hd .date.m_no',
                '.meta .date'
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
            
            # 기본값 설정
            metadata.setdefault('title', '')
            metadata.setdefault('author', '')
            metadata.setdefault('date', '')
            metadata.setdefault('view_count', 0)
            metadata.setdefault('up_count', 0)
            metadata.setdefault('down_count', 0)
            metadata.setdefault('comment_count', 0)
            metadata.setdefault('category', '')
            
            return metadata
            
        except Exception as e:
            logger.error(f"💥 메타데이터 추출 실패: {e}")
            return {}
    
    async def extract_comments_data(self) -> List[Dict]:
        """댓글 데이터 추출"""
        try:
            comments = []
            
            # FM코리아 댓글 구조에 맞는 셀렉터들
            comment_selectors = [
                'ul.fdb_lst_ul li',
                'div.fdb_lst_ul li',
                'ul.comment_list li'
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
                            logger.info(f"✅ {len(valid_elements)}개 댓글 요소 발견")
                            break
                except Exception as e:
                    continue
            
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
        """개별 댓글 데이터 추출"""
        try:
            comment_data = {}
            
            # 댓글 ID
            comment_data['comment_id'] = await comment_element.get_attribute('id') or ''
            
            # 작성자
            author_selectors = [
                'div.side a.member_plate', 
                'div.meta a.member_plate', 
                '.member_plate'
            ]
            
            for selector in author_selectors:
                try:
                    author_element = await comment_element.query_selector(selector)
                    if author_element:
                        author_text = await author_element.inner_text()
                        if author_text and author_text.strip():
                            comment_data['author'] = author_text.strip()
                            break
                except:
                    continue
            
            comment_data.setdefault('author', '익명')
            
            # 댓글 내용
            content_selectors = [
                'div.comment-content div',
                'div.comment-content',
                '.comment_content'
            ]
            
            for selector in content_selectors:
                try:
                    content_element = await comment_element.query_selector(selector)
                    if content_element:
                        content_text = await content_element.inner_text()
                        if content_text and content_text.strip():
                            comment_data['content'] = content_text.strip()
                            break
                except:
                    continue
            
            comment_data.setdefault('content', '')
            
            # 작성 시간
            date_selectors = [
                'div.meta span.date',
                'span.date.m_no',
                '.date'
            ]
            
            for selector in date_selectors:
                try:
                    date_element = await comment_element.query_selector(selector)
                    if date_element:
                        date_text = await date_element.inner_text()
                        if date_text and date_text.strip():
                            comment_data['date'] = date_text.strip()
                            break
                except:
                    continue
            
            comment_data.setdefault('date', '')
            
            # 댓글 레벨 추출 (들여쓰기 기준)
            try:
                style_attr = await comment_element.get_attribute('style')
                class_attr = await comment_element.get_attribute('class')
                
                level = 0
                
                # margin-left로 레벨 계산
                if style_attr and 'margin-left:' in style_attr:
                    margin_match = re.search(r'margin-left:(\d+)%', style_attr)
                    if margin_match:
                        margin_left = int(margin_match.group(1))
                        level = margin_left // 2  # 2%당 1레벨
                
                # 클래스명으로도 확인
                if class_attr and ('re' in class_attr or 'reply' in class_attr):
                    level = max(level, 1)
                
                comment_data['level'] = level
                comment_data['is_reply'] = level > 0
                
            except:
                comment_data['level'] = 0
                comment_data['is_reply'] = False
            
            # 부모 댓글 정보
            comment_data['parent_comment_id'] = ''
            if comment_data['is_reply']:
                try:
                    parent_element = await comment_element.query_selector('a.findParent')
                    if parent_element:
                        onclick_attr = await parent_element.get_attribute('onclick')
                        if onclick_attr:
                            # onclick에서 부모 댓글 ID 추출
                            match = re.search(r'comment_(\d+)', onclick_attr)
                            if match:
                                comment_data['parent_comment_id'] = f"comment_{match.group(1)}"
                except:
                    pass
            
            # 추천/비추천수
            comment_data['up_count'] = 0
            comment_data['down_count'] = 0
            
            return comment_data
            
        except Exception as e:
            logger.error(f"💥 개별 댓글 데이터 추출 실패: {e}")
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
            
            # 최후 수단: URL에서 가장 긴 숫자 시퀀스 추출
            numbers = re.findall(r'\d+', url)
            if numbers:
                return max(numbers, key=len)
            
            return 'unknown'
            
        except Exception as e:
            logger.error(f"💥 게시글 ID 추출 실패: {e}")
            return 'unknown'

# 편의 함수들
async def scrape_fmkorea_politics_improved(limit: int = 10) -> List[Dict]:
    """
    개선된 FM코리아 정치 게시판 스크래핑 편의 함수
    
    Args:
        limit: 스크래핑할 게시글 수
    
    Returns:
        List[Dict]: 스크래핑 결과
    """
    async with ImprovedFMKoreaScraper() as scraper:
        # 게시글 목록 스크래핑
        posts = await scraper.scrape_politics_page_list(limit)
        
        # 각 게시글 상세 정보 스크래핑
        detailed_posts = []
        for i, post in enumerate(posts[:3]):  # 처음 3개만 상세 스크래핑
            try:
                logger.info(f"📖 상세 스크래핑 {i+1}/{min(3, len(posts))}: {post['title'][:30]}...")
                detail = await scraper.scrape_post_detail(post['url'])
                detailed_posts.append(detail)
                
                # 요청 간 대기
                await asyncio.sleep(2)
                
            except Exception as e:
                logger.error(f"💥 상세 스크래핑 실패: {e}")
                continue
        
        return detailed_posts

async def test_improved_scraper():
    """개선된 스크래퍼 테스트 함수"""
    logger.info("🚀 개선된 FM코리아 스크래퍼 테스트 시작")
    logger.info(f"⏰ 시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        results = await scrape_fmkorea_politics_improved(limit=5)
        
        logger.info("📊 테스트 결과 요약")
        logger.info("=" * 50)
        logger.info(f"✅ 성공적으로 스크래핑된 게시글: {len(results)}개")
        
        for i, result in enumerate(results):
            if 'error' not in result:
                logger.info(f"📝 게시글 {i+1}: {result.get('metadata', {}).get('title', 'N/A')[:50]}...")
                logger.info(f"   - 콘텐츠: {len(result.get('content', []))}개")
                logger.info(f"   - 댓글: {len(result.get('comments', []))}개")
            else:
                logger.error(f"❌ 게시글 {i+1}: 오류 발생 - {result.get('error', 'Unknown')}")
        
        # 결과를 JSON 파일로 저장
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"improved_fmkorea_test_{timestamp}.json"
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        
        logger.info(f"💾 결과 저장: {filename}")
        
        return results
        
    except Exception as e:
        logger.error(f"💥 테스트 실패: {e}")
        return []
    
    finally:
        logger.info(f"⏰ 완료 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    asyncio.run(test_improved_scraper()) 
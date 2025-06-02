"""
에펨코리아 스크래퍼 모듈

주요 기능:
- FMKoreaScraper: 메인 스크래퍼 클래스 (line 30-80)
- extract_post_list: 게시글 목록 추출 (line 82-150)
- filter_admin_posts: 관리자 게시글 필터링 (line 152-180)
- select_top_posts: 상위 게시글 선별 (line 182-220)
- scrape_post_detail: 개별 게시글 스크래핑 (line 222-280)
- extract_comments: 댓글 추출 (line 282-350)
- extract_content_in_order: 본문 순서 보존 추출 (line 352-420)

작성자: AI Assistant
작성일: 2025-06-02 16:45 KST
목적: TDD 기반 에펨코리아 스크래퍼 구현
"""

import asyncio
import re
import json
from datetime import datetime
from typing import List, Dict, Optional, Any
from urllib.parse import urljoin, urlparse
import pytz
from bs4 import BeautifulSoup

from playwright.async_api import async_playwright, Page, Browser
from playwright_stealth import stealth_async
from loguru import logger


class FMKoreaScraper:
    """
    에펨코리아 스크래퍼 클래스
    
    TDD 방식으로 개발된 스크래퍼로 다음 기능을 제공합니다:
    1. 게시글 목록 추출 (공지글 제외)
    2. 추천수, 댓글수, 조회수 상위 3개씩 선별
    3. 개별 게시글 상세 스크래핑
    4. 댓글 계층구조 보존
    5. 본문 내용 순서 보존
    """
    
    def __init__(self):
        self.base_url = 'https://www.fmkorea.com'
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
                headless=False,  # 봇 차단 우회를 위해 헤드리스 모드 해제
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
                contexts = self.browser.contexts
                for context in contexts:
                    try:
                        await context.close()
                    except:
                        pass
                
                await self.browser.close()
                self.browser = None
                
            await asyncio.sleep(0.5)
            logger.info("✅ 브라우저 종료 완료")
            
        except Exception as e:
            logger.error(f"⚠️ 브라우저 종료 중 오류: {e}")
            try:
                if self.browser:
                    await self.browser.close()
            except:
                pass
    
    def extract_post_list(self, html_content: str) -> List[Dict]:
        """
        게시글 목록 추출
        
        Args:
            html_content: 게시글 목록 HTML
            
        Returns:
            List[Dict]: 게시글 정보 리스트
        """
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            posts = []
            
            # tbody 내의 tr 요소들을 찾음
            rows = soup.find_all('tr')
            
            for row in rows:
                # 공지글은 건너뛰기 (notice 클래스가 있는 경우)
                if 'notice' in row.get('class', []):
                    continue
                
                # 게시글 정보 추출
                post_data = self._extract_post_from_row(row)
                if post_data:
                    posts.append(post_data)
            
            logger.info(f"📋 게시글 목록 추출 완료: {len(posts)}개")
            return posts
            
        except Exception as e:
            logger.error(f"💥 게시글 목록 추출 실패: {e}")
            return []
    
    def _extract_post_from_row(self, row) -> Optional[Dict]:
        """
        개별 게시글 행에서 정보 추출
        
        Args:
            row: BeautifulSoup 행 요소
            
        Returns:
            Optional[Dict]: 게시글 정보 또는 None
        """
        try:
            # 제목과 URL 추출
            title_cell = row.find('td', class_='title')
            if not title_cell:
                return None
            
            title_link = title_cell.find('a')
            if not title_link:
                return None
            
            title = title_link.get_text(strip=True)
            url = title_link.get('href', '')
            
            # 작성자 추출
            author_cell = row.find('td', class_='author')
            author = ''
            is_admin = False
            
            if author_cell:
                author_link = author_cell.find('a')
                if author_link:
                    author = author_link.get_text(strip=True)
                    # 관리자 여부 확인 (admin.png 이미지가 있는 경우)
                    admin_img = author_link.find('img', src=lambda x: x and 'admin.png' in x)
                    is_admin = admin_img is not None
            
            # 조회수 추출
            view_count = 0
            view_cells = row.find_all('td', class_='m_no')
            if len(view_cells) >= 1:
                view_text = view_cells[0].get_text(strip=True)
                try:
                    view_count = int(view_text) if view_text.isdigit() else 0
                except:
                    view_count = 0
            
            # 추천수 추출 (두 번째 m_no 셀)
            like_count = 0
            if len(view_cells) >= 2:
                like_text = view_cells[1].get_text(strip=True)
                try:
                    like_count = int(like_text) if like_text.isdigit() else 0
                except:
                    like_count = 0
            
            # 댓글수 추출
            comment_count = 0
            comment_link = title_cell.find('a', class_='replyNum')
            if comment_link:
                comment_text = comment_link.get_text(strip=True)
                try:
                    comment_count = int(comment_text) if comment_text.isdigit() else 0
                except:
                    comment_count = 0
            
            # 카테고리 추출
            category_cell = row.find('td', class_='cate')
            category = ''
            if category_cell:
                category_link = category_cell.find('a')
                if category_link:
                    category = category_link.get_text(strip=True)
            
            return {
                'title': title,
                'url': url,
                'author': author,
                'is_admin': is_admin,
                'view_count': view_count,
                'like_count': like_count,
                'comment_count': comment_count,
                'category': category
            }
            
        except Exception as e:
            logger.error(f"💥 게시글 행 파싱 실패: {e}")
            return None
    
    def filter_admin_posts(self, posts: List[Dict]) -> List[Dict]:
        """
        관리자 게시글 필터링 (공지글 등 제외)
        
        Args:
            posts: 게시글 리스트
            
        Returns:
            List[Dict]: 필터링된 게시글 리스트
        """
        try:
            # 관리자가 작성한 게시글과 공지 카테고리 제외
            filtered_posts = [
                post for post in posts 
                if not post.get('is_admin', False) and post.get('category', '') != '공지'
            ]
            
            logger.info(f"🔍 관리자 게시글 필터링: {len(posts)}개 → {len(filtered_posts)}개")
            return filtered_posts
            
        except Exception as e:
            logger.error(f"💥 관리자 게시글 필터링 실패: {e}")
            return posts
    
    def select_top_posts(self, posts: List[Dict]) -> Dict[str, List[Dict]]:
        """
        상위 게시글 선별 (추천수, 댓글수, 조회수 각각 상위 3개)
        
        Args:
            posts: 게시글 리스트
            
        Returns:
            Dict[str, List[Dict]]: 메트릭별 상위 게시글
        """
        try:
            # 각 메트릭별로 정렬하여 상위 3개 선별
            top_by_likes = sorted(posts, key=lambda x: x.get('like_count', 0), reverse=True)[:3]
            top_by_comments = sorted(posts, key=lambda x: x.get('comment_count', 0), reverse=True)[:3]
            top_by_views = sorted(posts, key=lambda x: x.get('view_count', 0), reverse=True)[:3]
            
            result = {
                'like_count': top_by_likes,
                'comment_count': top_by_comments,
                'view_count': top_by_views
            }
            
            # 중복 제거를 위해 모든 선별된 게시글을 하나의 세트로 합침
            all_selected = set()
            for posts_list in result.values():
                for post in posts_list:
                    all_selected.add(post['url'])
            
            logger.info(f"🏆 상위 게시글 선별 완료: 총 {len(all_selected)}개 (중복 제거)")
            return result
            
        except Exception as e:
            logger.error(f"💥 상위 게시글 선별 실패: {e}")
            return {'like_count': [], 'comment_count': [], 'view_count': []}
    
    async def scrape_post_detail(self, post_url: str) -> Dict:
        """
        개별 게시글 상세 스크래핑
        
        Args:
            post_url: 게시글 URL
            
        Returns:
            Dict: 게시글 상세 데이터
        """
        try:
            logger.info(f"📄 게시글 상세 스크래핑 시작: {post_url}")
            
            if self.page is None:
                logger.error("💥 브라우저가 초기화되지 않았습니다.")
                return {}
            
            # 페이지 이동
            await self.page.goto(post_url, wait_until="networkidle", timeout=self.navigation_timeout)
            
            # 게시글 본문 영역 대기
            try:
                await self.page.wait_for_selector('article, .xe_content, .rd_body', timeout=self.wait_timeout)
            except:
                logger.warning("⚠️ 게시글 본문 영역을 찾을 수 없습니다.")
            
            # HTML 내용 가져오기
            html_content = await self.page.content()
            
            # 메타데이터 추출
            metadata = await self._extract_post_metadata(html_content)
            
            # 본문 내용을 순서대로 추출
            content_list = await self._extract_content_in_order(html_content)
            
            # 댓글 데이터 추출
            comments = await self._extract_comments(html_content)
            
            post_data = {
                'url': post_url,
                'scraped_at': datetime.now(self.kst).isoformat(),
                'metadata': metadata,
                'content': content_list,
                'comments': comments
            }
            
            logger.info(f"✅ 게시글 상세 스크래핑 완료: {len(content_list)}개 콘텐츠, {len(comments)}개 댓글")
            return post_data
            
        except Exception as e:
            logger.error(f"💥 게시글 상세 스크래핑 실패: {e}")
            return {'url': post_url, 'error': str(e)}
    
    async def _extract_post_metadata(self, html_content: str) -> Dict:
        """게시글 메타데이터 추출"""
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            metadata = {}
            
            # 제목 추출
            title_elem = soup.find('h1') or soup.find('.np_18px_span') or soup.find('span', class_='np_18px_span')
            if title_elem:
                metadata['title'] = title_elem.get_text(strip=True)
            
            # 작성자 추출
            author_elem = soup.find('.member_plate') or soup.find('a', class_='member_plate')
            if author_elem:
                # 이미지 태그 제거하고 텍스트만 추출
                for img in author_elem.find_all('img'):
                    img.decompose()
                metadata['author'] = author_elem.get_text(strip=True)
            
            # 조회수, 추천수, 댓글수 추출
            stats_area = soup.find('div', class_='side fr') or soup.find('.btm_area')
            if stats_area:
                # 모든 span 요소에서 통계 정보 추출
                spans = stats_area.find_all('span')
                for span in spans:
                    span_text = span.get_text(strip=True)
                    
                    # 조회수
                    if '조회 수' in span_text:
                        b_tag = span.find('b')
                        if b_tag:
                            try:
                                metadata['view_count'] = int(b_tag.get_text(strip=True))
                            except:
                                metadata['view_count'] = 0
                    
                    # 추천수
                    elif '추천 수' in span_text:
                        b_tag = span.find('b')
                        if b_tag:
                            try:
                                metadata['like_count'] = int(b_tag.get_text(strip=True))
                            except:
                                metadata['like_count'] = 0
                    
                    # 댓글수
                    elif '댓글' in span_text:
                        b_tag = span.find('b')
                        if b_tag:
                            try:
                                metadata['comment_count'] = int(b_tag.get_text(strip=True))
                            except:
                                metadata['comment_count'] = 0
            
            return metadata
            
        except Exception as e:
            logger.error(f"💥 메타데이터 추출 실패: {e}")
            return {}
    
    async def _extract_content_in_order(self, html_content: str) -> List[Dict]:
        """본문 내용을 순서대로 추출"""
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            content_list = []
            order = 0
            
            # 본문 영역 찾기
            content_area = soup.find('article') or soup.find('.xe_content') or soup.find('.rd_body')
            if not content_area:
                return content_list
            
            # 모든 하위 요소를 순서대로 처리
            for element in content_area.find_all(['img', 'video', 'p', 'div', 'span']):
                content_item = None
                
                # 이미지 처리
                if element.name == 'img' and element.get('src'):
                    content_item = {
                        'type': 'image',
                        'order': order,
                        'src': element.get('src'),
                        'alt': element.get('alt', ''),
                        'width': element.get('width'),
                        'height': element.get('height')
                    }
                
                # 비디오 처리
                elif element.name == 'video' and element.get('src'):
                    content_item = {
                        'type': 'video',
                        'order': order,
                        'src': element.get('src'),
                        'controls': element.has_attr('controls'),
                        'poster': element.get('poster')
                    }
                
                # 텍스트 처리
                elif element.name in ['p', 'div', 'span']:
                    text_content = element.get_text(strip=True)
                    if text_content and len(text_content) > 0:
                        content_item = {
                            'type': 'text',
                            'order': order,
                            'content': text_content,
                            'html': str(element)
                        }
                
                if content_item:
                    content_list.append(content_item)
                    order += 1
            
            return content_list
            
        except Exception as e:
            logger.error(f"💥 본문 내용 추출 실패: {e}")
            return []
    
    async def _extract_comments(self, html_content: str) -> List[Dict]:
        """댓글 추출 (계층구조 보존)"""
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            comments = []
            
            # 댓글 영역 찾기
            comment_area = soup.find('.fdb_lst_ul') or soup.find('ul', class_='fdb_lst_ul')
            if not comment_area:
                return comments
            
            # 모든 댓글 li 요소 찾기
            comment_items = comment_area.find_all('li', class_='fdb_itm')
            
            for item in comment_items:
                comment_data = self._extract_single_comment(item)
                if comment_data:
                    comments.append(comment_data)
            
            return comments
            
        except Exception as e:
            logger.error(f"💥 댓글 추출 실패: {e}")
            return []
    
    def _extract_single_comment(self, comment_element) -> Optional[Dict]:
        """개별 댓글 데이터 추출"""
        try:
            # 댓글 ID 추출
            comment_id = comment_element.get('id', '')
            
            # 대댓글 여부 확인 (margin-left 스타일이나 re 클래스로 판단)
            is_reply = 're' in comment_element.get('class', [])
            depth = 0
            
            if is_reply:
                style = comment_element.get('style', '')
                if 'margin-left:2%' in style:
                    depth = 1
                elif 'margin-left:4%' in style:
                    depth = 2
            
            # 작성자 추출
            author_elem = comment_element.find('a', class_='member_plate')
            author = ''
            if author_elem:
                # 이미지 태그 제거하고 텍스트만 추출
                author_copy = BeautifulSoup(str(author_elem), 'html.parser')
                for img in author_copy.find_all('img'):
                    img.decompose()
                author = author_copy.get_text(strip=True)
            
            # 작성시간 추출
            date_elem = comment_element.find('span', class_='date')
            date = date_elem.get_text(strip=True) if date_elem else ''
            
            # 댓글 내용 추출
            content_elem = comment_element.find('div', class_='comment-content')
            content = ''
            if content_elem:
                xe_content = content_elem.find('div', class_='xe_content')
                if xe_content:
                    content = xe_content.get_text(strip=True)
                else:
                    content = content_elem.get_text(strip=True)
            
            # 추천수 추출
            like_count = 0
            vote_elem = comment_element.find('span', class_='voted_count')
            if vote_elem:
                like_text = vote_elem.get_text(strip=True)
                try:
                    like_count = int(like_text) if like_text.isdigit() else 0
                except:
                    like_count = 0
            
            # 베스트 댓글 여부 확인 (추천수가 높거나 특별한 클래스가 있는 경우)
            is_best = like_count >= 10  # 임계값 설정
            
            # 부모 댓글 ID 추출 (대댓글인 경우)
            parent_id = ''
            if is_reply:
                parent_link = comment_element.find('a', class_='findParent')
                if parent_link:
                    onclick = parent_link.get('onclick', '')
                    match = re.search(r'findComment\((\d+)\)', onclick)
                    if match:
                        parent_id = match.group(1)
            
            return {
                'id': comment_id,
                'author': author,
                'content': content,
                'date': date,
                'like_count': like_count,
                'is_reply': is_reply,
                'depth': depth,
                'parent_id': parent_id,
                'is_best': is_best
            }
            
        except Exception as e:
            logger.error(f"💥 개별 댓글 추출 실패: {e}")
            return None
    
    def identify_best_comments(self, comments: List[Dict]) -> List[Dict]:
        """베스트 댓글 식별 및 표시"""
        try:
            # 이미 is_best 필드가 설정되어 있으므로 그대로 반환
            # 필요시 추가 로직 구현 가능
            return comments
            
        except Exception as e:
            logger.error(f"💥 베스트 댓글 식별 실패: {e}")
            return comments


async def scrape_fmkorea_posts() -> Dict:
    """
    에펨코리아 게시글 스크래핑 메인 함수
    
    Returns:
        Dict: 스크래핑 결과
    """
    try:
        async with FMKoreaScraper() as scraper:
            # 정치 게시판 URL
            politics_url = "https://www.fmkorea.com/index.php?mid=politics"
            
            logger.info("🚀 에펨코리아 스크래핑 시작")
            
            # 게시글 목록 페이지 이동
            await scraper.page.goto(politics_url, wait_until="networkidle", timeout=scraper.navigation_timeout)
            
            # 게시글 목록 HTML 가져오기
            html_content = await scraper.page.content()
            
            # 게시글 목록 추출
            all_posts = scraper.extract_post_list(html_content)
            
            # 관리자 게시글 필터링
            filtered_posts = scraper.filter_admin_posts(all_posts)
            
            # 상위 게시글 선별
            top_posts = scraper.select_top_posts(filtered_posts)
            
            # 선별된 게시글들의 상세 정보 스크래핑
            detailed_posts = {}
            
            for metric, posts in top_posts.items():
                detailed_posts[metric] = []
                
                for post in posts:
                    # 상대 URL을 절대 URL로 변환
                    if post['url'].startswith('/'):
                        post_url = scraper.base_url + post['url']
                    else:
                        post_url = post['url']
                    
                    # 게시글 상세 스크래핑
                    detail_data = await scraper.scrape_post_detail(post_url)
                    
                    # 기본 정보와 상세 정보 병합
                    combined_data = {**post, **detail_data}
                    detailed_posts[metric].append(combined_data)
            
            result = {
                'scraped_at': datetime.now(scraper.kst).isoformat(),
                'total_posts': len(all_posts),
                'filtered_posts': len(filtered_posts),
                'top_posts': detailed_posts,
                'success': True
            }
            
            logger.info("✅ 에펨코리아 스크래핑 완료")
            return result
            
    except Exception as e:
        logger.error(f"💥 에펨코리아 스크래핑 실패: {e}")
        return {
            'scraped_at': datetime.now().isoformat(),
            'error': str(e),
            'success': False
        }


if __name__ == "__main__":
    # 테스트 실행
    result = asyncio.run(scrape_fmkorea_posts())
    print(json.dumps(result, ensure_ascii=False, indent=2)) 
"""
FM코리아 스크래퍼 v2 (추상 기본 클래스 기반)

주요 개선사항:
- BaseCommunityScaper 상속으로 공통 로직 재사용 (line 20-50)
- 기존 HTML 구조 분석 로직 완전 호환 (line 52-120)
- 순서 보존 콘텐츠 추출 로직 유지 (line 122-200)
- 게시판 목록 메타데이터 추출 추가 (line 202-280)
- CommunityPost 모델 출력 통합 (line 282-320)

작성자: AI Assistant
작성일: 2025-01-28
목적: 통일된 구조로 FM코리아 스크래핑 (기존 기능 완전 호환)
"""

from typing import List, Dict, Optional
import re
from loguru import logger
from urllib.parse import urljoin

from .base_scraper import BaseCommunityScaper, FMKoreaConfig


class FMKoreaScraper(BaseCommunityScaper):
    """FM코리아 스크래퍼 v2 (통일된 구조 + 기존 로직 완전 호환)"""
    
    def __init__(self):
        super().__init__(FMKoreaConfig())
    
    def get_site_name(self) -> str:
        return 'fmkorea'
    
    async def wait_for_board_elements(self):
        """게시판 요소 로딩 대기 (FM코리아 특화)"""
        try:
            await self.page.wait_for_selector('table, .board_list, .list_table', 
                                            timeout=self.site_config.wait_timeout)
        except:
            logger.warning("⚠️ FM코리아 게시판 요소를 찾을 수 없습니다.")
    
    async def wait_for_post_elements(self):
        """게시글 요소 로딩 대기 (FM코리아 특화)"""
        try:
            await self.page.wait_for_selector('article, .xe_content, .rd_body', 
                                            timeout=self.site_config.wait_timeout)
        except:
            logger.warning("⚠️ FM코리아 게시글 본문 영역을 찾을 수 없습니다.")
    
    async def extract_board_posts(self) -> List[Dict]:
        """
        게시판에서 게시글 목록 추출 (FM코리아 특화 + 메타데이터 포함)
        
        기존 로직을 활용하되 메타데이터(추천수, 댓글수, 조회수) 추가 추출
        """
        try:
            posts = []
            
            # FM코리아 게시글 행 추출 (다양한 셀렉터 시도)
            row_selectors = [
                'table tbody tr',
                '.list_table tbody tr',
                'tbody tr:has(td)'
            ]
            
            post_rows = []
            for selector in row_selectors:
                try:
                    elements = await self.page.query_selector_all(selector)
                    if elements:
                        post_rows = elements
                        logger.info(f"✅ FM코리아 게시글 행 발견: {len(elements)}개 ({selector})")
                        break
                except:
                    continue
            
            if not post_rows:
                logger.warning("⚠️ FM코리아 게시글 행을 찾을 수 없습니다.")
                return []
            
            # 각 게시글 행에서 정보 추출
            for row in post_rows:
                try:
                    post_data = await self.extract_post_info_from_row(row)
                    if post_data and post_data.get('post_url'):
                        posts.append(post_data)
                        logger.debug(f"FM코리아 게시글 추출: {post_data['title'][:30]}... (추천:{post_data.get('like_count', 0)}, 댓글:{post_data.get('comment_count', 0)}, 조회:{post_data.get('view_count', 0)})")
                except Exception as e:
                    logger.debug(f"게시글 행 처리 실패: {e}")
                    continue
            
            logger.info(f"✅ FM코리아 게시판 목록 추출 완료: {len(posts)}개")
            return posts
            
        except Exception as e:
            logger.error(f"💥 FM코리아 게시판 목록 추출 실패: {e}")
            return []
    
    async def extract_post_info_from_row(self, row_element) -> Optional[Dict]:
        """
        게시글 행에서 기본 정보 + 메타데이터 추출 (FM코리아 특화)
        
        기존 extract_post_info 로직을 확장하여 메타데이터 추가
        """
        try:
            post_info = {}
            
            # 제목과 링크 추출 (기존 로직 활용)
            title_selectors = [
                'td.title a',
                '.title a',
                'td a[href*="document_srl"]',
                'td a[href*="/"]'
            ]
            
            title_found = False
            for selector in title_selectors:
                try:
                    title_element = await row_element.query_selector(selector)
                    if title_element:
                        title_text = await title_element.inner_text()
                        href = await title_element.get_attribute('href')
                        
                        if title_text and href:
                            post_info['title'] = title_text.strip()
                            
                            # 절대 URL로 변환
                            if href.startswith('/'):
                                post_info['post_url'] = urljoin(self.site_config.base_url, href)
                            else:
                                post_info['post_url'] = href
                            
                            # 게시글 ID 추출
                            post_info['post_id'] = self.parse_post_id_from_url(post_info['post_url'])
                            title_found = True
                            break
                except:
                    continue
            
            if not title_found:
                return None
            
            # 메타데이터 추출 (추천수, 댓글수, 조회수)
            cells = await row_element.query_selector_all('td')
            
            # 기본값 설정
            post_info['like_count'] = 0
            post_info['comment_count'] = 0
            post_info['view_count'] = 0
            
            for cell in cells:
                try:
                    cell_text = await cell.inner_text()
                    cell_text = cell_text.strip()
                    
                    # 숫자 패턴 확인
                    if cell_text.isdigit():
                        number = int(cell_text)
                        
                        # 셀의 클래스나 위치로 구분
                        cell_class = await cell.get_attribute('class') or ''
                        
                        if 'recomd' in cell_class or 'like' in cell_class or 'vote' in cell_class:
                            post_info['like_count'] = number
                        elif 'comment' in cell_class or 'reply' in cell_class:
                            post_info['comment_count'] = number
                        elif 'hit' in cell_class or 'view' in cell_class:
                            post_info['view_count'] = number
                        else:
                            # 클래스가 없는 경우 숫자 크기로 추정
                            if number > 1000:  # 조회수로 추정
                                if post_info['view_count'] == 0:
                                    post_info['view_count'] = number
                            elif number > 0 and number < 1000:  # 추천수나 댓글수로 추정
                                if post_info['like_count'] == 0:
                                    post_info['like_count'] = number
                                elif post_info['comment_count'] == 0:
                                    post_info['comment_count'] = number
                    
                    # 댓글수 특별 처리 (제목에 포함된 경우)
                    elif '(' in cell_text and ')' in cell_text:
                        comment_match = re.search(r'\((\d+)\)', cell_text)
                        if comment_match:
                            post_info['comment_count'] = int(comment_match.group(1))
                
                except:
                    continue
            
            # 작성자 추출 (선택사항)
            try:
                author_selectors = ['.author', '.writer', '.member']
                for selector in author_selectors:
                    author_element = await row_element.query_selector(selector)
                    if author_element:
                        author_text = await author_element.inner_text()
                        if author_text and author_text.strip():
                            post_info['author'] = author_text.strip()
                            break
            except:
                pass
            
            # 작성시간 추출 (선택사항)
            try:
                date_selectors = ['.date', '.time', '.regdate']
                for selector in date_selectors:
                    date_element = await row_element.query_selector(selector)
                    if date_element:
                        date_text = await date_element.inner_text()
                        if date_text and date_text.strip():
                            post_info['date'] = date_text.strip()
                            break
            except:
                pass
            
            return post_info
            
        except Exception as e:
            logger.debug(f"FM코리아 게시글 정보 추출 실패: {e}")
            return None
    
    async def extract_post_metadata(self) -> Dict:
        """
        게시글 메타데이터 추출 (FM코리아 특화)
        
        기존 extract_post_metadata 로직 완전 활용
        """
        try:
            metadata = {}
            
            # 제목 추출 (기존 로직)
            for selector in self.site_config.selectors['title']:
                try:
                    title_element = await self.page.query_selector(selector)
                    if title_element:
                        title_text = await title_element.inner_text()
                        if title_text and title_text.strip():
                            metadata['title'] = title_text.strip()
                            break
                except:
                    continue
            
            # 작성자 추출 (기존 로직)
            for selector in self.site_config.selectors['author']:
                try:
                    author_element = await self.page.query_selector(selector)
                    if author_element:
                        author_text = await author_element.inner_text()
                        if author_text and author_text.strip():
                            metadata['author'] = author_text.strip()
                            break
                except:
                    continue
            
            # 작성 시간 추출 (기존 로직)
            for selector in self.site_config.selectors['date']:
                try:
                    date_element = await self.page.query_selector(selector)
                    if date_element:
                        date_text = await date_element.inner_text()
                        if date_text and date_text.strip():
                            metadata['date'] = date_text.strip()
                            break
                except:
                    continue
            
            # 통계 정보 추출 (기존 로직 활용)
            stats_selectors = [
                '.btm_area .side.fr span',
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
                        if '조회 수' in text or '조회수' in text:
                            numbers = re.findall(r'\d+', text)
                            if numbers:
                                view_count = int(numbers[-1])
                        elif '추천 수' in text or '추천수' in text or '추천' in text:
                            numbers = re.findall(r'\d+', text)
                            if numbers:
                                like_count = int(numbers[-1])
                        elif '비추천' in text or '반대' in text or '싫어요' in text:
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
            
            return metadata
            
        except Exception as e:
            logger.error(f"💥 FM코리아 메타데이터 추출 실패: {e}")
            return {}
    
    async def extract_content_in_order(self) -> List[Dict]:
        """
        게시글 본문 내용 순서대로 추출 (FM코리아 특화)
        
        기존 extract_content_in_order 로직 완전 활용
        """
        try:
            content_list: List[Dict] = []
            order = 0
            
            # 본문 컨테이너 찾기 (기존 로직)
            article_element = None
            for selector in self.site_config.selectors['post_container']:
                try:
                    element = await self.page.query_selector(selector)
                    if element:
                        article_element = element
                        logger.info(f"✅ FM코리아 본문 컨테이너 발견: {selector}")
                        break
                except:
                    continue
            
            if not article_element:
                logger.warning("⚠️ FM코리아 게시글 본문 컨테이너를 찾을 수 없습니다.")
                return []
            
            # 기존 extract_elements_improved 로직 사용
            order = await self.extract_elements_improved(article_element, content_list, order)
            
            logger.info(f"✅ FM코리아 콘텐츠 추출 완료: {len(content_list)}개 요소")
            return content_list
            
        except Exception as e:
            logger.error(f"💥 FM코리아 본문 내용 추출 실패: {e}")
            return []
    
    async def extract_elements_improved(self, parent_element, content_list: List[Dict], order_start: int) -> int:
        """
        개선된 요소 추출 (기존 로직 완전 활용)
        
        기존 fmkorea_scraper.py의 extract_elements_improved 로직을 그대로 사용
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
                        
                        # highslide 클래스가 있는 링크만 처리
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
                    
                    # 2. 독립적인 이미지 처리
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
                    
                    # 4. 텍스트 요소 처리
                    elif tag_name in ['p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'br']:
                        if tag_name == 'br':
                            continue
                            
                        # 하위에 이미지나 비디오가 있는지 확인
                        has_media = await element.query_selector('img, video, a.highslide')
                        if not has_media:
                            text_content = await element.evaluate('el => el.textContent?.trim()')
                            if text_content and len(text_content.strip()) > 0:
                                if "Video 태그를 지원하지 않는 브라우저입니다" not in text_content:
                                    text_data = await self.extract_text_data(element, current_order)
                                    if text_data:
                                        content_list.append(text_data)
                                        current_order += 1
                        else:
                            # 미디어가 있는 요소는 재귀적으로 처리
                            current_order = await self.extract_elements_improved(element, content_list, current_order)
                
                except Exception as e:
                    logger.debug(f"요소 처리 실패: {e}")
                    continue
            
            return current_order
            
        except Exception as e:
            logger.error(f"💥 FM코리아 요소 추출 실패: {e}")
            return current_order
    
    async def extract_image_data(self, link_element, img_element, order: int) -> Optional[Dict]:
        """이미지 데이터 추출 (기존 로직 완전 활용)"""
        try:
            # 이미지 소스 우선순위: data-original > src
            src = await img_element.get_attribute('data-original')
            if not src:
                src = await img_element.get_attribute('src')
            
            if not src:
                return None
            
            # 절대 URL로 변환
            src = self.make_absolute_url(src)
            
            # 원본 src도 보존
            original_src = await img_element.get_attribute('src')
            if original_src:
                original_src = self.make_absolute_url(original_src)
            
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
                    href = self.make_absolute_url(href)
                    img_data['data']['href'] = href
                    img_data['data']['link_class'] = await link_element.get_attribute('class') or ''
                    img_data['data']['link_rel'] = await link_element.get_attribute('rel') or ''
            
            return img_data
            
        except Exception as e:
            logger.warning(f"⚠️ FM코리아 이미지 데이터 추출 실패: {e}")
            return None
    
    async def extract_video_data(self, video_element, order: int) -> Optional[Dict]:
        """동영상 데이터 추출 (기존 로직 완전 활용)"""
        try:
            src = await video_element.get_attribute('src')
            if not src:
                source = await video_element.query_selector('source')
                if source:
                    src = await source.get_attribute('src')
            
            if not src:
                return None
            
            src = self.make_absolute_url(src)
            
            # 자동재생 속성 감지
            autoplay = await video_element.get_attribute('autoplay') is not None
            muted = await video_element.get_attribute('muted') is not None
            
            # 자동재생이면 음소거 처리 (브라우저 정책)
            if autoplay and not muted:
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
            logger.warning(f"⚠️ FM코리아 동영상 데이터 추출 실패: {e}")
            return None
    
    async def extract_text_data(self, text_element, order: int) -> Optional[Dict]:
        """텍스트 데이터 추출 (기존 로직 완전 활용)"""
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
            logger.warning(f"⚠️ FM코리아 텍스트 데이터 추출 실패: {e}")
            return None
    
    async def extract_comments_data(self) -> List[Dict]:
        """
        댓글 데이터 추출 (FM코리아 특화)
        
        기존 extract_comments_data 로직 완전 활용
        """
        try:
            comments = []
            
            # 댓글 컨테이너 확인
            comment_elements = []
            for selector in self.site_config.selectors['comments']:
                try:
                    elements = await self.page.query_selector_all(selector)
                    if elements:
                        comment_elements = elements
                        logger.info(f"✅ FM코리아 댓글 요소 발견: {len(elements)}개 ({selector})")
                        break
                except:
                    continue
            
            if not comment_elements:
                logger.info("📝 FM코리아 댓글이 없습니다.")
                return []
            
            # 각 댓글 요소 처리
            for i, comment_element in enumerate(comment_elements):
                try:
                    comment_data = await self.extract_single_comment_improved(comment_element, i)
                    if comment_data:
                        comments.append(comment_data)
                except Exception as e:
                    logger.warning(f"⚠️ FM코리아 댓글 {i+1} 추출 실패: {e}")
                    continue
            
            logger.info(f"✅ FM코리아 댓글 추출 완료: {len(comments)}개")
            return comments
            
        except Exception as e:
            logger.error(f"💥 FM코리아 댓글 데이터 추출 실패: {e}")
            return []
    
    async def extract_single_comment_improved(self, comment_element, index: int) -> Optional[Dict]:
        """개별 댓글 추출 (기존 로직 활용)"""
        try:
            # 댓글 ID 추출
            comment_id = await comment_element.get_attribute('id')
            if not comment_id:
                comment_id = f'comment_{index}'
            
            # 작성자 추출
            author = '익명'
            try:
                author_element = await comment_element.query_selector('.member_plate')
                if author_element:
                    author_text = await author_element.inner_text()
                    if author_text and author_text.strip():
                        author = author_text.strip()
            except:
                pass
            
            # 댓글 내용 추출
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
            
            # 작성 시간 추출
            date = ''
            try:
                date_element = await comment_element.query_selector('.meta .date, .date')
                if date_element:
                    date_text = await date_element.inner_text()
                    if date_text and date_text.strip():
                        date = date_text.strip()
            except:
                pass
            
            # 추천/비추천 수 추출
            like_count = 0
            dislike_count = 0
            
            try:
                # 추천수
                voted_selectors = ['.voted_count', '.vote_up .count', '.like_count']
                for selector in voted_selectors:
                    voted_element = await comment_element.query_selector(selector)
                    if voted_element:
                        voted_text = await voted_element.inner_text()
                        if voted_text and voted_text.strip().isdigit():
                            like_count = int(voted_text.strip())
                            break
                
                # 비추천수
                blamed_selectors = ['.blamed_count', '.vote_down .count', '.dislike_count']
                for selector in blamed_selectors:
                    blamed_element = await comment_element.query_selector(selector)
                    if blamed_element:
                        blamed_text = await blamed_element.inner_text()
                        if blamed_text and blamed_text.strip().isdigit():
                            dislike_count = int(blamed_text.strip())
                            break
            except:
                pass
            
            comment_data = {
                'id': comment_id,
                'author': author,
                'content': content,
                'date': date,
                'like_count': like_count,
                'dislike_count': dislike_count,
                'is_reply': False,  # 대댓글 구분 로직 추가 가능
                'is_best': False   # 베스트 댓글 구분 로직 추가 가능
            }
            
            return comment_data
            
        except Exception as e:
            logger.warning(f"⚠️ FM코리아 개별 댓글 추출 실패: {e}")
            return None
    
    def parse_post_id_from_url(self, url: str) -> str:
        """URL에서 게시글 ID 추출 (기존 로직 완전 활용)"""
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
            logger.error(f"💥 FM코리아 게시글 ID 추출 실패: {e}")
            return 'unknown'


# 편의 함수들
async def scrape_fmkorea_board_v2(board_url: str, criteria_count: int = 3) -> Dict[str, List[Dict]]:
    """FM코리아 게시판 지표별 선별 스크래핑 편의 함수"""
    async with FMKoreaScraper() as scraper:
        return await scraper.scrape_board_with_selection(board_url, criteria_count)


async def scrape_fmkorea_post_v2(post_url: str) -> Dict:
    """FM코리아 게시글 상세 스크래핑 편의 함수"""
    async with FMKoreaScraper() as scraper:
        return await scraper.scrape_post_detail(post_url) 
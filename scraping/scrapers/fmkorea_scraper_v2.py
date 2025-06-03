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
            
            # 공지글 필터링 (관리자 게시글 제외)
            if self.is_notice_post(post_info['title'], post_info.get('author', '')):
                logger.debug(f"공지글 제외: {post_info['title'][:30]}... (작성자: {post_info.get('author', 'Unknown')})")
                return None
            
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
        
        실제 HTML 구조에 맞게 개선된 셀렉터 사용
        """
        try:
            metadata = {}
            
            # 제목 추출 (실제 HTML 구조: h1.np_18px > span.np_18px_span)
            title_selectors = [
                'h1.np_18px span.np_18px_span',  # 실제 구조
                'h1.np_18px',
                '.np_18px_span',
                'h1 span',
                'h1'
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
            
            # 작성자 추출 (실제 HTML 구조: .btm_area .side .member_plate)
            author_selectors = [
                '.btm_area .side .member_plate',  # 실제 구조
                '.member_plate',
                '.side .member_plate',
                '.btm_area .member_plate'
            ]
            
            for selector in author_selectors:
                try:
                    author_element = await self.page.query_selector(selector)
                    if author_element:
                        author_text = await author_element.inner_text()
                        if author_text and author_text.strip():
                            metadata['author'] = author_text.strip()
                            logger.info(f"✅ 작성자 추출 성공: {author_text.strip()}")
                            break
                except:
                    continue
            
            # 작성 시간 추출 (실제 HTML 구조: .top_area .date.m_no)
            date_selectors = [
                '.top_area .date.m_no',  # 실제 구조
                '.date.m_no',
                '.top_area .date',
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
                            logger.info(f"✅ 작성시간 추출 성공: {date_text.strip()}")
                            break
                except:
                    continue
            
            # 통계 정보 추출 (실제 HTML 구조: .btm_area .side.fr span)
            view_count = 0
            like_count = 0
            comment_count = 0
            
            try:
                # 조회수, 추천수, 댓글수가 포함된 영역
                stats_area = await self.page.query_selector('.btm_area .side.fr')
                if stats_area:
                    stats_text = await stats_area.inner_text()
                    logger.debug(f"통계 영역 텍스트: {stats_text}")
                    
                    # 조회수 추출
                    view_match = re.search(r'조회\s*수?\s*(\d+)', stats_text)
                    if view_match:
                        view_count = int(view_match.group(1))
                    
                    # 추천수 추출
                    like_match = re.search(r'추천\s*수?\s*(\d+)', stats_text)
                    if like_match:
                        like_count = int(like_match.group(1))
                    
                    # 댓글수 추출
                    comment_match = re.search(r'댓글\s*(\d+)', stats_text)
                    if comment_match:
                        comment_count = int(comment_match.group(1))
                        
                    logger.info(f"✅ 통계 추출 성공 - 조회:{view_count}, 추천:{like_count}, 댓글:{comment_count}")
            except Exception as e:
                logger.debug(f"통계 정보 추출 실패: {e}")
            
            # 추가로 포텐/방출 버튼에서 추천수 확인
            try:
                vote_element = await self.page.query_selector('.fm_vote .new_voted_count')
                if vote_element:
                    vote_text = await vote_element.inner_text()
                    if vote_text and vote_text.strip().isdigit():
                        like_count = int(vote_text.strip())
                        logger.info(f"✅ 포텐 버튼에서 추천수 추출: {like_count}")
            except:
                pass
            
            metadata['view_count'] = view_count
            metadata['like_count'] = like_count
            metadata['dislike_count'] = 0  # 에펨코리아는 비추천 수가 별도로 표시되지 않음
            metadata['comment_count'] = comment_count
            
            logger.info(f"✅ FM코리아 메타데이터 추출 완료: {metadata}")
            return metadata
            
        except Exception as e:
            logger.error(f"💥 FM코리아 메타데이터 추출 실패: {e}")
            return {}
    
    async def extract_content_in_order(self) -> List[Dict]:
        """
        게시글 본문 내용 순서대로 추출 (FM코리아 특화)
        
        실제 HTML 구조: article .xe_content
        """
        try:
            content_list: List[Dict] = []
            order = 0
            
            # 본문 컨테이너 찾기 (실제 HTML 구조)
            article_selectors = [
                'article .xe_content',  # 실제 구조
                '.xe_content',
                'article',
                '.rd_body .xe_content',
                '.document_content'
            ]
            
            article_element = None
            for selector in article_selectors:
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
            
            # 본문 내용 미리보기
            try:
                content_preview = await article_element.inner_text()
                logger.info(f"📄 본문 내용 미리보기: {content_preview[:100]}...")
            except:
                pass
            
            # 기존 extract_elements_improved 로직 사용
            order = await self.extract_elements_improved(article_element, content_list, order)
            
            logger.info(f"✅ FM코리아 콘텐츠 추출 완료: {len(content_list)}개 요소")
            return content_list
            
        except Exception as e:
            logger.error(f"💥 FM코리아 본문 내용 추출 실패: {e}")
            return []
    
    async def extract_elements_improved(self, parent_element, content_list: List[Dict], order_start: int) -> int:
        """
        개선된 요소 추출 (에펨코리아 특화)
        
        빈 요소와 텍스트 노드를 포함한 모든 콘텐츠를 순서대로 추출
        """
        try:
            order = order_start
            
            # 직접 자식 요소들을 순서대로 처리 (중첩된 자식 제외)
            direct_children = await parent_element.query_selector_all(':scope > *')
            
            processed_images = set()  # 중복 이미지 방지
            
            logger.info(f"🔍 에펨코리아 직접 자식 요소 개수: {len(direct_children)}")
            
            for i, element in enumerate(direct_children):
                try:
                    tag_name = await element.evaluate('el => el.tagName.toLowerCase()')
                    element_text = await element.inner_text()
                    element_html = await element.inner_html()
                    
                    logger.debug(f"요소 {i+1}: <{tag_name}> - 텍스트: '{element_text}' - HTML: '{element_html[:100]}...'")
                    
                    # 이미지 처리
                    if tag_name == 'img':
                        img_src = await element.get_attribute('src')
                        if img_src and img_src not in processed_images:
                            processed_images.add(img_src)
                            
                            # 이미지 링크 찾기
                            parent_link = await element.evaluate('''
                                el => {
                                    let parent = el.parentElement;
                                    while (parent && parent.tagName.toLowerCase() !== 'a') {
                                        parent = parent.parentElement;
                                    }
                                    return parent ? parent.href : null;
                                }
                            ''')
                            
                            image_data = await self.extract_image_data(element, parent_link, order)
                            if image_data:
                                content_list.append(image_data)
                                order += 1
                                logger.debug(f"✅ 이미지 추가: {img_src}")
                    
                    # 이미지를 포함한 요소 처리
                    elif tag_name in ['div', 'p', 'span']:
                        # 내부에 이미지가 있는지 확인
                        inner_images = await element.query_selector_all('img')
                        
                        if inner_images:
                            # 이미지가 있는 경우 이미지들을 추출
                            for img in inner_images:
                                img_src = await img.get_attribute('src')
                                if img_src and img_src not in processed_images:
                                    processed_images.add(img_src)
                                    
                                    # 이미지 링크 찾기
                                    parent_link = await img.evaluate('''
                                        el => {
                                            let parent = el.parentElement;
                                            while (parent && parent.tagName.toLowerCase() !== 'a') {
                                                parent = parent.parentElement;
                                            }
                                            return parent ? parent.href : null;
                                        }
                                    ''')
                                    
                                    image_data = await self.extract_image_data(img, parent_link, order)
                                    if image_data:
                                        content_list.append(image_data)
                                        order += 1
                                        logger.debug(f"✅ 내부 이미지 추가: {img_src}")
                        
                        # 텍스트 내용이 있는 경우 텍스트도 추출
                        if element_text and element_text.strip():
                            text_data = await self.extract_text_data(element, order)
                            if text_data:
                                content_list.append(text_data)
                                order += 1
                                logger.debug(f"✅ 텍스트 추가: {element_text[:50]}...")
                        
                        # 텍스트가 없어도 의미있는 HTML이 있으면 추가 (예: <br>, 빈 div 등)
                        elif element_html and element_html.strip():
                            # br 태그나 빈 div도 레이아웃상 의미가 있을 수 있음
                            if tag_name in ['br'] or 'br' in element_html.lower():
                                text_data = {
                                    'type': 'text',
                                    'order': order,
                                    'data': {
                                        'tag': tag_name,
                                        'text': '\n',  # 줄바꿈으로 처리
                                        'id': await element.get_attribute('id') or '',
                                        'class': await element.get_attribute('class') or '',
                                        'style': await element.get_attribute('style') or '',
                                        'innerHTML': element_html
                                    }
                                }
                                content_list.append(text_data)
                                order += 1
                                logger.debug(f"✅ 줄바꿈 요소 추가: <{tag_name}>")
                    
                    # 비디오 처리
                    elif tag_name in ['video', 'iframe']:
                        video_data = await self.extract_video_data(element, order)
                        if video_data:
                            content_list.append(video_data)
                            order += 1
                            logger.debug(f"✅ 비디오 추가: <{tag_name}>")
                    
                    # 기타 텍스트 요소 처리
                    elif tag_name in ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'strong', 'em', 'b', 'i']:
                        if element_text and element_text.strip():
                            text_data = await self.extract_text_data(element, order)
                            if text_data:
                                content_list.append(text_data)
                                order += 1
                                logger.debug(f"✅ 제목/강조 텍스트 추가: {element_text[:50]}...")
                
                except Exception as e:
                    logger.debug(f"요소 처리 중 오류 (무시됨): {e}")
                    continue
            
            # 추가로 텍스트 노드도 확인 (JavaScript로)
            try:
                text_nodes = await parent_element.evaluate('''
                    el => {
                        const walker = document.createTreeWalker(
                            el,
                            NodeFilter.SHOW_TEXT,
                            null,
                            false
                        );
                        
                        const textNodes = [];
                        let node;
                        while (node = walker.nextNode()) {
                            const text = node.textContent.trim();
                            if (text && text.length > 0) {
                                textNodes.push(text);
                            }
                        }
                        return textNodes;
                    }
                ''')
                
                logger.debug(f"🔍 추가 텍스트 노드들: {text_nodes}")
                
                # 아직 추출되지 않은 텍스트가 있으면 추가
                for text_node in text_nodes:
                    # 이미 추출된 텍스트인지 확인
                    already_extracted = any(
                        item.get('data', {}).get('text', '') == text_node 
                        for item in content_list 
                        if item.get('type') == 'text'
                    )
                    
                    if not already_extracted and len(text_node) > 2:  # 의미있는 텍스트만
                        text_data = {
                            'type': 'text',
                            'order': order,
                            'data': {
                                'tag': 'text_node',
                                'text': text_node,
                                'id': '',
                                'class': '',
                                'style': '',
                                'innerHTML': text_node
                            }
                        }
                        content_list.append(text_data)
                        order += 1
                        logger.debug(f"✅ 추가 텍스트 노드: {text_node[:50]}...")
                        
            except Exception as e:
                logger.debug(f"텍스트 노드 추출 실패: {e}")
            
            logger.info(f"✅ 에펨코리아 요소 추출 완료: {order - order_start}개 추가")
            return order
            
        except Exception as e:
            logger.error(f"💥 에펨코리아 요소 추출 실패: {e}")
            return order_start
    
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
        댓글 데이터 추출 (FM코리아 특화, 실제 HTML 구조 기반)
        
        실제 HTML 구조: .fdb_lst_ul > .fdb_itm
        """
        try:
            comments = []
            
            # 댓글 컨테이너 확인 (실제 HTML 구조)
            comment_container_selectors = [
                '.fdb_lst_ul',  # 실제 구조
                '.fdb_lst',
                '#cmtPosition .fdb_lst_ul',
                '.comment_list'
            ]
            
            comment_wrapper = None
            for selector in comment_container_selectors:
                try:
                    element = await self.page.query_selector(selector)
                    if element:
                        comment_wrapper = element
                        logger.info(f"✅ FM코리아 댓글 컨테이너 발견: {selector}")
                        break
                except:
                    continue
            
            if not comment_wrapper:
                logger.info("📝 FM코리아 댓글이 없습니다.")
                return []
            
            # 댓글 요소들 추출 (실제 HTML 구조: .fdb_itm)
            comment_elements = await comment_wrapper.query_selector_all('.fdb_itm')
            
            if not comment_elements:
                logger.warning("⚠️ FM코리아 댓글 요소를 찾을 수 없습니다.")
                return []
            
            logger.info(f"✅ FM코리아 댓글 요소 발견: {len(comment_elements)}개")
            
            # 각 댓글 요소 처리
            for i, comment_element in enumerate(comment_elements):
                try:
                    comment_data = await self.extract_single_comment_improved(comment_element, i)
                    if comment_data:
                        comments.append(comment_data)
                        logger.debug(f"댓글 추출: {comment_data['author']} - {comment_data['content'][:50]}...")
                except Exception as e:
                    logger.warning(f"⚠️ FM코리아 댓글 {i+1} 추출 실패: {e}")
                    continue
            
            logger.info(f"✅ FM코리아 댓글 추출 완료: {len(comments)}개")
            return comments
            
        except Exception as e:
            logger.error(f"💥 FM코리아 댓글 데이터 추출 실패: {e}")
            return []
    
    async def extract_single_comment_improved(self, comment_element, index: int) -> Optional[Dict]:
        """
        개별 댓글 추출 (실제 HTML 구조 기반)
        
        실제 HTML 구조:
        - 댓글 ID: li#comment_8468493522
        - 작성자: .meta .member_plate
        - 내용: .comment-content .xe_content
        - 시간: .meta .date
        - 추천수: .vote .voted_count
        """
        try:
            # 댓글 ID 추출 (실제 구조: li#comment_8468493522)
            comment_id = await comment_element.get_attribute('id')
            if not comment_id:
                comment_id = f'comment_{index}'
            
            # 대댓글 여부 확인 (실제 구조: .re 클래스와 margin-left 스타일)
            is_reply = False
            try:
                class_attr = await comment_element.get_attribute('class') or ''
                style_attr = await comment_element.get_attribute('style') or ''
                if 're' in class_attr or 'margin-left' in style_attr:
                    is_reply = True
            except:
                pass
            
            # 작성자 추출 (실제 구조: .meta .member_plate)
            author = '익명'
            try:
                author_element = await comment_element.query_selector('.meta .member_plate')
                if author_element:
                    author_text = await author_element.inner_text()
                    if author_text and author_text.strip():
                        author = author_text.strip()
                        logger.debug(f"작성자 추출: {author}")
            except:
                pass
            
            # 댓글 내용 추출 (실제 구조: .comment-content .xe_content)
            content = ''
            try:
                content_selectors = [
                    '.comment-content .xe_content',  # 실제 구조
                    '.xe_content',
                    '.comment-content'
                ]
                
                for selector in content_selectors:
                    content_element = await comment_element.query_selector(selector)
                    if content_element:
                        content_text = await content_element.inner_text()
                        if content_text and content_text.strip():
                            content = content_text.strip()
                            logger.debug(f"댓글 내용 추출: {content[:50]}...")
                            break
            except:
                pass
            
            # 작성 시간 추출 (실제 구조: .meta .date)
            date = ''
            try:
                date_element = await comment_element.query_selector('.meta .date')
                if date_element:
                    date_text = await date_element.inner_text()
                    if date_text and date_text.strip():
                        date = date_text.strip()
                        logger.debug(f"작성시간 추출: {date}")
            except:
                pass
            
            # 추천/비추천 수 추출 (실제 구조: .vote .voted_count, .vote .blamed_count)
            like_count = 0
            dislike_count = 0
            
            try:
                # 추천수 (실제 구조: .vote .voted_count)
                voted_element = await comment_element.query_selector('.vote .voted_count')
                if voted_element:
                    voted_text = await voted_element.inner_text()
                    if voted_text and voted_text.strip().isdigit():
                        like_count = int(voted_text.strip())
                        logger.debug(f"추천수 추출: {like_count}")
                
                # 비추천수 (실제 구조: .vote .blamed_count)
                blamed_element = await comment_element.query_selector('.vote .blamed_count')
                if blamed_element:
                    blamed_text = await blamed_element.inner_text()
                    if blamed_text and blamed_text.strip().isdigit():
                        dislike_count = int(blamed_text.strip())
                        logger.debug(f"비추천수 추출: {dislike_count}")
            except:
                pass
            
            # 내용이 없는 댓글은 제외
            if not content:
                logger.debug(f"내용이 없는 댓글 제외: {comment_id}")
                return None
            
            comment_data = {
                'id': comment_id,
                'author': author,
                'content': content,
                'date': date,
                'like_count': like_count,
                'dislike_count': dislike_count,
                'is_reply': is_reply,
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
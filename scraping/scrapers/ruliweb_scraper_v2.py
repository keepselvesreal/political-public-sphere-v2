"""
루리웹 스크래퍼 v2 (추상 기본 클래스 기반)

주요 개선사항:
- BaseCommunityScaper 상속으로 공통 로직 재사용 (line 20-50)
- 기존 HTML 구조 분석 로직 완전 호환 (line 52-120)
- 댓글 이미지 처리 로직 유지 (line 122-200)
- 게시판 목록 메타데이터 추출 추가 (line 202-280)
- CommunityPost 모델 출력 통합 (line 282-320)

작성자: AI Assistant
작성일: 2025-01-28
목적: 통일된 구조로 루리웹 스크래핑 (기존 기능 완전 호환)
"""

from typing import List, Dict, Optional
import re
from loguru import logger
from urllib.parse import urljoin

from .base_scraper import BaseCommunityScaper, RuliwebConfig


class RuliwebScraper(BaseCommunityScaper):
    """루리웹 스크래퍼 v2 (통일된 구조 + 기존 로직 완전 호환)"""
    
    def __init__(self):
        super().__init__(RuliwebConfig())
    
    def get_site_name(self) -> str:
        return 'ruliweb'
    
    async def wait_for_board_elements(self):
        """게시판 요소 로딩 대기 (루리웹 특화)"""
        try:
            await self.page.wait_for_selector('.board_list_table tbody tr', 
                                            timeout=self.site_config.wait_timeout)
        except:
            logger.warning("⚠️ 루리웹 게시판 요소를 찾을 수 없습니다.")
    
    async def wait_for_post_elements(self):
        """게시글 요소 로딩 대기 (루리웹 특화)"""
        try:
            await self.page.wait_for_selector('.board_main_top, .view_content', 
                                            timeout=self.site_config.wait_timeout)
        except:
            logger.warning("⚠️ 루리웹 게시글 본문 영역을 찾을 수 없습니다.")
    
    async def extract_board_posts(self) -> List[Dict]:
        """
        게시판에서 게시글 목록 추출 (루리웹 특화 + 메타데이터 포함)
        
        기존 extract_board_list 로직을 활용하되 메타데이터 추가 추출
        """
        try:
            posts = []
            
            # 루리웹 게시글 행 추출 (기존 로직 활용)
            post_rows = await self.page.query_selector_all('.board_list_table tbody tr.table_body:not(.notice):not(.list_inner)')
            
            if not post_rows:
                logger.warning("⚠️ 루리웹 게시글 행을 찾을 수 없습니다.")
                return []
            
            logger.info(f"✅ 루리웹 게시글 행 발견: {len(post_rows)}개")
            
            # 각 게시글 행에서 정보 추출
            for row in post_rows:
                try:
                    post_data = await self.extract_post_info_from_row(row)
                    if post_data and post_data.get('post_url'):
                        posts.append(post_data)
                        logger.debug(f"루리웹 게시글 추출: {post_data['title'][:30]}... (추천:{post_data.get('like_count', 0)}, 댓글:{post_data.get('comment_count', 0)}, 조회:{post_data.get('view_count', 0)})")
                except Exception as e:
                    logger.debug(f"게시글 행 처리 실패: {e}")
                    continue
            
            logger.info(f"✅ 루리웹 게시판 목록 추출 완료: {len(posts)}개")
            return posts
            
        except Exception as e:
            logger.error(f"💥 루리웹 게시판 목록 추출 실패: {e}")
            return []
    
    async def extract_post_info_from_row(self, row_element) -> Optional[Dict]:
        """
        게시글 행에서 기본 정보 + 메타데이터 추출 (루리웹 특화)
        
        기존 extract_board_post_info 로직을 확장하여 메타데이터 추가
        """
        try:
            post_info = {}
            
            # 게시글 ID
            try:
                id_element = await row_element.query_selector('td.id')
                if id_element:
                    post_id_text = await id_element.inner_text()
                    post_info['post_id'] = post_id_text.strip()
            except:
                post_info['post_id'] = 'unknown'
            
            # 제목 및 URL (기존 로직 활용)
            try:
                subject_element = await row_element.query_selector('td.subject a.subject_link')
                if not subject_element:
                    return None
                
                title_text = await subject_element.inner_text()
                post_url = await subject_element.get_attribute('href')
                
                if not title_text or not post_url:
                    return None
                
                post_info['title'] = title_text.strip()
                
                # 절대 URL로 변환
                if not post_url.startswith('http'):
                    post_info['post_url'] = urljoin(self.site_config.base_url, post_url)
                else:
                    post_info['post_url'] = post_url
                
                # URL에서 게시글 ID 추출 (더 정확한 ID)
                url_post_id = self.parse_post_id_from_url(post_info['post_url'])
                if url_post_id != 'unknown':
                    post_info['post_id'] = url_post_id
                
            except Exception as e:
                logger.debug(f"제목/URL 추출 실패: {e}")
                return None
            
            # 댓글 수 추출 (기존 로직 활용)
            try:
                reply_element = await row_element.query_selector('td.subject .num_reply')
                if reply_element:
                    reply_text = await reply_element.inner_text()
                    reply_match = re.search(r'\((\d+)\)', reply_text)
                    if reply_match:
                        post_info['comment_count'] = int(reply_match.group(1))
                    else:
                        post_info['comment_count'] = 0
                else:
                    post_info['comment_count'] = 0
            except:
                post_info['comment_count'] = 0
            
            # 작성자 (기존 로직 활용)
            try:
                writer_element = await row_element.query_selector('td.writer a')
                if writer_element:
                    author_text = await writer_element.inner_text()
                    post_info['author'] = author_text.strip()
                else:
                    post_info['author'] = '익명'
            except:
                post_info['author'] = '익명'
            
            # 공지글 필터링 (관리자 게시글 제외)
            if self.is_notice_post(post_info['title'], post_info['author']):
                logger.debug(f"공지글 제외: {post_info['title'][:30]}... (작성자: {post_info['author']})")
                return None
            
            # 추천수 (기존 로직 활용)
            try:
                recommend_element = await row_element.query_selector('td.recomd')
                if recommend_element:
                    recommend_text = await recommend_element.inner_text()
                    if recommend_text.strip().isdigit():
                        post_info['like_count'] = int(recommend_text.strip())
                    else:
                        post_info['like_count'] = 0
                else:
                    post_info['like_count'] = 0
            except:
                post_info['like_count'] = 0
            
            # 조회수 (기존 로직 활용)
            try:
                hit_element = await row_element.query_selector('td.hit')
                if hit_element:
                    hit_text = await hit_element.inner_text()
                    if hit_text.strip().isdigit():
                        post_info['view_count'] = int(hit_text.strip())
                    else:
                        post_info['view_count'] = 0
                else:
                    post_info['view_count'] = 0
            except:
                post_info['view_count'] = 0
            
            # 작성시간 (기존 로직 활용)
            try:
                time_element = await row_element.query_selector('td.time')
                if time_element:
                    time_text = await time_element.inner_text()
                    post_info['date'] = time_text.strip()
                else:
                    post_info['date'] = ''
            except:
                post_info['date'] = ''
            
            return post_info
            
        except Exception as e:
            logger.debug(f"루리웹 게시글 정보 추출 실패: {e}")
            return None
    
    async def extract_post_metadata(self) -> Dict:
        """
        게시글 메타데이터 추출 (루리웹 특화)
        
        실제 HTML 구조에 맞게 개선된 셀렉터 사용
        """
        try:
            metadata = {}
            
            # 제목 추출 (실제 HTML 구조: .subject_text .subject_inner_text)
            title_selectors = [
                '.subject_text .subject_inner_text',  # 실제 구조
                '.subject_inner_text',
                '.subject_text',
                'h4.subject .subject_text',
                'h4.subject'
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
            
            # 카테고리 추출 (실제 HTML 구조: .subject_text .category_text)
            try:
                category_element = await self.page.query_selector('.subject_text .category_text')
                if category_element:
                    category_text = await category_element.inner_text()
                    if category_text and category_text.strip():
                        # [잡담] 형태에서 대괄호 제거
                        category = category_text.strip().replace('[', '').replace(']', '')
                        metadata['category'] = category
                        logger.info(f"✅ 카테고리 추출 성공: {category}")
            except:
                pass
            
            # 작성자 추출 (실제 HTML 구조: .user_info .nick)
            author_selectors = [
                '.user_info .nick',  # 실제 구조
                '.nick',
                '.user_view .nick',
                '.user_info_wrapper .nick'
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
            
            # 작성 시간 추출 (실제 HTML 구조: .regdate)
            date_selectors = [
                '.regdate',  # 실제 구조
                '.user_info .regdate',
                'span.regdate',
                '.user_view .regdate'
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
            
            # 통계 정보 추출 (실제 HTML 구조: .user_info p, .mini_profile .info)
            view_count = 0
            like_count = 0
            dislike_count = 0
            comment_count = 0
            
            try:
                # 미니 프로필에서 통계 정보 추출
                mini_profile = await self.page.query_selector('.mini_profile .info')
                if mini_profile:
                    stats_text = await mini_profile.inner_text()
                    logger.debug(f"미니 프로필 통계 텍스트: {stats_text}")
                    
                    # 추천수 추출
                    like_match = re.search(r'(\d+)', stats_text)
                    if like_match:
                        like_count = int(like_match.group(1))
                    
                    # 댓글수 추출
                    comment_match = re.search(r'(\d+)', stats_text.split('|')[1] if '|' in stats_text else '')
                    if comment_match:
                        comment_count = int(comment_match.group(1))
                    
                    # 조회수 추출
                    view_match = re.search(r'(\d+)', stats_text.split('|')[2] if stats_text.count('|') >= 2 else '')
                    if view_match:
                        view_count = int(view_match.group(1))
                
                # 사용자 정보 영역에서도 추가 확인
                user_info_stats = await self.page.query_selector_all('.user_info p')
                for stat_element in user_info_stats:
                    stat_text = await stat_element.inner_text()
                    
                    # 추천수
                    if '추천' in stat_text:
                        like_match = re.search(r'추천\s*(\d+)', stat_text)
                        if like_match:
                            like_count = int(like_match.group(1))
                    
                    # 조회수
                    if '조회' in stat_text:
                        view_match = re.search(r'조회\s*(\d+)', stat_text)
                        if view_match:
                            view_count = int(view_match.group(1))
                    
                    # 비추력
                    if '비추력' in stat_text:
                        dislike_match = re.search(r'비추력\s*(\d+)', stat_text)
                        if dislike_match:
                            dislike_count = int(dislike_match.group(1))
                
                logger.info(f"✅ 통계 추출 성공 - 조회:{view_count}, 추천:{like_count}, 비추력:{dislike_count}, 댓글:{comment_count}")
                
            except Exception as e:
                logger.debug(f"통계 정보 추출 실패: {e}")
            
            # 댓글수 별도 확인 (reply_count input에서)
            try:
                reply_count_input = await self.page.query_selector('#reply_count')
                if reply_count_input:
                    reply_count_value = await reply_count_input.get_attribute('value')
                    if reply_count_value and reply_count_value.isdigit():
                        comment_count = int(reply_count_value)
                        logger.info(f"✅ 댓글수 별도 추출: {comment_count}")
            except:
                pass
            
            metadata['view_count'] = view_count
            metadata['like_count'] = like_count
            metadata['dislike_count'] = dislike_count
            metadata['comment_count'] = comment_count
            
            logger.info(f"✅ 루리웹 메타데이터 추출 완료: {metadata}")
            return metadata
            
        except Exception as e:
            logger.error(f"💥 루리웹 메타데이터 추출 실패: {e}")
            return {}
    
    async def extract_content_in_order(self) -> List[Dict]:
        """
        게시글 본문 내용 순서대로 추출 (루리웹 특화)
        
        실제 HTML 구조: .view_content article
        """
        try:
            content_list: List[Dict] = []
            order = 0
            
            # 본문 컨테이너 찾기 (실제 HTML 구조)
            article_selectors = [
                '.view_content article',  # 실제 구조
                '.view_content',
                'article',
                '.board_main_view .view_content',
                '.autolink article'
            ]
            
            article_element = None
            for selector in article_selectors:
                try:
                    element = await self.page.query_selector(selector)
                    if element:
                        article_element = element
                        logger.info(f"✅ 루리웹 본문 컨테이너 발견: {selector}")
                        break
                except:
                    continue
            
            if not article_element:
                logger.warning("⚠️ 루리웹 게시글 본문 컨테이너를 찾을 수 없습니다.")
                return []
            
            # 본문 내용 미리보기
            try:
                content_preview = await article_element.inner_text()
                logger.info(f"📄 본문 내용 미리보기: {content_preview[:100]}...")
            except:
                pass
            
            # 기존 extract_elements_improved 로직 사용
            order = await self.extract_elements_improved(article_element, content_list, order)
            
            logger.info(f"✅ 루리웹 콘텐츠 추출 완료: {len(content_list)}개 요소")
            return content_list
            
        except Exception as e:
            logger.error(f"💥 루리웹 본문 내용 추출 실패: {e}")
            return []
    
    async def extract_elements_improved(self, parent_element, content_list: List[Dict], order_start: int) -> int:
        """
        개선된 요소 추출 (기존 로직 완전 활용)
        
        기존 ruliweb_scraper.py의 extract_elements_improved 로직을 그대로 사용
        """
        try:
            order = order_start
            
            # 모든 자식 요소를 순서대로 처리
            child_elements = await parent_element.query_selector_all('*')
            
            processed_images = set()  # 중복 이미지 방지
            
            for element in child_elements:
                try:
                    tag_name = await element.evaluate('el => el.tagName.toLowerCase()')
                    
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
                    
                    # 비디오 처리
                    elif tag_name in ['video', 'iframe']:
                        video_data = await self.extract_video_data(element, order)
                        if video_data:
                            content_list.append(video_data)
                            order += 1
                    
                    # 텍스트 처리 (p, div 등)
                    elif tag_name in ['p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']:
                        # 자식 요소가 없는 텍스트만 처리
                        has_child_elements = await element.evaluate('el => el.children.length > 0')
                        if not has_child_elements:
                            text_data = await self.extract_text_data(element, order)
                            if text_data and text_data.get('data', {}).get('text', '').strip():
                                content_list.append(text_data)
                                order += 1
                
                except Exception as e:
                    logger.debug(f"요소 처리 중 오류 (무시됨): {e}")
                    continue
            
            return order
            
        except Exception as e:
            logger.error(f"💥 루리웹 요소 추출 실패: {e}")
            return order_start
    
    async def extract_image_data(self, img_element, parent_link: Optional[str], order: int) -> Optional[Dict]:
        """
        이미지 데이터 추출 (루리웹 특화, FM코리아와 동일한 구조)
        
        기존 extract_image_data 로직 완전 활용
        """
        try:
            src = await img_element.get_attribute('src')
            if not src:
                return None
            
            # 절대 URL로 변환
            src = self.make_absolute_url(src)
            
            # 이미지 속성 추출
            alt = await img_element.get_attribute('alt') or ''
            width = await img_element.get_attribute('width') or ''
            height = await img_element.get_attribute('height') or ''
            style = await img_element.get_attribute('style') or ''
            class_name = await img_element.get_attribute('class') or ''
            title = await img_element.get_attribute('title') or ''
            
            # FM코리아와 동일한 중첩 구조
            return {
                'type': 'image',
                'order': order,
                'data': {
                    'src': src,
                    'alt': alt,
                    'width': width,
                    'height': height,
                    'href': parent_link or '',
                    'data_original': src,  # 루리웹은 원본 이미지 직접 제공
                    'original_src': src,
                    'style': style,
                    'class': class_name,
                    'title': title,
                    'link_class': '',
                    'link_rel': ''
                }
            }
            
        except Exception as e:
            logger.warning(f"⚠️ 루리웹 이미지 데이터 추출 실패: {e}")
            return None
    
    async def extract_video_data(self, video_element, order: int) -> Optional[Dict]:
        """
        비디오 데이터 추출 (루리웹 특화, FM코리아와 동일한 구조)
        
        기존 extract_video_data 로직 완전 활용
        """
        try:
            tag_name = await video_element.evaluate('el => el.tagName.toLowerCase()')
            
            if tag_name == 'video':
                src = await video_element.get_attribute('src')
                poster = await video_element.get_attribute('poster') or ''
                width = await video_element.get_attribute('width') or ''
                height = await video_element.get_attribute('height') or ''
                
                # 자동재생 속성 감지
                autoplay = await video_element.get_attribute('autoplay') is not None
                loop = await video_element.get_attribute('loop') is not None
                muted = await video_element.get_attribute('muted') is not None
                controls = await video_element.get_attribute('controls') is not None
                preload = await video_element.get_attribute('preload') or 'metadata'
                class_name = await video_element.get_attribute('class') or ''
                
                # 자동재생이면 음소거 처리 (브라우저 정책)
                if autoplay and not muted:
                    muted = True
                
                # FM코리아와 동일한 중첩 구조
                return {
                    'type': 'video',
                    'order': order,
                    'data': {
                        'src': src,
                        'poster': poster,
                        'autoplay': autoplay,
                        'loop': loop,
                        'muted': muted,
                        'controls': controls,
                        'preload': preload,
                        'width': width,
                        'height': height,
                        'class': class_name
                    }
                }
            
            elif tag_name == 'iframe':
                src = await video_element.get_attribute('src')
                width = await video_element.get_attribute('width') or ''
                height = await video_element.get_attribute('height') or ''
                class_name = await video_element.get_attribute('class') or ''
                
                # FM코리아와 동일한 중첩 구조
                return {
                    'type': 'iframe',
                    'order': order,
                    'data': {
                        'src': src,
                        'width': width,
                        'height': height,
                        'class': class_name
                    }
                }
            
            return None
            
        except Exception as e:
            logger.warning(f"⚠️ 루리웹 비디오 데이터 추출 실패: {e}")
            return None
    
    async def extract_text_data(self, text_element, order: int) -> Optional[Dict]:
        """
        텍스트 데이터 추출 (루리웹 특화, FM코리아와 동일한 구조)
        
        기존 extract_text_data 로직 완전 활용
        """
        try:
            text = await text_element.inner_text()
            if not text or not text.strip():
                return None
            
            tag_name = await text_element.evaluate('el => el.tagName.toLowerCase()')
            
            # 스타일 정보 추출
            style = await text_element.get_attribute('style') or ''
            class_name = await text_element.get_attribute('class') or ''
            id_attr = await text_element.get_attribute('id') or ''
            innerHTML = await text_element.inner_html()
            
            # FM코리아와 동일한 중첩 구조
            return {
                'type': 'text',
                'order': order,
                'data': {
                    'tag': tag_name,
                    'text': text.strip(),
                    'id': id_attr,
                    'class': class_name,
                    'style': style,
                    'innerHTML': innerHTML
                }
            }
            
        except Exception as e:
            logger.warning(f"⚠️ 루리웹 텍스트 데이터 추출 실패: {e}")
            return None
    
    async def extract_comments_data(self) -> List[Dict]:
        """
        댓글 데이터 추출 (루리웹 특화, 실제 HTML 구조 기반)
        
        실제 HTML 구조: .comment_table .comment_element
        """
        try:
            comments = []
            
            # 댓글 컨테이너 확인 (실제 HTML 구조)
            comment_container_selectors = [
                '.comment_table',  # 실제 구조
                '.comment_view',
                '.comment_view_wrapper',
                '.comment_wrapper'
            ]
            
            comment_wrapper = None
            for selector in comment_container_selectors:
                try:
                    element = await self.page.query_selector(selector)
                    if element:
                        comment_wrapper = element
                        logger.info(f"✅ 루리웹 댓글 컨테이너 발견: {selector}")
                        break
                except:
                    continue
            
            if not comment_wrapper:
                logger.info("📝 루리웹 댓글이 없습니다.")
                return []
            
            # 댓글 요소들 추출 (실제 HTML 구조: tr.comment_element)
            comment_elements = await comment_wrapper.query_selector_all('tr.comment_element')
            
            if not comment_elements:
                logger.warning("⚠️ 루리웹 댓글 요소를 찾을 수 없습니다.")
                return []
            
            logger.info(f"✅ 루리웹 댓글 요소 발견: {len(comment_elements)}개")
            
            # 각 댓글 추출
            for index, comment_element in enumerate(comment_elements):
                try:
                    comment_data = await self.extract_single_comment_improved(comment_element, index)
                    if comment_data:
                        comments.append(comment_data)
                        logger.debug(f"댓글 추출: {comment_data['author']} - {comment_data['content'][:50]}...")
                except Exception as e:
                    logger.warning(f"⚠️ 루리웹 댓글 추출 실패 (인덱스 {index}): {e}")
                    continue
            
            logger.info(f"✅ 루리웹 댓글 추출 완료: {len(comments)}개")
            return comments
            
        except Exception as e:
            logger.error(f"💥 루리웹 댓글 데이터 추출 실패: {e}")
            return []
    
    async def extract_single_comment_improved(self, comment_element, index: int) -> Optional[Dict]:
        """
        개별 댓글 추출 (실제 HTML 구조 기반)
        
        실제 HTML 구조:
        - 댓글 ID: tr#ct_157697516
        - 작성자: .nick .nick_link
        - 내용: .text_wrapper .text
        - 시간: .control_box .time
        - 추천수: .btn_like .num
        - 베스트: .icon_best
        """
        try:
            # 댓글 ID 추출 (실제 구조: tr#ct_157697516)
            comment_id = await comment_element.get_attribute('id') or f'comment_{index}'
            
            # 대댓글 여부 확인 (실제 구조: .child 클래스)
            is_reply = False
            try:
                class_attr = await comment_element.get_attribute('class') or ''
                if 'child' in class_attr or 'reply' in class_attr:
                    is_reply = True
            except:
                pass
            
            # 베스트 댓글 여부 확인 (실제 구조: .icon_best)
            is_best = False
            try:
                best_element = await comment_element.query_selector('.icon_best')
                if best_element:
                    is_best = True
            except:
                pass
            
            # 작성자 정보 추출 (다양한 셀렉터 시도)
            author = '익명'
            try:
                author_selectors = [
                    '.nick .nick_link',  # 실제 구조
                    '.nick_link',
                    '.nick a',
                    '.nick',
                    '.user_nick',
                    '.writer',
                    'td.writer a',
                    'td.writer'
                ]
                
                for selector in author_selectors:
                    author_element = await comment_element.query_selector(selector)
                    if author_element:
                        author_text = await author_element.inner_text()
                        if author_text and author_text.strip():
                            author = author_text.strip()
                            logger.debug(f"작성자 추출 성공 ({selector}): {author}")
                            break
            except Exception as e:
                logger.debug(f"작성자 추출 실패: {e}")
            
            # 댓글 내용 추출 (다양한 셀렉터 시도)
            content = ''
            try:
                content_selectors = [
                    '.text_wrapper .text',  # 실제 구조
                    '.text',
                    '.comment_text',
                    '.content',
                    'td.text',
                    '.comment_content',
                    '.memo'
                ]
                
                for selector in content_selectors:
                    content_element = await comment_element.query_selector(selector)
                    if content_element:
                        content_text = await content_element.inner_text()
                        if content_text and content_text.strip():
                            content = content_text.strip()
                            logger.debug(f"댓글 내용 추출 성공 ({selector}): {content[:50]}...")
                            break
                
                # 내용이 없으면 전체 tr에서 텍스트 추출 시도
                if not content:
                    all_text = await comment_element.inner_text()
                    if all_text and all_text.strip():
                        # 작성자명과 시간 등을 제외한 실제 댓글 내용만 추출
                        lines = [line.strip() for line in all_text.split('\n') if line.strip()]
                        # 첫 번째 줄이 작성자, 마지막 줄이 시간일 가능성이 높음
                        if len(lines) > 2:
                            content = '\n'.join(lines[1:-1])  # 중간 부분이 실제 내용
                        elif len(lines) == 2:
                            content = lines[1]  # 두 번째 줄이 내용
                        logger.debug(f"전체 텍스트에서 내용 추출: {content[:50]}...")
                        
            except Exception as e:
                logger.debug(f"댓글 내용 추출 실패: {e}")
            
            # 작성 시간 추출 (다양한 셀렉터 시도)
            date = ''
            try:
                date_selectors = [
                    '.control_box .time',  # 실제 구조
                    '.time',
                    '.regdate',
                    '.date',
                    'td.time',
                    '.comment_time'
                ]
                
                for selector in date_selectors:
                    date_element = await comment_element.query_selector(selector)
                    if date_element:
                        date_text = await date_element.inner_text()
                        if date_text and date_text.strip():
                            date = date_text.strip()
                            logger.debug(f"작성시간 추출 성공 ({selector}): {date}")
                            break
                
                # 시간이 없으면 전체 텍스트에서 시간 패턴 찾기
                if not date:
                    all_text = await comment_element.inner_text()
                    import re
                    # 시간 패턴 찾기 (예: 25.06.03 04:13, 04:13, 2025.06.03 등)
                    time_patterns = [
                        r'\d{2}\.\d{2}\.\d{2}\s+\d{2}:\d{2}',  # 25.06.03 04:13
                        r'\d{4}\.\d{2}\.\d{2}\s+\d{2}:\d{2}',  # 2025.06.03 04:13
                        r'\d{2}:\d{2}',  # 04:13
                        r'\d+분\s*전',  # 25분 전
                        r'\d+시간\s*전',  # 2시간 전
                    ]
                    
                    for pattern in time_patterns:
                        match = re.search(pattern, all_text)
                        if match:
                            date = match.group(0)
                            logger.debug(f"패턴으로 시간 추출: {date}")
                            break
                            
            except Exception as e:
                logger.debug(f"작성시간 추출 실패: {e}")
            
            # 추천/비추천 수 추출 (다양한 셀렉터 시도)
            like_count = 0
            dislike_count = 0
            
            try:
                # 추천수 (다양한 셀렉터)
                like_selectors = [
                    '.btn_like .num',  # 실제 구조
                    '.like_count',
                    '.recommend',
                    '.btn_recommend .num',
                    'td.recommend'
                ]
                
                for selector in like_selectors:
                    like_element = await comment_element.query_selector(selector)
                    if like_element:
                        like_text = await like_element.inner_text()
                        if like_text and like_text.strip().isdigit():
                            like_count = int(like_text.strip())
                            logger.debug(f"추천수 추출 성공 ({selector}): {like_count}")
                            break
                
                # 비추천수 (다양한 셀렉터)
                dislike_selectors = [
                    '.btn_dislike .num',  # 실제 구조
                    '.dislike_count',
                    '.btn_unrecommend .num'
                ]
                
                for selector in dislike_selectors:
                    dislike_element = await comment_element.query_selector(selector)
                    if dislike_element:
                        dislike_text = await dislike_element.inner_text()
                        if dislike_text and dislike_text.strip().isdigit():
                            dislike_count = int(dislike_text.strip())
                            logger.debug(f"비추천수 추출 성공 ({selector}): {dislike_count}")
                            break
                            
            except Exception as e:
                logger.debug(f"추천/비추천수 추출 실패: {e}")
            
            # 내용이 없는 댓글은 제외하지 않고 디버깅 정보 출력
            if not content:
                logger.warning(f"⚠️ 댓글 내용이 없음 - ID: {comment_id}, 작성자: {author}")
                # 전체 HTML 구조 확인
                try:
                    comment_html = await comment_element.inner_html()
                    logger.debug(f"댓글 HTML 구조: {comment_html[:200]}...")
                except:
                    pass
                return None
            
            comment_data = {
                'id': comment_id,
                'author': author,
                'content': content,
                'date': date,
                'like_count': like_count,
                'dislike_count': dislike_count,
                'is_reply': is_reply,
                'is_best': is_best
            }
            
            logger.debug(f"✅ 댓글 추출 성공: {comment_data}")
            return comment_data
            
        except Exception as e:
            logger.warning(f"⚠️ 루리웹 개별 댓글 추출 실패: {e}")
            return None
    
    def parse_post_id_from_url(self, url: str) -> str:
        """
        URL에서 게시글 ID 추출 (루리웹 특화)
        
        기존 parse_post_id_from_url 로직 완전 활용
        """
        try:
            # 루리웹 URL 패턴: /read/숫자
            match = re.search(r'/read/(\d+)', url)
            if match:
                return match.group(1)
            
            # 다른 패턴들도 시도
            match = re.search(r'document_srl=(\d+)', url)
            if match:
                return match.group(1)
            
            return 'unknown'
            
        except Exception as e:
            logger.error(f"💥 루리웹 게시글 ID 추출 실패: {e}")
            return 'unknown'


# 편의 함수들
async def scrape_ruliweb_board_v2(board_url: str, criteria_count: int = 3) -> Dict[str, List[Dict]]:
    """루리웹 게시판 지표별 선별 스크래핑 편의 함수"""
    async with RuliwebScraper() as scraper:
        return await scraper.scrape_board_with_selection(board_url, criteria_count)


async def scrape_ruliweb_post_v2(post_url: str) -> Dict:
    """루리웹 게시글 상세 스크래핑 편의 함수"""
    async with RuliwebScraper() as scraper:
        return await scraper.scrape_post_detail(post_url) 
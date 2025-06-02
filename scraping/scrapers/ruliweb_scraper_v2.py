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
            
            # 카테고리
            try:
                category_element = await row_element.query_selector('td.divsn a')
                if category_element:
                    category_text = await category_element.inner_text()
                    post_info['category'] = category_text.strip()
            except:
                post_info['category'] = ''
            
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
        
        기존 extract_post_metadata 로직 완전 활용
        """
        try:
            metadata = {}
            
            # 제목 추출 (기존 로직)
            for selector in self.site_config.selectors['title']:
                try:
                    title_element = await self.page.query_selector(selector)
                    if title_element:
                        title = await title_element.inner_text()
                        metadata['title'] = title.strip()
                        break
                except:
                    continue
            
            # 카테고리 추출 (기존 로직)
            try:
                category_element = await self.page.query_selector('.category_text')
                if category_element:
                    category = await category_element.inner_text()
                    metadata['category'] = category.strip().replace('[', '').replace(']', '')
            except:
                pass
            
            # 작성자 추출 (기존 로직)
            for selector in self.site_config.selectors['author']:
                try:
                    author_element = await self.page.query_selector(selector)
                    if author_element:
                        author = await author_element.inner_text()
                        metadata['author'] = author.strip()
                        break
                except:
                    continue
            
            # 작성일 추출 (기존 로직)
            for selector in self.site_config.selectors['date']:
                try:
                    date_element = await self.page.query_selector(selector)
                    if date_element:
                        date_text = await date_element.inner_text()
                        metadata['created_at'] = date_text.strip()
                        metadata['date'] = date_text.strip()  # 테스트 호환성
                        break
                except:
                    continue
            
            # 추천수 추출 (기존 로직)
            try:
                like_element = await self.page.query_selector('.like_value, .recomd .good_high strong, .like strong')
                if like_element:
                    like_count = await like_element.inner_text()
                    like_count_int = int(like_count.strip()) if like_count.strip().isdigit() else 0
                    metadata['like_count'] = like_count_int
                    metadata['recommendations'] = like_count_int  # 테스트 호환성
                else:
                    metadata['like_count'] = 0
                    metadata['recommendations'] = 0
            except:
                metadata['like_count'] = 0
                metadata['recommendations'] = 0
            
            # 조회수 추출 (기존 로직)
            try:
                view_element = await self.page.query_selector('.hit strong, .hit_high strong')
                if view_element:
                    view_count = await view_element.inner_text()
                    view_count_int = int(view_count.strip()) if view_count.strip().isdigit() else 0
                    metadata['view_count'] = view_count_int
                    metadata['views'] = view_count_int  # 테스트 호환성
                else:
                    metadata['view_count'] = 0
                    metadata['views'] = 0
            except:
                metadata['view_count'] = 0
                metadata['views'] = 0
            
            # 댓글수 추출 (기존 로직)
            try:
                comment_element = await self.page.query_selector('.reply_count, .num strong')
                if comment_element:
                    comment_count = await comment_element.inner_text()
                    metadata['comment_count'] = int(comment_count.strip()) if comment_count.strip().isdigit() else 0
                else:
                    metadata['comment_count'] = 0
            except:
                metadata['comment_count'] = 0
            
            return metadata
            
        except Exception as e:
            logger.error(f"💥 루리웹 메타데이터 추출 실패: {e}")
            return {}
    
    async def extract_content_in_order(self) -> List[Dict]:
        """
        게시글 본문 내용 순서대로 추출 (루리웹 특화)
        
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
                        logger.info(f"✅ 루리웹 본문 컨테이너 발견: {selector}")
                        break
                except:
                    continue
            
            if not article_element:
                logger.warning("⚠️ 루리웹 게시글 본문 컨테이너를 찾을 수 없습니다.")
                return []
            
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
        댓글 데이터 추출 (루리웹 특화, 이미지 포함)
        
        기존 extract_comments_data 로직 완전 활용
        """
        try:
            comments = []
            
            # 댓글 컨테이너 확인
            comment_wrapper = await self.page.query_selector('#cmt, .comment_wrapper')
            if not comment_wrapper:
                logger.info("📝 루리웹 댓글이 없습니다.")
                return []
            
            # BEST 댓글 ID 수집 (중복 방지용)
            best_comment_ids = set()
            best_comments = await self.page.query_selector_all('.comment_table.best tr.comment_element')
            for best_comment in best_comments:
                try:
                    comment_id = await best_comment.get_attribute('id')
                    if comment_id:
                        best_comment_ids.add(comment_id.replace('ct_', ''))
                except:
                    continue
            
            # 일반 댓글 추출
            comment_elements = await self.page.query_selector_all('.comment_table tr.comment_element')
            
            for index, comment_element in enumerate(comment_elements):
                try:
                    comment_data = await self.extract_single_comment(comment_element, best_comment_ids, index)
                    if comment_data:
                        comments.append(comment_data)
                except Exception as e:
                    logger.warning(f"⚠️ 루리웹 댓글 추출 실패 (인덱스 {index}): {e}")
                    continue
            
            logger.info(f"✅ 루리웹 댓글 추출 완료: {len(comments)}개")
            return comments
            
        except Exception as e:
            logger.error(f"💥 루리웹 댓글 데이터 추출 실패: {e}")
            return []
    
    async def extract_single_comment(self, comment_element, best_comment_ids: set, index: int) -> Optional[Dict]:
        """
        개별 댓글 추출 (루리웹 특화, 이미지 포함)
        
        기존 extract_single_comment 로직 완전 활용
        """
        try:
            # 댓글 ID 추출
            comment_id = await comment_element.get_attribute('id')
            if comment_id:
                comment_id = comment_id.replace('ct_', '')
            else:
                comment_id = f'comment_{index}'
            
            # BEST 댓글 중복 제거
            if comment_id in best_comment_ids:
                return None
            
            # 작성자 정보 추출 (기존 로직)
            author = ''
            try:
                user_element = await comment_element.query_selector('.user, .user_inner_wrapper')
                if user_element:
                    nick_element = await user_element.query_selector('.nick a, .nick_link')
                    if nick_element:
                        author_text = await nick_element.inner_text()
                        author = author_text.strip()
            except:
                pass
            
            # 댓글 내용 추출 (이미지 포함, 기존 로직)
            content = ''
            images = []
            
            try:
                text_wrapper = await comment_element.query_selector('.text_wrapper, .comment')
                if text_wrapper:
                    # 텍스트 내용 추출
                    text_element = await text_wrapper.query_selector('.text')
                    if text_element:
                        content_text = await text_element.inner_text()
                        content = content_text.strip()
                    
                    # 이미지 추출 (루리웹 댓글 이미지 특화)
                    img_elements = await text_wrapper.query_selector_all('img.comment_img, .inline_block img')
                    for img_element in img_elements:
                        try:
                            img_src = await img_element.get_attribute('src')
                            if img_src:
                                # 절대 URL로 변환
                                img_src = self.make_absolute_url(img_src)
                                images.append(img_src)
                        except Exception as e:
                            logger.debug(f"댓글 이미지 추출 중 오류: {e}")
                            continue
            except:
                pass
            
            # 댓글 메타정보 추출 (기존 로직)
            created_at = ''
            like_count = 0
            dislike_count = 0
            
            try:
                control_box = await comment_element.query_selector('.control_box, .parent_control_box_wrapper')
                if control_box:
                    # 작성시간
                    time_element = await control_box.query_selector('.time')
                    if time_element:
                        time_text = await time_element.inner_text()
                        created_at = time_text.strip()
                    
                    # 추천수
                    like_element = await control_box.query_selector('.btn_like .num')
                    if like_element:
                        like_text = await like_element.inner_text()
                        if like_text.strip().isdigit():
                            like_count = int(like_text.strip())
            except:
                pass
            
            # BEST 댓글 여부 확인 (기존 로직)
            is_best = False
            try:
                best_element = await comment_element.query_selector('.icon_best')
                is_best = bool(best_element)
            except:
                pass
            
            return {
                'comment_id': comment_id,
                'author': author,
                'content': content,
                'images': images,  # 루리웹 특화: 댓글 이미지 포함
                'created_at': created_at,
                'date': created_at,  # 테스트 호환성
                'like_count': like_count,
                'dislike_count': dislike_count,
                'is_best': is_best,
                'index': index
            }
            
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
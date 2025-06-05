# 목차
# 1. 모듈 임포트 및 설정 (1-25)
# 2. 스키마 정의 (26-150)
# 3. 셀렉터 정의 (151-220)
# 4. 유틸리티 함수 (221-320)
# 5. 브라우저 관리 (321-380)
# 6. 데이터 추출 함수 (381-580)
# 7. 게시글 목록 관련 함수 (581-680)
# 8. 메인 스크래퍼 클래스 (681-800)
# 9. MongoDB 연동 (801-850)
# 10. 메인 실행 함수들 (851-950)
# 11. API 전송 함수 (951-980)

import asyncio
import json
import re
import time
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from urllib.parse import urljoin, urlparse
import requests

import pytz
from playwright.async_api import Browser, Page, ElementHandle, async_playwright
from pymongo import MongoClient
from pymongo.collection import Collection
import jsonschema

# JSON 스키마 정의 (기존 수정된 스키마 유지)
POST_SCHEMA = {
    "type": "object",
    "properties": {
        "post_id": {"type": "string"},
        "post_url": {"type": "string"},
        "metadata": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "author": {"type": "string"},
                "date": {"type": "string"},
                "view_count": {"type": "integer"},
                "up_count": {"type": "integer"},
                "down_count": {"type": "integer"},
                "comment_count": {"type": "integer"},
                "category": {"type": "string"}
            },
            "required": ["title", "author", "date", "view_count", "up_count", "down_count", "comment_count"]
        },
        "content": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {"enum": ["text", "image", "video"]},
                    "order": {"type": "integer"},
                    "data": {
                        "type": "object",
                        "properties": {
                            "text": {"type": "string"},
                            "src": {"type": "string"},
                            "href": {"type": "string"},
                            "alt": {"type": "string"},
                            "width": {"type": "string"},
                            "height": {"type": "string"},
                            "autoplay": {"type": "boolean"},
                            "muted": {"type": "boolean"}
                        }
                    }
                },
                "required": ["type", "order", "data"]
            }
        },
        "comments": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "comment_id": {"type": "string"},
                    "content": {"type": "string"},
                    "author": {"type": "string"},
                    "date": {"type": "string"},
                    "media": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "type": {"enum": ["image", "video"]},
                                "order": {"type": "integer"},
                                "data": {
                                    "type": "object",
                                    "properties": {
                                        "src": {"type": "string"},
                                        "href": {"type": "string"},
                                        "alt": {"type": "string"},
                                        "width": {"type": "string"},
                                        "height": {"type": "string"},
                                        "autoplay": {"type": "boolean"},
                                        "muted": {"type": "boolean"}
                                    }
                                }
                            },
                            "required": ["type", "order", "data"]
                        }
                    },
                    "level": {"type": "integer"},
                    "is_reply": {"type": "boolean"},
                    "parent_comment_id": {"type": "string"},
                    "up_count": {"type": "integer"},
                    "down_count": {"type": "integer"}
                },
                "required": ["comment_id", "content", "author", "date", "media", "level", "is_reply", "parent_comment_id", "up_count", "down_count"]
            }
        },
        "scraped_at": {"type": "string"}
    },
    "required": ["post_id", "post_url", "metadata", "content", "comments", "scraped_at"]
}

# 게시글 목록 스키마
POST_LIST_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "post_id": {"type": "string"},
            "url": {"type": "string"},
            "title": {"type": "string"},
            "author": {"type": "string"},
            "date": {"type": "string"},
            "up_count": {"type": "integer"},
            "down_count": {"type": "integer"},
            "comment_count": {"type": "integer"},
            "view_count": {"type": "integer"}
        },
        "required": ["post_id", "url", "title", "date", "up_count", "down_count", "comment_count", "view_count"]
    }
}

# FMKorea 셀렉터 정의 (수정됨)
FMKOREA_SELECTORS = {
    "metadata": {
        # 게시글 제목
        "title": "h1.np_18px .np_18px_span",
        # 작성자
        "author": ".btm_area .side a.member_plate",
        # 작성일
        "date": ".top_area .date",
        # 조회수 - 더 구체적인 셀렉터 사용
        "view_count": ".btm_area .side.fr span:nth-child(1) b",
        # 추천수 - 더 구체적인 셀렉터 사용
        "up_count": ".btm_area .side.fr span:nth-child(2) b",
        # 비추천수 (FMKorea는 비추천이 없으므로 0으로 설정)
        "down_count": None,
        # 댓글수 - 더 구체적인 셀렉터 사용
        "comment_count": ".btm_area .side.fr span:nth-child(3) b",
        # 카테고리
        "category": ".cate a"
    },
    "content": {
        # 본문 컨테이너 (실제 확인된 셀렉터)
        "container": ".xe_content",
        # 텍스트 요소
        "text": "p:not(:has(img)):not(:has(a.highslide))",
        # 이미지 요소
        "image": "img, a.highslide img",
        # 비디오 요소 (FMKorea는 주로 이미지 위주)
        "video": "video"
    },
    "comments": {
        # 댓글 컨테이너 (실제 확인된 셀렉터)
        "container": "li[class*='comment']",
        # 댓글 ID (li 요소의 id 속성)
        "comment_id": "[id^='comment_']",
        # 댓글 내용 (더 정확한 셀렉터 필요)
        "content": ".xe_content, .comment_content",
        # 댓글 작성자
        "author": "a.member_plate",
        # 댓글 작성일
        "date": ".date",
        # 댓글 미디어 (이미지/비디오)
        "media": "img, video",
        # 댓글 레벨 (FMKorea는 대댓글 구조가 단순)
        "level": None,
        # 대댓글 여부
        "is_reply": None,
        # 부모 댓글 ID
        "parent_comment_id": None,
        # 댓글 추천수
        "up_count": ".vote .voted_count",
        # 댓글 비추천수
        "down_count": ".vote .blamed_count"
    },
    "post_list": {
        # 게시글 목록 컨테이너
        "container": "table.bd_lst tbody tr",
        # 제목 및 URL
        "title_link": "td.title a",
        # 작성자
        "author": "td.author a.member_plate",
        # 작성일
        "date": "td.time",
        # 조회수
        "view_count": "td.m_no:nth-last-child(2)",
        # 추천수
        "up_count": "td.m_no:last-child",
        # 댓글수 (제목에서 추출)
        "comment_count_in_title": "td.title .comment_count"
    },
    "pagination": {
        # 이전 페이지
        "prev_page": ".pagination a[title='이전 페이지']",
        # 다음 페이지
        "next_page": ".pagination a[title='다음 페이지']"
    }
}

# 유틸리티 함수들
def parse_post_id(url: str) -> str:
    """URL에서 게시글 ID 추출"""
    # FMKorea URL 패턴: https://www.fmkorea.com/8475910237
    parsed = urlparse(url)
    post_id = parsed.path.strip('/')
    return post_id

def validate_data(data: Dict, schema: Dict) -> bool:
    """JSON Schema로 데이터 유효성 검사"""
    try:
        jsonschema.validate(data, schema)
        return True
    except jsonschema.ValidationError as e:
        print(f"데이터 검증 실패: {e}")
        return False

def clean_text(text: str) -> str:
    """텍스트 정리 (공백, 특수문자 제거)"""
    if not text:
        return ""
    return re.sub(r'\s+', ' ', text.strip())

def parse_number(text: str) -> int:
    """문자열에서 숫자 추출"""
    if not text:
        return 0
    # 숫자만 추출
    numbers = re.findall(r'\d+', text.replace(',', ''))
    return int(numbers[0]) if numbers else 0

def parse_date(date_str: str) -> str:
    """날짜 문자열 파싱 및 ISO 형식으로 변환"""
    if not date_str:
        return datetime.now(pytz.timezone('Asia/Seoul')).isoformat()
    
    # FMKorea 날짜 형식: "2025.06.04 15:26" 또는 "15:27"
    date_str = clean_text(date_str)
    
    try:
        if ':' in date_str and '.' not in date_str:
            # 시간만 있는 경우 (오늘 날짜로 가정)
            today = datetime.now(pytz.timezone('Asia/Seoul')).date()
            time_str = date_str
            datetime_str = f"{today.strftime('%Y.%m.%d')} {time_str}"
        else:
            datetime_str = date_str
            
        # 날짜 파싱
        dt = datetime.strptime(datetime_str, '%Y.%m.%d %H:%M')
        dt = pytz.timezone('Asia/Seoul').localize(dt)
        return dt.isoformat()
    except ValueError:
        # 파싱 실패 시 현재 시간 반환
        return datetime.now(pytz.timezone('Asia/Seoul')).isoformat()

def is_within_time_range(date_str: str, start_hour: int, end_hour: int, timezone: str = "Asia/Seoul") -> bool:
    """게시글 작성 시간이 특정 시간대인지 확인"""
    try:
        if not date_str:
            return False
            
        # ISO 형식 날짜 파싱
        if 'T' in date_str:
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        else:
            # 다른 형식 시도
            dt = datetime.strptime(date_str, '%Y.%m.%d %H:%M')
            dt = pytz.timezone(timezone).localize(dt)
            
        # 시간대 변환
        if dt.tzinfo is None:
            dt = pytz.timezone(timezone).localize(dt)
        else:
            dt = dt.astimezone(pytz.timezone(timezone))
            
        hour = dt.hour
        return start_hour <= hour < end_hour
    except Exception as e:
        print(f"시간 범위 확인 오류: {e}")
        return False

def select_top_posts(posts: List[Dict]) -> List[Dict]:
    """추천수 상위 3개, 댓글수 상위 3개(추천수 제외), 조회수 상위 3개(추천수/댓글수 제외) 선별"""
    if not posts:
        return []
    
    # 추천수 상위 3개
    top_up_posts = sorted(posts, key=lambda x: x.get('up_count', 0), reverse=True)[:3]
    selected_posts = top_up_posts.copy()
    
    # 댓글수 상위 3개 (추천수 상위 제외)
    remaining_posts = [post for post in posts if post not in selected_posts]
    top_comment_posts = sorted(remaining_posts, key=lambda x: x.get('comment_count', 0), reverse=True)[:3]
    selected_posts.extend(top_comment_posts)
    
    # 조회수 상위 3개 (추천수/댓글수 상위 제외)
    remaining_posts = [post for post in posts if post not in selected_posts]
    top_view_posts = sorted(remaining_posts, key=lambda x: x.get('view_count', 0), reverse=True)[:3]
    selected_posts.extend(top_view_posts)
    
    return selected_posts

# 브라우저 관리 함수들
async def setup_browser(config: Optional[Dict] = None) -> Tuple[Browser, Page]:
    """브라우저 초기화"""
    if config is None:
        config = {}
        
    playwright = await async_playwright().start()
    browser = await playwright.chromium.launch(
        headless=config.get('headless', True),
        slow_mo=config.get('slow_mo', 0)
    )
    page = await browser.new_page()
    
    # User-Agent 설정
    await page.set_extra_http_headers({
        'User-Agent': config.get('user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
    })
    
    return browser, page

async def close_browser(browser: Browser):
    """브라우저 종료"""
    await browser.close()

async def navigate_to_page(page: Page, url: str, config: Optional[Dict] = None) -> bool:
    """페이지 이동"""
    if config is None:
        config = {}
        
    try:
        await page.goto(url, 
                       wait_until=config.get('wait_until', 'networkidle'), 
                       timeout=config.get('timeout', 30000))
        
        # 추가 대기 시간
        if config.get('wait_time', 0) > 0:
            await asyncio.sleep(config['wait_time'])
            
        return True
    except Exception as e:
        print(f"페이지 이동 실패: {e}")
        return False

# 데이터 추출 함수들
async def extract_text_content(element: ElementHandle) -> str:
    """요소에서 텍스트 추출"""
    try:
        text = await element.text_content()
        return clean_text(text) if text else ""
    except Exception:
        return ""

async def extract_attribute(element: ElementHandle, attr: str) -> str:
    """요소에서 속성값 추출"""
    try:
        value = await element.get_attribute(attr)
        return value if value else ""
    except Exception:
        return ""

# 게시글 목록 관련 함수들
async def extract_post_list(page: Page, selectors: Dict) -> List[Dict]:
    """게시글 목록 추출"""
    posts = []
    post_selectors = selectors.get("post_list", {})
    
    try:
        # 게시글 목록 컨테이너들 찾기
        post_elements = await page.query_selector_all(post_selectors.get("container", ""))
        
        for element in post_elements:
            post_data = {}
            
            # 제목 및 URL 추출
            title_link_element = await element.query_selector(post_selectors.get("title_link", ""))
            if title_link_element:
                title = await extract_text_content(title_link_element)
                url = await extract_attribute(title_link_element, "href")
                
                # 상대 URL을 절대 URL로 변환
                if url and url.startswith('/'):
                    url = "https://www.fmkorea.com" + url
                    
                post_data["title"] = clean_text(title)
                post_data["url"] = url
                post_data["post_id"] = parse_post_id(url) if url else ""
            else:
                continue  # 제목이 없으면 스킵
                
            # 작성자 추출
            author_element = await element.query_selector(post_selectors.get("author", ""))
            if author_element:
                post_data["author"] = await extract_text_content(author_element)
            else:
                post_data["author"] = ""
                
            # 작성일 추출
            date_element = await element.query_selector(post_selectors.get("date", ""))
            if date_element:
                date_text = await extract_text_content(date_element)
                post_data["date"] = parse_date(date_text)
            else:
                post_data["date"] = datetime.now(pytz.timezone('Asia/Seoul')).isoformat()
                
            # 조회수 추출
            view_element = await element.query_selector(post_selectors.get("view_count", ""))
            if view_element:
                view_text = await extract_text_content(view_element)
                post_data["view_count"] = parse_number(view_text)
            else:
                post_data["view_count"] = 0
                
            # 추천수 추출
            up_element = await element.query_selector(post_selectors.get("up_count", ""))
            if up_element:
                up_text = await extract_text_content(up_element)
                post_data["up_count"] = parse_number(up_text)
            else:
                post_data["up_count"] = 0
                
            # 비추천수 (FMKorea는 없음)
            post_data["down_count"] = 0
            
            # 댓글수 추출 (제목에서 추출하거나 별도 요소에서)
            comment_element = await element.query_selector(post_selectors.get("comment_count_in_title", ""))
            if comment_element:
                comment_text = await extract_text_content(comment_element)
                post_data["comment_count"] = parse_number(comment_text)
            else:
                # 제목에서 댓글수 추출 시도
                title_text = post_data.get("title", "")
                comment_match = re.search(r'\[(\d+)\]', title_text)
                post_data["comment_count"] = int(comment_match.group(1)) if comment_match else 0
                
            posts.append(post_data)
            
    except Exception as e:
        print(f"게시글 목록 추출 오류: {e}")
        
    return posts

async def scrape_and_select_page_posts(community: str, page_url: str, config: Optional[Dict] = None) -> List[Dict]:
    """특정 페이지의 게시글 목록 스크래핑 후 선별"""
    if config is None:
        config = {}
        
    selectors = FMKOREA_SELECTORS  # FMKorea 전용
    browser, page = await setup_browser(config)
    
    try:
        success = await navigate_to_page(page, page_url, config)
        if not success:
            return []
            
        posts = await extract_post_list(page, selectors)
        return select_top_posts(list(reversed(posts)))  # 역순으로 선별 (오래된 게시글 먼저)
    finally:
        await close_browser(browser)

class FMKoreaScraper:
    """FMKorea 스크래퍼 클래스"""
    
    def __init__(self):
        self.selectors = FMKOREA_SELECTORS
        self.schema = POST_SCHEMA
        
    async def extract_metadata(self, page: Page) -> Dict:
        """메타데이터 추출 (개선된 버전)"""
        metadata = {}
        selectors = self.selectors["metadata"]
        
        try:
            # 제목 추출
            title_element = await page.query_selector(selectors["title"])
            if title_element:
                metadata["title"] = await extract_text_content(title_element)
            else:
                metadata["title"] = ""
                
            # 작성자 추출
            author_element = await page.query_selector(selectors["author"])
            if author_element:
                metadata["author"] = await extract_text_content(author_element)
            else:
                metadata["author"] = ""
                
            # 작성일 추출
            date_element = await page.query_selector(selectors["date"])
            if date_element:
                date_text = await extract_text_content(date_element)
                metadata["date"] = parse_date(date_text)
            else:
                metadata["date"] = datetime.now(pytz.timezone('Asia/Seoul')).isoformat()
                
            # 조회수, 추천수, 댓글수를 텍스트로 찾기
            side_fr_element = await page.query_selector(".btm_area .side.fr")
            if side_fr_element:
                side_text = await extract_text_content(side_fr_element)
                
                # 조회수 추출 (예: "조회 수 294")
                view_match = re.search(r'조회\s*수\s*(\d+)', side_text)
                metadata["view_count"] = int(view_match.group(1)) if view_match else 0
                
                # 추천수 추출 (예: "추천 수 4")
                up_match = re.search(r'추천\s*수\s*(\d+)', side_text)
                metadata["up_count"] = int(up_match.group(1)) if up_match else 0
                
                # 댓글수 추출 (예: "댓글 2")
                comment_match = re.search(r'댓글\s*(\d+)', side_text)
                metadata["comment_count"] = int(comment_match.group(1)) if comment_match else 0
            else:
                metadata["view_count"] = 0
                metadata["up_count"] = 0
                metadata["comment_count"] = 0
                
            # 비추천수 (FMKorea는 없음)
            metadata["down_count"] = 0
                
            # 카테고리 추출
            category_element = await page.query_selector(selectors["category"])
            if category_element:
                metadata["category"] = await extract_text_content(category_element)
            else:
                metadata["category"] = ""
                
        except Exception as e:
            print(f"메타데이터 추출 오류: {e}")
            # 기본값으로 채우기
            metadata = {
                "title": "",
                "author": "",
                "date": datetime.now(pytz.timezone('Asia/Seoul')).isoformat(),
                "view_count": 0,
                "up_count": 0,
                "down_count": 0,
                "comment_count": 0,
                "category": ""
            }
            
        return metadata
        
    async def extract_content(self, page: Page) -> List[Dict]:
        """본문 콘텐츠 추출 (개선된 버전)"""
        content = []
        selectors = self.selectors["content"]
        order = 0
        
        try:
            # 본문 컨테이너 찾기
            container = await page.query_selector(selectors["container"])
            if not container:
                print("❌ 본문 컨테이너를 찾을 수 없습니다.")
                return content
                
            print("🔍 본문 콘텐츠 추출 중...")
            
            # 모든 하위 요소를 순서대로 처리
            all_elements = await container.query_selector_all("*")
            
            for element in all_elements:
                tag_name = await element.evaluate("el => el.tagName.toLowerCase()")
                
                # 텍스트 요소 처리 (p, div 태그)
                if tag_name in ['p', 'div']:
                    # 이미지나 링크만 포함된 요소는 제외
                    text = await extract_text_content(element)
                    if text and text.strip():
                        # 하위에 이미지가 있는지 확인
                        img_elements = await element.query_selector_all("img")
                        if len(img_elements) == 0:  # 이미지가 없는 텍스트만
                            content.append({
                                "type": "text",
                                "order": order,
                                "data": {"text": text.strip()}
                            })
                            order += 1
                            print(f"  📝 텍스트 추가: {text[:50]}...")
                
                # 이미지 요소 처리
                elif tag_name == 'img':
                    src = await extract_attribute(element, "src")
                    alt = await extract_attribute(element, "alt")
                    width = await extract_attribute(element, "width")
                    height = await extract_attribute(element, "height")
                    
                    if src:
                        # 상대 URL을 절대 URL로 변환
                        if src.startswith("//"):
                            src = "https:" + src
                        elif src.startswith("/"):
                            src = "https://www.fmkorea.com" + src
                            
                        content.append({
                            "type": "image",
                            "order": order,
                            "data": {
                                "src": src,
                                "alt": alt or f"image_{order}",
                                "width": width or "",
                                "height": height or ""
                            }
                        })
                        order += 1
                        print(f"  🖼️ 이미지 추가: {src}")
                
                # 비디오 요소 처리
                elif tag_name == 'video':
                    src = await extract_attribute(element, "src")
                    autoplay = await extract_attribute(element, "autoplay")
                    muted = await extract_attribute(element, "muted")
                    
                    if src:
                        content.append({
                            "type": "video",
                            "order": order,
                            "data": {
                                "src": src,
                                "autoplay": autoplay == "true" or autoplay == "",
                                "muted": muted == "true" or muted == ""
                            }
                        })
                        order += 1
                        print(f"  🎥 비디오 추가: {src}")
            
            # 만약 위 방법으로 콘텐츠를 찾지 못했다면 직접 p 태그들 검색
            if len(content) == 0:
                print("🔄 대체 방법으로 콘텐츠 추출 시도...")
                p_elements = await container.query_selector_all("p")
                
                for element in p_elements:
                    text = await extract_text_content(element)
                    if text and text.strip():
                        content.append({
                            "type": "text",
                            "order": order,
                            "data": {"text": text.strip()}
                        })
                        order += 1
                        print(f"  📝 텍스트 추가 (대체): {text[:50]}...")
                
                # 이미지도 별도로 검색
                img_elements = await container.query_selector_all("img")
                for element in img_elements:
                    src = await extract_attribute(element, "src")
                    alt = await extract_attribute(element, "alt")
                    
                    if src:
                        if src.startswith("//"):
                            src = "https:" + src
                        elif src.startswith("/"):
                            src = "https://www.fmkorea.com" + src
                            
                        content.append({
                            "type": "image",
                            "order": order,
                            "data": {
                                "src": src,
                                "alt": alt or f"image_{order}",
                                "width": "",
                                "height": ""
                            }
                        })
                        order += 1
                        print(f"  🖼️ 이미지 추가 (대체): {src}")
                    
        except Exception as e:
            print(f"본문 콘텐츠 추출 오류: {e}")
            
        print(f"📄 총 {len(content)}개 콘텐츠 요소 추출 완료")
        return content
        
    async def extract_comments(self, page: Page) -> List[Dict]:
        """댓글 추출 (개선된 버전)"""
        comments = []
        selectors = self.selectors["comments"]
        
        try:
            # 댓글 컨테이너들 찾기 (실제 확인된 셀렉터 사용)
            comment_elements = await page.query_selector_all(selectors["container"])
            print(f"🔍 댓글 요소 {len(comment_elements)}개 발견")
            
            for i, element in enumerate(comment_elements):
                comment_data = {}
                
                # 댓글 ID 추출 (li 요소의 id 속성에서)
                comment_id_attr = await extract_attribute(element, "id")
                if comment_id_attr:
                    comment_data["comment_id"] = comment_id_attr
                else:
                    comment_data["comment_id"] = f"comment_{i}"
                    
                # 댓글 내용 추출 (여러 셀렉터 시도)
                content_text = ""
                content_selectors = [".xe_content", ".comment_content", "div"]
                
                for content_sel in content_selectors:
                    content_element = await element.query_selector(content_sel)
                    if content_element:
                        temp_text = await extract_text_content(content_element)
                        if temp_text and temp_text.strip():
                            content_text = temp_text
                            break
                
                # 만약 위 방법으로 찾지 못하면 전체 텍스트에서 추출
                if not content_text:
                    full_text = await extract_text_content(element)
                    # 작성자명과 날짜를 제외한 실제 댓글 내용 추출
                    lines = full_text.split('\n')
                    for line in lines:
                        line = line.strip()
                        if line and not any(keyword in line for keyword in ['분 전', '시간 전', '일 전', '월 전']):
                            # 첫 번째 의미있는 라인을 댓글 내용으로 사용
                            if len(line) > 2:  # 너무 짧은 텍스트 제외
                                content_text = line
                                break
                
                comment_data["content"] = content_text
                    
                # 댓글 작성자 추출
                author_element = await element.query_selector(selectors["author"])
                if author_element:
                    comment_data["author"] = await extract_text_content(author_element)
                else:
                    # 전체 텍스트에서 작성자 추출 시도
                    full_text = await extract_text_content(element)
                    lines = full_text.split('\n')
                    # 보통 첫 번째나 두 번째 라인에 작성자명이 있음
                    for line in lines[:3]:
                        line = line.strip()
                        if line and len(line) < 20 and not any(char in line for char in ['분', '시간', '일', '월']):
                            comment_data["author"] = line
                            break
                    if "author" not in comment_data:
                        comment_data["author"] = ""
                    
                # 댓글 작성일 추출
                date_element = await element.query_selector(selectors["date"])
                if date_element:
                    date_text = await extract_text_content(date_element)
                    comment_data["date"] = parse_date(date_text)
                else:
                    # 전체 텍스트에서 날짜 추출 시도
                    full_text = await extract_text_content(element)
                    date_match = re.search(r'(\d+)\s*(분|시간|일|월)\s*전', full_text)
                    if date_match:
                        comment_data["date"] = datetime.now(pytz.timezone('Asia/Seoul')).isoformat()
                    else:
                        comment_data["date"] = datetime.now(pytz.timezone('Asia/Seoul')).isoformat()
                    
                # 댓글 미디어 추출
                media_elements = await element.query_selector_all(selectors["media"])
                media_list = []
                for j, media_element in enumerate(media_elements):
                    tag_name = await media_element.evaluate("element => element.tagName.toLowerCase()")
                    src = await extract_attribute(media_element, "src")
                    
                    if src:
                        media_type = "image" if tag_name == "img" else "video"
                        media_list.append({
                            "type": media_type,
                            "order": j,
                            "data": {"src": src}
                        })
                        
                comment_data["media"] = media_list
                
                # FMKorea는 단순한 댓글 구조
                comment_data["level"] = 1
                comment_data["is_reply"] = False
                comment_data["parent_comment_id"] = ""
                
                # 댓글 추천/비추천수 추출
                up_element = await element.query_selector(selectors["up_count"])
                if up_element:
                    up_text = await extract_text_content(up_element)
                    comment_data["up_count"] = parse_number(up_text)
                else:
                    comment_data["up_count"] = 0
                    
                down_element = await element.query_selector(selectors["down_count"])
                if down_element:
                    down_text = await extract_text_content(down_element)
                    comment_data["down_count"] = parse_number(down_text)
                else:
                    comment_data["down_count"] = 0
                
                # 유효한 댓글만 추가 (내용이 있는 경우)
                if comment_data["content"].strip():
                    comments.append(comment_data)
                    print(f"  ✅ 댓글 {i+1}: {comment_data['author']} - {comment_data['content'][:30]}...")
                
        except Exception as e:
            print(f"댓글 추출 오류: {e}")
            
        print(f"📝 총 {len(comments)}개 댓글 추출 완료")
        return comments
        
    async def scrape_post(self, url: str, config: Optional[Dict] = None) -> Dict:
        """게시글 스크래핑"""
        if config is None:
            config = {}
            
        browser, page = await setup_browser(config)
        
        try:
            # 페이지 이동
            success = await navigate_to_page(page, url, config)
            if not success:
                raise Exception("페이지 이동 실패")
                
            # 데이터 추출
            post_id = parse_post_id(url)
            metadata = await self.extract_metadata(page)
            content = await self.extract_content(page)
            comments = await self.extract_comments(page)
            
            # 결과 구성
            result = {
                "post_id": post_id,
                "post_url": url,
                "metadata": metadata,
                "content": content,
                "comments": comments,
                "scraped_at": datetime.now(pytz.timezone('Asia/Seoul')).isoformat()
            }
            
            # 데이터 검증
            if validate_data(result, self.schema):
                return result
            else:
                print("데이터 검증 실패, 기본 구조로 반환")
                return result
                
        except Exception as e:
            print(f"스크래핑 오류: {e}")
            return {}
        finally:
            await close_browser(browser)

# MongoDB 연동 함수들
async def connect_mongodb(connection_string: str, db_name: str, collection_name: str) -> Collection:
    """MongoDB 연결"""
    try:
        client = MongoClient(connection_string)
        db = client[db_name]
        collection = db[collection_name]
        return collection
    except Exception as e:
        print(f"MongoDB 연결 실패: {e}")
        raise

async def save_to_mongodb(collection: Collection, data: Dict) -> str:
    """MongoDB에 데이터 저장"""
    try:
        result = collection.insert_one(data)
        return str(result.inserted_id)
    except Exception as e:
        print(f"MongoDB 저장 실패: {e}")
        raise

# 메인 실행 함수들
async def scrape_and_save_page_posts(community: str, page_url: str, config: Optional[Dict] = None, mongo_config: Optional[Dict] = None) -> List[Dict]:
    """메인 실행 함수 (특정 페이지) - 특정 페이지 게시글 목록 스크래핑, 선별, 상세 스크래핑 및 저장"""
    if config is None:
        config = {}
        
    print(f"🔍 {community} 페이지 스크래핑 시작: {page_url}")
    
    # 1. 게시글 목록 스크래핑 및 선별
    selected_posts = await scrape_and_select_page_posts(community, page_url, config)
    print(f"📋 선별된 게시글 수: {len(selected_posts)}")
    
    if not selected_posts:
        print("❌ 선별된 게시글이 없습니다.")
        return []
    
    # 2. 각 게시글 상세 스크래핑
    results = []
    scraper = FMKoreaScraper()
    
    for i, post in enumerate(selected_posts, 1):
        print(f"📄 게시글 {i}/{len(selected_posts)} 스크래핑 중: {post.get('title', 'N/A')}")
        
        try:
            scraped_data = await scraper.scrape_post(post["url"], config)
            if scraped_data:
                results.append(scraped_data)
                print(f"✅ 성공: {scraped_data.get('metadata', {}).get('title', 'N/A')}")
            else:
                print(f"❌ 실패: {post.get('title', 'N/A')}")
        except Exception as e:
            print(f"❌ 오류: {e}")
            
        # 요청 간 간격 (서버 부하 방지)
        if i < len(selected_posts):
            await asyncio.sleep(config.get('delay_between_requests', 2))
    
    # 3. 결과 저장 (파일 + API)
    timestamp = int(time.time())
    file_name = f"fmkorea-page-scraping-{timestamp}.json"
    
    # 파일 저장
    with open(file_name, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"💾 결과가 {file_name}에 저장되었습니다.")
    
    # API로 데이터 전송
    api_url = config.get('api_url', 'http://localhost:3000/api/scraper-data')
    if results:
        print(f"🌐 API로 데이터 전송 중: {api_url}")
        try:
            response = requests.post(api_url, json=results, timeout=10)
            if response.status_code == 200:
                print(f"✅ API 전송 성공: {len(results)}개 게시글")
            else:
                print(f"❌ API 전송 실패: {response.status_code}")
        except Exception as e:
            print(f"❌ API 전송 오류: {e}")
    
    print(f"📊 최종 결과: {len(results)}/{len(selected_posts)} 성공")
    
    return results

# 간단한 실행 함수
async def scrape_fmkorea_politics_page(config: Optional[Dict] = None) -> List[Dict]:
    """FMKorea 정치 게시판 첫 페이지 스크래핑"""
    page_url = "https://www.fmkorea.com/politics"
    return await scrape_and_save_page_posts("fmkorea", page_url, config)

# API 전송 함수
async def send_to_api(data: Dict, api_url: str) -> bool:
    """API를 통해 데이터 전송"""
    try:
        response = requests.post(api_url, json=data)
        return response.status_code == 200
    except Exception as e:
        print(f"API 전송 실패: {e}")
        return False 
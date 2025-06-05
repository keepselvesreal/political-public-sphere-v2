# 목차
# 1. 모듈 임포트 및 설정 (1-25)
# 2. Chrome 브라우저 설정 (26-80)
# 3. 스키마 정의 (81-200)
# 4. 셀렉터 정의 (201-270)
# 5. 유틸리티 함수 (271-370)
# 6. Chrome 브라우저 관리 (371-450)
# 7. 데이터 추출 함수 (451-650)
# 8. 게시글 목록 관련 함수 (651-750)
# 9. 메인 스크래퍼 클래스 (751-900)
# 10. 메인 실행 함수들 (901-1000)

import asyncio
import json
import re
import time
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
from urllib.parse import urljoin, urlparse
import requests
import os

import pytz
from playwright.async_api import Browser, Page, ElementHandle, async_playwright
import jsonschema

# Chrome 브라우저 설정 클래스
class ChromeBrowserConfig:
    """Chrome 브라우저 전용 설정"""
    
    def __init__(self):
        # 실제 Chrome User-Agent들
        self.user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]
        
        # Chrome 브라우저 실행 옵션
        self.chrome_args = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-images',  # 이미지 로딩 비활성화로 속도 향상
            '--disable-javascript',  # 필요시 활성화
            '--window-size=1920,1080',
            '--start-maximized'
        ]
        
        # Chrome 채널 옵션 (Playwright에서 지원하는 Chrome 채널)
        self.chrome_channels = ['chrome', 'chrome-beta', 'chrome-dev', 'chrome-canary', 'msedge', 'msedge-beta', 'msedge-dev']
        
    def get_chrome_config(self, headless: bool = True) -> Dict:
        """Chrome 브라우저 설정 반환"""
        return {
            'headless': headless,
            'args': self.chrome_args,
            'channel': 'chrome',  # 실제 Chrome 사용
            'ignore_default_args': ['--enable-automation'],
            'slow_mo': 1000,  # 1초 지연으로 자연스러운 동작
        }

# JSON 스키마 정의 (기존과 동일)
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
                    "media": {"type": "array"},
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

# FMKorea 셀렉터 정의 (기존과 동일)
FMKOREA_SELECTORS = {
    "metadata": {
        "title": "h1.np_18px .np_18px_span",
        "author": ".btm_area .side a.member_plate",
        "date": ".top_area .date",
        "view_count": ".btm_area .side.fr span:nth-child(1) b",
        "up_count": ".btm_area .side.fr span:nth-child(2) b",
        "down_count": None,
        "comment_count": ".btm_area .side.fr span:nth-child(3) b",
        "category": ".cate a"
    },
    "content": {
        "container": ".xe_content",
        "text": "p:not(:has(img)):not(:has(a.highslide))",
        "image": "img, a.highslide img",
        "video": "video"
    },
    "comments": {
        "container": "ul.fdb_lst_ul li.fdb_itm",
        "comment_id": "[id^='comment_']",
        "content": ".comment-content .xe_content",
        "author": ".meta a.member_plate",
        "date": ".meta .date",
        "media": ".comment-content img, .comment-content video",
        "level": None,
        "is_reply": None,
        "parent_comment_id": None,
        "up_count": ".vote .voted_count",
        "down_count": ".vote .blamed_count"
    },
    "post_list": {
        "container": "table.bd_lst tbody tr",
        "title_link": "td.title a",
        "author": "td.author a.member_plate",
        "date": "td.time",
        "view_count": "td.m_no:nth-last-child(2)",
        "up_count": "td.m_no:last-child",
        "comment_count_in_title": "td.title .comment_count"
    }
}

# 유틸리티 함수들 (기존과 동일)
def parse_post_id(url: str) -> str:
    """URL에서 게시글 ID 추출"""
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
    numbers = re.findall(r'\d+', text.replace(',', ''))
    return int(numbers[0]) if numbers else 0

def parse_date(date_str: str) -> str:
    """날짜 문자열 파싱 및 ISO 형식으로 변환"""
    if not date_str:
        return datetime.now(pytz.timezone('Asia/Seoul')).isoformat()
    
    date_str = clean_text(date_str)
    
    try:
        if ':' in date_str and '.' not in date_str:
            today = datetime.now(pytz.timezone('Asia/Seoul')).date()
            time_str = date_str
            datetime_str = f"{today.strftime('%Y.%m.%d')} {time_str}"
        else:
            datetime_str = date_str
            
        dt = datetime.strptime(datetime_str, '%Y.%m.%d %H:%M')
        dt = pytz.timezone('Asia/Seoul').localize(dt)
        return dt.isoformat()
    except ValueError:
        return datetime.now(pytz.timezone('Asia/Seoul')).isoformat()

# Chrome 브라우저 관리 함수들
async def setup_chrome_browser(config: Optional[Dict] = None) -> Tuple[Browser, Page]:
    """Chrome 브라우저 초기화 (실제 Chrome 사용)"""
    if config is None:
        config = {}
    
    chrome_config = ChromeBrowserConfig()
    playwright = await async_playwright().start()
    
    print("🔧 Chrome 브라우저 설정 중...")
    
    # Chrome 채널 시도
    browser = None
    for channel in chrome_config.chrome_channels:
        try:
            print(f"  🌐 {channel} 채널 시도 중...")
            browser_config = chrome_config.get_chrome_config(config.get('headless', False))
            browser_config['channel'] = channel
            
            browser = await playwright.chromium.launch(**browser_config)
            print(f"  ✅ {channel} 브라우저 실행 성공!")
            break
        except Exception as e:
            print(f"  ❌ {channel} 실행 실패: {e}")
            continue
    
    # 모든 채널 실패 시 기본 Chromium 사용 (Chrome 설정 적용)
    if not browser:
        print("  🔄 기본 Chromium으로 Chrome 모방 시도...")
        try:
            browser_config = chrome_config.get_chrome_config(config.get('headless', False))
            del browser_config['channel']  # 채널 제거
            browser = await playwright.chromium.launch(**browser_config)
            print("  ✅ Chromium (Chrome 모방) 실행 성공!")
        except Exception as e:
            print(f"  ❌ Chromium 실행도 실패: {e}")
            raise
    
    # 새 페이지 생성
    page = await browser.new_page()
    
    # Chrome과 동일한 User-Agent 및 헤더 설정
    import random
    user_agent = random.choice(chrome_config.user_agents)
    
    await page.set_extra_http_headers({
        'User-Agent': user_agent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"'
    })
    
    # 뷰포트 설정
    await page.set_viewport_size({"width": 1920, "height": 1080})
    
    print(f"  👤 User-Agent: {user_agent}")
    print("  🎯 Chrome 브라우저 설정 완료!")
    
    return browser, page

async def close_chrome_browser(browser: Browser):
    """Chrome 브라우저 종료"""
    await browser.close()

async def navigate_to_page_chrome(page: Page, url: str, config: Optional[Dict] = None) -> bool:
    """Chrome 브라우저로 페이지 이동"""
    if config is None:
        config = {}
        
    try:
        print(f"🌐 페이지 이동 중: {url}")
        
        # 실제 사용자처럼 자연스러운 이동
        await page.goto(url, 
                       wait_until='networkidle', 
                       timeout=config.get('timeout', 60000))
        
        # 추가 대기 시간 (자연스러운 동작)
        await asyncio.sleep(config.get('wait_time', 3))
        
        # 페이지 로딩 확인
        title = await page.title()
        print(f"  📄 페이지 제목: {title}")
        
        return True
    except Exception as e:
        print(f"❌ 페이지 이동 실패: {e}")
        return False

# 데이터 추출 함수들 (기존과 동일하지만 Chrome 최적화)
async def extract_text_content_chrome(element: ElementHandle) -> str:
    """Chrome 브라우저에서 텍스트 추출"""
    try:
        html_content = await element.evaluate("""
            element => {
                const clone = element.cloneNode(true);
                
                const brElements = clone.querySelectorAll('br');
                brElements.forEach(br => {
                    br.replaceWith('\\n');
                });
                
                const blockElements = clone.querySelectorAll('p, div');
                blockElements.forEach(block => {
                    if (block.nextSibling) {
                        block.insertAdjacentText('afterend', '\\n');
                    }
                });
                
                return clone.textContent || clone.innerText || '';
            }
        """)
        
        if html_content:
            text = re.sub(r'\n{3,}', '\n\n', html_content)
            text = text.strip()
            return text
        else:
            return ""
    except Exception as e:
        print(f"텍스트 추출 오류: {e}")
        try:
            return await element.evaluate("element => element.textContent || ''")
        except:
            return ""

async def extract_attribute_chrome(element: ElementHandle, attr: str) -> str:
    """Chrome 브라우저에서 속성값 추출"""
    try:
        value = await element.get_attribute(attr)
        return value if value else ""
    except Exception:
        return ""

# 게시글 목록 관련 함수들 (Chrome 최적화)
async def extract_post_list_chrome(page: Page, selectors: Dict) -> List[Dict]:
    """Chrome 브라우저로 게시글 목록 추출"""
    posts = []
    post_selectors = selectors.get("post_list", {})
    
    try:
        print("📋 게시글 목록 추출 중...")
        
        # 게시글 목록 컨테이너들 찾기
        post_elements = await page.query_selector_all(post_selectors.get("container", ""))
        print(f"  📝 발견된 게시글 수: {len(post_elements)}")
        
        for i, element in enumerate(post_elements):
            if i >= 10:  # 최대 10개만 처리
                break
                
            post_data = {}
            
            # 제목 및 URL 추출
            title_link_element = await element.query_selector(post_selectors.get("title_link", ""))
            if title_link_element:
                title = await extract_text_content_chrome(title_link_element)
                url = await extract_attribute_chrome(title_link_element, "href")
                
                if url and url.startswith('/'):
                    url = "https://www.fmkorea.com" + url
                    
                post_data["title"] = clean_text(title)
                post_data["url"] = url
                post_data["post_id"] = parse_post_id(url) if url else ""
            else:
                continue
                
            # 작성자 추출
            author_element = await element.query_selector(post_selectors.get("author", ""))
            if author_element:
                post_data["author"] = await extract_text_content_chrome(author_element)
            else:
                post_data["author"] = ""
                
            # 작성일 추출
            date_element = await element.query_selector(post_selectors.get("date", ""))
            if date_element:
                date_text = await extract_text_content_chrome(date_element)
                post_data["date"] = parse_date(date_text)
            else:
                post_data["date"] = datetime.now(pytz.timezone('Asia/Seoul')).isoformat()
                
            # 조회수 추출
            view_element = await element.query_selector(post_selectors.get("view_count", ""))
            if view_element:
                view_text = await extract_text_content_chrome(view_element)
                post_data["view_count"] = parse_number(view_text)
            else:
                post_data["view_count"] = 0
                
            # 추천수 추출
            up_element = await element.query_selector(post_selectors.get("up_count", ""))
            if up_element:
                up_text = await extract_text_content_chrome(up_element)
                post_data["up_count"] = parse_number(up_text)
            else:
                post_data["up_count"] = 0
                
            post_data["down_count"] = 0
            
            # 댓글수 추출
            comment_element = await element.query_selector(post_selectors.get("comment_count_in_title", ""))
            if comment_element:
                comment_text = await extract_text_content_chrome(comment_element)
                post_data["comment_count"] = parse_number(comment_text)
            else:
                title_text = post_data.get("title", "")
                comment_match = re.search(r'\[(\d+)\]', title_text)
                post_data["comment_count"] = int(comment_match.group(1)) if comment_match else 0
                
            posts.append(post_data)
            print(f"  ✅ 게시글 {i+1}: {post_data['title'][:30]}...")
            
    except Exception as e:
        print(f"게시글 목록 추출 오류: {e}")
        
    return posts

class FMKoreaChromeScraper:
    """FMKorea Chrome 스크래퍼 클래스"""
    
    def __init__(self):
        self.selectors = FMKOREA_SELECTORS
        self.schema = POST_SCHEMA
        
    async def extract_metadata_chrome(self, page: Page) -> Dict:
        """Chrome 브라우저로 메타데이터 추출"""
        metadata = {}
        selectors = self.selectors["metadata"]
        
        try:
            print("📊 메타데이터 추출 중...")
            
            # 제목 추출
            title_element = await page.query_selector(selectors["title"])
            if title_element:
                metadata["title"] = await extract_text_content_chrome(title_element)
            else:
                metadata["title"] = ""
                
            # 작성자 추출
            author_element = await page.query_selector(selectors["author"])
            if author_element:
                metadata["author"] = await extract_text_content_chrome(author_element)
            else:
                metadata["author"] = ""
                
            # 작성일 추출
            date_element = await page.query_selector(selectors["date"])
            if date_element:
                date_text = await extract_text_content_chrome(date_element)
                metadata["date"] = parse_date(date_text)
            else:
                metadata["date"] = datetime.now(pytz.timezone('Asia/Seoul')).isoformat()
                
            # 조회수, 추천수, 댓글수를 텍스트로 찾기
            side_fr_element = await page.query_selector(".btm_area .side.fr")
            if side_fr_element:
                side_text = await extract_text_content_chrome(side_fr_element)
                
                view_match = re.search(r'조회\s*수\s*(\d+)', side_text)
                metadata["view_count"] = int(view_match.group(1)) if view_match else 0
                
                up_match = re.search(r'추천\s*수\s*(\d+)', side_text)
                metadata["up_count"] = int(up_match.group(1)) if up_match else 0
                
                comment_match = re.search(r'댓글\s*(\d+)', side_text)
                metadata["comment_count"] = int(comment_match.group(1)) if comment_match else 0
            else:
                metadata["view_count"] = 0
                metadata["up_count"] = 0
                metadata["comment_count"] = 0
                
            metadata["down_count"] = 0
                
            # 카테고리 추출
            category_element = await page.query_selector(selectors["category"])
            if category_element:
                metadata["category"] = await extract_text_content_chrome(category_element)
            else:
                metadata["category"] = ""
                
            print(f"  📄 제목: {metadata['title'][:50]}...")
            print(f"  👤 작성자: {metadata['author']}")
            print(f"  👀 조회수: {metadata['view_count']}")
            print(f"  👍 추천수: {metadata['up_count']}")
                
        except Exception as e:
            print(f"메타데이터 추출 오류: {e}")
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
        
    async def scrape_post_chrome(self, url: str, config: Optional[Dict] = None) -> Dict:
        """Chrome 브라우저로 게시글 스크래핑"""
        if config is None:
            config = {}
            
        browser, page = await setup_chrome_browser(config)
        
        try:
            # 페이지 이동
            success = await navigate_to_page_chrome(page, url, config)
            if not success:
                raise Exception("페이지 이동 실패")
                
            # 데이터 추출
            post_id = parse_post_id(url)
            metadata = await self.extract_metadata_chrome(page)
            
            # 간단한 콘텐츠 추출 (제목만)
            content = [{
                "type": "text",
                "order": 0,
                "data": {"text": f"제목: {metadata.get('title', '')}\n\n(Chrome 브라우저로 스크래핑됨)"}
            }]
            
            # 결과 구성
            result = {
                "post_id": post_id,
                "post_url": url,
                "metadata": metadata,
                "content": content,
                "comments": [],  # 간단 버전에서는 댓글 제외
                "scraped_at": datetime.now(pytz.timezone('Asia/Seoul')).isoformat()
            }
            
            return result
                
        except Exception as e:
            print(f"스크래핑 오류: {e}")
            return {}
        finally:
            await close_chrome_browser(browser)

# 메인 실행 함수들
async def scrape_fmkorea_chrome_test(config: Optional[Dict] = None) -> List[Dict]:
    """FMKorea Chrome 브라우저 테스트"""
    if config is None:
        config = {'headless': False}  # Chrome 테스트는 headless=False로
        
    print("🚀 FMKorea Chrome 브라우저 테스트 시작")
    
    browser, page = await setup_chrome_browser(config)
    results = []
    
    try:
        # 1. 에펨코리아 정치 게시판 접속 테스트
        page_url = "https://www.fmkorea.com/politics"
        success = await navigate_to_page_chrome(page, page_url, config)
        
        if not success:
            print("❌ 에펨코리아 접속 실패")
            return []
        
        print("✅ 에펨코리아 접속 성공!")
        
        # 2. 게시글 목록 추출
        posts = await extract_post_list_chrome(page, FMKOREA_SELECTORS)
        
        if not posts:
            print("❌ 게시글 목록 추출 실패")
            return []
        
        print(f"📋 게시글 목록 추출 성공: {len(posts)}개")
        
        # 3. 상위 3개 게시글 상세 스크래핑
        scraper = FMKoreaChromeScraper()
        
        for i, post in enumerate(posts[:3]):
            print(f"\n📄 게시글 {i+1}/{min(3, len(posts))} 스크래핑 중...")
            print(f"  제목: {post.get('title', 'N/A')[:50]}...")
            
            try:
                scraped_data = await scraper.scrape_post_chrome(post["url"], config)
                if scraped_data:
                    results.append(scraped_data)
                    print(f"  ✅ 성공!")
                else:
                    print(f"  ❌ 실패")
            except Exception as e:
                print(f"  ❌ 오류: {e}")
                
            # 요청 간 간격
            if i < min(2, len(posts) - 1):
                await asyncio.sleep(3)
        
        # 4. 결과 저장
        if results:
            timestamp = int(time.time())
            file_name = f"fmkorea-chrome-test-{timestamp}.json"
            
            data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
            os.makedirs(data_dir, exist_ok=True)
            filepath = os.path.join(data_dir, file_name)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
            
            print(f"\n💾 결과가 {filepath}에 저장되었습니다.")
            
            # API 전송 시도
            api_url = config.get('api_url', 'http://localhost:3000/api/scraping-data')
            try:
                response = requests.post(api_url, json=results, timeout=10)
                if response.status_code == 200:
                    print(f"✅ API 전송 성공: {len(results)}개 게시글")
                else:
                    print(f"⚠️ API 전송 실패: {response.status_code}")
            except Exception as e:
                print(f"⚠️ API 전송 오류: {e}")
        
        print(f"\n🎉 Chrome 브라우저 테스트 완료!")
        print(f"📊 최종 결과: {len(results)}개 게시글 성공")
        
        return results
        
    except Exception as e:
        print(f"💥 Chrome 테스트 실행 실패: {e}")
        return []
        
    finally:
        await close_chrome_browser(browser)

# 메인 실행
async def main():
    """메인 실행 함수"""
    print("🌟 FMKorea Chrome 스크래퍼 시작")
    
    config = {
        'headless': False,  # Chrome 브라우저 창 표시
        'timeout': 60000,
        'wait_time': 3,
        'api_url': 'http://localhost:3000/api/scraping-data'
    }
    
    result = await scrape_fmkorea_chrome_test(config)
    
    if result:
        print("✅ Chrome 스크래핑 테스트 성공적으로 완료")
    else:
        print("❌ Chrome 스크래핑 테스트 실패")
    
    return result

if __name__ == "__main__":
    asyncio.run(main()) 
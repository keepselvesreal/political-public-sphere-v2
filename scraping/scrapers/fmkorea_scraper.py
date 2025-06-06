"""
에펨코리아 스크래퍼 - 함수 기반
개별 게시글 URL을 입력받아 메타데이터, 본문, 댓글을 추출하여 JSON으로 저장
"""

import asyncio
import json
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
import pytz
from playwright.async_api import async_playwright, Browser, Page, ElementHandle
from jsonschema import validate, ValidationError


# 에펨코리아 셀렉터 정의 (실제 HTML 구조에 맞게 수정)
FMKOREA_SELECTORS = {
    "metadata": {
        "title": ".np_18px_span",
        "author": ".member_plate",
        "date": ".date",
        "view_count": "span:contains('조회 수') b",
        "up_count": "span:contains('추천 수') b",
        "down_count": "span:contains('비추천 수') b",
        "comment_count": "span:contains('댓글') b"
    },
    "content": {
        "container": ".xe_content, .rd_body",
        "text": "p, div:not([class]):not([id])",
        "image": "img",
        "video": "video"
    },
    "comments": {
        "container": ".fdb_lst_ul",
        "items": ".fdb_itm",
        "author": ".member_plate",
        "content": ".xe_content",
        "date": ".meta .date",
        "up_count": ".voted_count",
        "down_count": ".blamed_count",
        "comment_id": "[id^='comment_']",
        "reply_indicator": ".re",
        "images": ".xe_content img"
    }
}

# JSON 스키마 정의 (새 스키마 적용)
POST_SCHEMA = {
    "type": "object",
    "properties": {
        "post_id": {"type": "string"},
        "community": {"type": "string"},
        "metadata": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "author": {"type": "string"},
                "date": {"type": "string"},
                "view_count": {"type": "integer"},
                "up_count": {"type": "integer"},
                "down_count": {"type": "integer"},
                "comment_count": {"type": "integer"}
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
        }
    },
    "required": ["post_id", "community", "metadata", "content", "comments"]
}


def extract_post_id(url: str) -> str:
    """URL에서 게시글 ID 추출"""
    match = re.search(r'/(\d+)/?$', url)
    return match.group(1) if match else ""


def extract_number(text: str) -> int:
    """텍스트에서 숫자 추출"""
    if not text:
        return 0
    match = re.search(r'\d+', text.replace(',', ''))
    return int(match.group()) if match else 0


async def setup_browser() -> tuple[Browser, Page]:
    """브라우저 초기화"""
    playwright = await async_playwright().start()
    browser = await playwright.chromium.launch(
        headless=True,
        args=[
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    )
    
    context = await browser.new_context(
        user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport={'width': 1920, 'height': 1080}
    )
    
    page = await context.new_page()
    page.set_default_timeout(60000)
    
    return browser, page


async def extract_metadata(page: Page) -> Dict[str, Any]:
    """메타데이터 추출 (실제 HTML 구조에 맞게 수정)"""
    metadata = {}
    
    # 제목
    title_element = await page.query_selector(".np_18px_span")
    metadata["title"] = await title_element.inner_text() if title_element else ""
    
    # 작성자 (member_plate에서 텍스트만 추출)
    author_element = await page.query_selector(".member_plate")
    if author_element:
        author_text = await author_element.inner_text()
        metadata["author"] = author_text.strip() if author_text else ""
    else:
        metadata["author"] = ""
    
    # 날짜
    date_element = await page.query_selector(".date")
    metadata["date"] = await date_element.inner_text() if date_element else ""
    
    # 조회수, 추천수, 댓글수 (span 텍스트에서 추출)
    try:
        # 모든 span 요소를 가져와서 텍스트 확인
        span_elements = await page.query_selector_all("span")
        
        metadata["view_count"] = 0
        metadata["up_count"] = 0
        metadata["down_count"] = 0
        metadata["comment_count"] = 0
        
        for span in span_elements:
            text = await span.inner_text()
            if "조회 수" in text:
                # "조회 수 202" 형태에서 숫자 추출
                b_element = await span.query_selector("b")
                if b_element:
                    view_text = await b_element.inner_text()
                    metadata["view_count"] = extract_number(view_text)
            elif "추천 수" in text:
                b_element = await span.query_selector("b")
                if b_element:
                    up_text = await b_element.inner_text()
                    metadata["up_count"] = extract_number(up_text)
            elif "댓글" in text:
                b_element = await span.query_selector("b")
                if b_element:
                    comment_text = await b_element.inner_text()
                    metadata["comment_count"] = extract_number(comment_text)
                    
    except Exception as e:
        print(f"메타데이터 추출 중 오류: {e}")
        metadata["view_count"] = 0
        metadata["up_count"] = 0
        metadata["down_count"] = 0
        metadata["comment_count"] = 0
    
    return metadata


async def extract_content(page: Page) -> List[Dict[str, Any]]:
    """본문 콘텐츠 추출"""
    content = []
    order = 0
    
    container = await page.query_selector(FMKOREA_SELECTORS["content"]["container"])
    if not container:
        return content
    
    # 모든 자식 요소를 순서대로 처리
    children = await container.query_selector_all("*")
    
    for child in children:
        tag_name = await child.evaluate("el => el.tagName.toLowerCase()")
        
        if tag_name == "img":
            # 이미지 처리
            src = await child.get_attribute("src") or ""
            alt = await child.get_attribute("alt") or ""
            width = await child.get_attribute("width") or ""
            height = await child.get_attribute("height") or ""
            
            if src:
                content.append({
                    "type": "image",
                    "order": order,
                    "data": {
                        "src": src,
                        "alt": alt,
                        "width": width,
                        "height": height
                    }
                })
                order += 1
                
        elif tag_name == "video":
            # 비디오 처리
            src = await child.get_attribute("src") or ""
            autoplay = await child.get_attribute("autoplay") is not None
            muted = await child.get_attribute("muted") is not None
            
            if src:
                content.append({
                    "type": "video",
                    "order": order,
                    "data": {
                        "src": src,
                        "autoplay": autoplay,
                        "muted": muted
                    }
                })
                order += 1
                
        elif tag_name in ["p", "div"]:
            # 텍스트 처리
            text = await child.inner_text()
            if text and text.strip():
                content.append({
                    "type": "text",
                    "order": order,
                    "data": {
                        "text": text.strip()
                    }
                })
                order += 1
    
    return content


async def extract_comments(page: Page) -> List[Dict[str, Any]]:
    """댓글 추출 (실제 HTML 구조에 맞게 수정)"""
    comments = []
    
    # 댓글 컨테이너 확인
    comment_container = await page.query_selector(".fdb_lst_ul")
    if not comment_container:
        return comments
    
    comment_items = await comment_container.query_selector_all(".fdb_itm")
    
    for item in comment_items:
        try:
            comment_data = {}
            
            # 댓글 ID (id 속성에서 추출)
            item_id = await item.get_attribute("id") or ""
            if item_id.startswith("comment_"):
                comment_id = item_id.replace("comment_", "")
            else:
                comment_id = item_id
            comment_data["comment_id"] = comment_id
            
            # 작성자 (member_plate에서 텍스트 추출)
            author_element = await item.query_selector(".member_plate")
            if author_element:
                author_text = await author_element.inner_text()
                comment_data["author"] = author_text.strip() if author_text else ""
            else:
                comment_data["author"] = ""
            
            # 내용 (.xe_content에서 추출)
            content_element = await item.query_selector(".xe_content")
            if content_element:
                content_text = await content_element.inner_text()
                comment_data["content"] = content_text.strip() if content_text else ""
            else:
                comment_data["content"] = ""
            
            # 날짜 (.meta .date에서 추출)
            date_element = await item.query_selector(".meta .date")
            comment_data["date"] = await date_element.inner_text() if date_element else ""
            
            # 추천수 (.voted_count에서 추출)
            up_element = await item.query_selector(".voted_count")
            up_text = await up_element.inner_text() if up_element else "0"
            comment_data["up_count"] = extract_number(up_text)
            
            # 비추천수 (.blamed_count에서 추출)
            down_element = await item.query_selector(".blamed_count")
            down_text = await down_element.inner_text() if down_element else "0"
            comment_data["down_count"] = extract_number(down_text)
            
            # 대댓글 여부 및 레벨 (margin-left 스타일로 판단)
            style = await item.get_attribute("style") or ""
            is_reply = "margin-left" in style
            comment_data["is_reply"] = is_reply
            
            # 레벨 계산 (margin-left 값으로 - 더 정확한 계산)
            if is_reply:
                if "margin-left:10%" in style:
                    comment_data["level"] = 5
                elif "margin-left:8%" in style:
                    comment_data["level"] = 4
                elif "margin-left:6%" in style:
                    comment_data["level"] = 3
                elif "margin-left:4%" in style:
                    comment_data["level"] = 2
                elif "margin-left:2%" in style:
                    comment_data["level"] = 1
                else:
                    # 다른 margin-left 값이 있을 수 있으니 정규식으로 추출
                    import re
                    margin_match = re.search(r'margin-left:(\d+)%', style)
                    if margin_match:
                        margin_percent = int(margin_match.group(1))
                        comment_data["level"] = margin_percent // 2  # 2%씩 증가하므로
                    else:
                        comment_data["level"] = 1
            else:
                comment_data["level"] = 0
            
            # 부모 댓글 ID (대댓글인 경우)
            comment_data["parent_comment_id"] = ""
            if comment_data["is_reply"]:
                # 1. HTML에서 findComment() 함수로 직접 참조하는 부모 ID 찾기
                try:
                    find_parent_element = await item.query_selector(".findParent")
                    if find_parent_element:
                        onclick_attr = await find_parent_element.get_attribute("onclick")
                        if onclick_attr and "findComment(" in onclick_attr:
                            import re
                            parent_id_match = re.search(r'findComment\((\d+)\)', onclick_attr)
                            if parent_id_match:
                                comment_data["parent_comment_id"] = parent_id_match.group(1)
                except:
                    pass
                
                # 2. findComment로 찾지 못한 경우, 이전 댓글 중 레벨이 낮은 것을 부모로 설정
                if not comment_data["parent_comment_id"] and len(comments) > 0:
                    for prev_comment in reversed(comments):
                        if prev_comment["level"] < comment_data["level"]:
                            comment_data["parent_comment_id"] = prev_comment["comment_id"]
                            break
            
            # 미디어 (이미지)
            media = []
            image_elements = await item.query_selector_all(".xe_content img")
            for idx, img in enumerate(image_elements):
                src = await img.get_attribute("src") or ""
                alt = await img.get_attribute("alt") or ""
                if src:
                    media.append({
                        "type": "image",
                        "order": idx,
                        "data": {
                            "src": src,
                            "alt": alt
                        }
                    })
            
            comment_data["media"] = media
            comments.append(comment_data)
            
        except Exception as e:
            print(f"댓글 추출 중 오류: {e}")
            continue
    
    return comments


def validate_data(data: Dict[str, Any]) -> bool:
    """데이터 유효성 검사"""
    try:
        validate(instance=data, schema=POST_SCHEMA)
        return True
    except ValidationError as e:
        print(f"Validation error: {e}")
        return False


def save_to_json(data: Dict[str, Any], filename: str) -> bool:
    """JSON 파일로 저장 (frontend/public 폴더에 저장)"""
    try:
        # frontend/public 폴더에 저장
        public_dir = Path(__file__).parent.parent.parent / "frontend" / "public"
        public_dir.mkdir(parents=True, exist_ok=True)
        
        filepath = public_dir / filename
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"Data saved to: {filepath}")
        return True
    except Exception as e:
        print(f"Error saving to JSON: {e}")
        return False


async def scrape_fmkorea_post(url: str) -> Optional[Dict[str, Any]]:
    """에펨코리아 게시글 스크래핑 메인 함수"""
    browser = None
    try:
        # 브라우저 설정
        browser, page = await setup_browser()
        
        # 페이지 이동
        await page.goto(url, wait_until='networkidle', timeout=60000)
        
        # 데이터 추출
        post_id = extract_post_id(url)
        metadata = await extract_metadata(page)
        content = await extract_content(page)
        comments = await extract_comments(page)
        
        # 결과 구성
        result = {
            "post_id": post_id,
            "community": "fmkorea",
            "metadata": metadata,
            "content": content,
            "comments": comments,
            "scraped_at": datetime.now(pytz.timezone('Asia/Seoul')).isoformat()
        }
        
        # 유효성 검사
        if not validate_data(result):
            print("Data validation failed")
            return None
        
        return result
        
    except Exception as e:
        print(f"Error scraping post: {e}")
        return None
    finally:
        if browser:
            await browser.close()


async def main():
    """테스트용 메인 함수"""
    test_url = "https://www.fmkorea.com/8485393463"
    
    print(f"Scraping: {test_url}")
    result = await scrape_fmkorea_post(test_url)
    
    if result:
        filename = f"fmkorea_{result['post_id']}.json"
        save_to_json(result, filename)
        print("Scraping completed successfully!")
    else:
        print("Scraping failed!")


if __name__ == "__main__":
    asyncio.run(main()) 
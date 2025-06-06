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


# 에펨코리아 셀렉터 정의
FMKOREA_SELECTORS = {
    "metadata": {
        "title": ".np_18px_span, h3",
        "author": ".nick, .member_info .nick",
        "date": ".date, .regdate",
        "view_count": ".hit, .view_count",
        "up_count": ".vote_up .count, .like_count",
        "down_count": ".vote_down .count, .dislike_count",
        "comment_count": ".replyNum, .comment_count"
    },
    "content": {
        "container": ".xe_content, .rd_body, .view_content",
        "text": "p, div:not([class]):not([id])",
        "image": "img",
        "video": "video"
    },
    "comments": {
        "container": ".fdb_lst_ul, .comment_list",
        "items": ".fdb_lst_li, .comment_item",
        "author": ".nick, .member_plate .nick",
        "content": ".xe_content, .comment_content",
        "date": ".date, .regdate",
        "up_count": ".vote_up .count, .like_count",
        "down_count": ".vote_down .count, .dislike_count",
        "level": "[data-depth]",
        "reply_indicator": ".reply_icon",
        "comment_id": "[data-comment-srl]",
        "images": ".xe_content img, .comment_content img"
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
    """메타데이터 추출"""
    metadata = {}
    
    # 제목
    title_element = await page.query_selector(FMKOREA_SELECTORS["metadata"]["title"])
    metadata["title"] = await title_element.inner_text() if title_element else ""
    
    # 작성자
    author_element = await page.query_selector(FMKOREA_SELECTORS["metadata"]["author"])
    metadata["author"] = await author_element.inner_text() if author_element else ""
    
    # 날짜
    date_element = await page.query_selector(FMKOREA_SELECTORS["metadata"]["date"])
    metadata["date"] = await date_element.inner_text() if date_element else ""
    
    # 조회수
    view_element = await page.query_selector(FMKOREA_SELECTORS["metadata"]["view_count"])
    view_text = await view_element.inner_text() if view_element else "0"
    metadata["view_count"] = extract_number(view_text)
    
    # 추천수
    up_element = await page.query_selector(FMKOREA_SELECTORS["metadata"]["up_count"])
    up_text = await up_element.inner_text() if up_element else "0"
    metadata["up_count"] = extract_number(up_text)
    
    # 비추천수
    down_element = await page.query_selector(FMKOREA_SELECTORS["metadata"]["down_count"])
    down_text = await down_element.inner_text() if down_element else "0"
    metadata["down_count"] = extract_number(down_text)
    
    # 댓글수
    comment_element = await page.query_selector(FMKOREA_SELECTORS["metadata"]["comment_count"])
    comment_text = await comment_element.inner_text() if comment_element else "0"
    metadata["comment_count"] = extract_number(comment_text)
    
    # 카테고리 (기본값)
    metadata["category"] = ""
    
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
    """댓글 추출"""
    comments = []
    
    comment_items = await page.query_selector_all(FMKOREA_SELECTORS["comments"]["items"])
    
    for item in comment_items:
        comment_data = {}
        
        # 댓글 ID
        comment_id = await item.get_attribute("data-comment-srl") or ""
        comment_data["comment_id"] = comment_id
        
        # 작성자
        author_element = await item.query_selector(FMKOREA_SELECTORS["comments"]["author"])
        comment_data["author"] = await author_element.inner_text() if author_element else ""
        
        # 내용
        content_element = await item.query_selector(FMKOREA_SELECTORS["comments"]["content"])
        comment_data["content"] = await content_element.inner_text() if content_element else ""
        
        # 날짜
        date_element = await item.query_selector(FMKOREA_SELECTORS["comments"]["date"])
        comment_data["date"] = await date_element.inner_text() if date_element else ""
        
        # 추천수
        up_element = await item.query_selector(FMKOREA_SELECTORS["comments"]["up_count"])
        up_text = await up_element.inner_text() if up_element else "0"
        comment_data["up_count"] = extract_number(up_text)
        
        # 비추천수
        down_element = await item.query_selector(FMKOREA_SELECTORS["comments"]["down_count"])
        down_text = await down_element.inner_text() if down_element else "0"
        comment_data["down_count"] = extract_number(down_text)
        
        # 레벨 (대댓글 깊이)
        level_element = await item.query_selector(FMKOREA_SELECTORS["comments"]["level"])
        level = await level_element.get_attribute("data-depth") if level_element else "0"
        comment_data["level"] = int(level) if level.isdigit() else 0
        
        # 대댓글 여부
        reply_element = await item.query_selector(FMKOREA_SELECTORS["comments"]["reply_indicator"])
        comment_data["is_reply"] = reply_element is not None
        
        # 부모 댓글 ID (대댓글인 경우)
        comment_data["parent_comment_id"] = ""
        if comment_data["is_reply"] and len(comments) > 0:
            # 이전 댓글 중 레벨이 낮은 것을 부모로 설정
            for prev_comment in reversed(comments):
                if prev_comment["level"] < comment_data["level"]:
                    comment_data["parent_comment_id"] = prev_comment["comment_id"]
                    break
        
        # 미디어 (이미지)
        media = []
        image_elements = await item.query_selector_all(FMKOREA_SELECTORS["comments"]["images"])
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
    """JSON 파일로 저장"""
    try:
        data_dir = Path(__file__).parent.parent / "data"
        data_dir.mkdir(exist_ok=True)
        
        filepath = data_dir / filename
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
"""
루리웹 스크래퍼 - 함수 기반
개별 게시글 URL을 입력받아 메타데이터, 본문, 댓글을 추출하여 JSON으로 저장
댓글 이미지 첨부 기능을 특별히 고려
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


# 루리웹 셀렉터 정의
RULIWEB_SELECTORS = {
    "metadata": {
        "title": ".subject_text .subject_inner_text",
        "category": ".subject_text .category_text",
        "author": ".user_info .nick",
        "date": ".user_info .regdate",
        "view_count": ".user_info p:contains('조회')",
        "up_count": ".like_wrapper .like .like_value",
        "down_count": ".like_wrapper .dislike .dislike_value",
        "comment_count": ".subject_text .reply_count"
    },
    "content": {
        "container": ".view_content article",
        "text": "p, div:not([class]):not([id])",
        "image": "img",
        "video": "video"
    },
    "comments": {
        "container": ".comment_view_wrapper",
        "best_items": ".comment_view.best .comment_element",
        "normal_items": ".comment_view.normal .comment_element",
        "author": ".nick_link strong span, .nick strong",
        "content": ".text_wrapper .text",
        "date": ".time",
        "up_count": ".btn_like .num",
        "down_count": ".btn_dislike .num",
        "comment_id": "[id^='ct_']",
        "level_class": ".comment_element",
        "reply_indicator": ".icon_reply",
        "images": ".text_wrapper img.comment_img",
        "parent_class": ".parent",
        "child_class": ".child"
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
                    "down_count": {"type": "integer"},
                    "is_best": {"type": "boolean"}
                },
                "required": ["comment_id", "content", "author", "date", "media", "level", "is_reply", "parent_comment_id", "up_count", "down_count"]
            }
        }
    },
    "required": ["post_id", "community", "metadata", "content", "comments"]
}


def extract_post_id(url: str) -> str:
    """URL에서 게시글 ID 추출"""
    match = re.search(r'/read/(\d+)', url)
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
    title_element = await page.query_selector(RULIWEB_SELECTORS["metadata"]["title"])
    metadata["title"] = await title_element.inner_text() if title_element else ""
    
    # 카테고리
    category_element = await page.query_selector(RULIWEB_SELECTORS["metadata"]["category"])
    metadata["category"] = await category_element.inner_text() if category_element else ""
    
    # 작성자
    author_element = await page.query_selector(RULIWEB_SELECTORS["metadata"]["author"])
    metadata["author"] = await author_element.inner_text() if author_element else ""
    
    # 날짜
    date_element = await page.query_selector(RULIWEB_SELECTORS["metadata"]["date"])
    metadata["date"] = await date_element.inner_text() if date_element else ""
    
    # 조회수 (텍스트에서 추출)
    view_element = await page.query_selector(".user_info p")
    view_text = ""
    if view_element:
        view_text = await view_element.inner_text()
    # "추천 41 | 조회 1506" 형태에서 조회수 추출
    view_match = re.search(r'조회\s+(\d+)', view_text)
    metadata["view_count"] = int(view_match.group(1)) if view_match else 0
    
    # 추천수
    up_element = await page.query_selector(RULIWEB_SELECTORS["metadata"]["up_count"])
    up_text = await up_element.inner_text() if up_element else "0"
    metadata["up_count"] = extract_number(up_text)
    
    # 비추천수
    down_element = await page.query_selector(RULIWEB_SELECTORS["metadata"]["down_count"])
    down_text = await down_element.inner_text() if down_element else "0"
    metadata["down_count"] = extract_number(down_text)
    
    # 댓글수
    comment_element = await page.query_selector(RULIWEB_SELECTORS["metadata"]["comment_count"])
    comment_text = await comment_element.inner_text() if comment_element else "0"
    # [9] 형태에서 숫자 추출
    metadata["comment_count"] = extract_number(comment_text)
    
    return metadata


async def extract_content(page: Page) -> List[Dict[str, Any]]:
    """본문 콘텐츠 추출"""
    content = []
    order = 0
    
    container = await page.query_selector(RULIWEB_SELECTORS["content"]["container"])
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
    """댓글 추출 (BEST 댓글과 일반 댓글 모두 포함)"""
    comments = []
    
    # BEST 댓글 추출
    best_items = await page.query_selector_all(RULIWEB_SELECTORS["comments"]["best_items"])
    for item in best_items:
        comment_data = await extract_single_comment(item, is_best=True)
        if comment_data:
            comments.append(comment_data)
    
    # 일반 댓글 추출
    normal_items = await page.query_selector_all(RULIWEB_SELECTORS["comments"]["normal_items"])
    for item in normal_items:
        comment_data = await extract_single_comment(item, is_best=False)
        if comment_data:
            comments.append(comment_data)
    
    # 부모-자식 관계 설정
    for i, comment in enumerate(comments):
        if comment["is_reply"] and comment["level"] > 0:
            # 이전 댓글 중 레벨이 낮은 것을 부모로 설정
            for j in range(i-1, -1, -1):
                if comments[j]["level"] < comment["level"]:
                    comment["parent_comment_id"] = comments[j]["comment_id"]
                    break
    
    return comments


async def extract_single_comment(item: ElementHandle, is_best: bool = False) -> Optional[Dict[str, Any]]:
    """단일 댓글 데이터 추출"""
    try:
        comment_data = {}
        
        # 댓글 ID
        comment_id = await item.get_attribute("id") or ""
        if comment_id.startswith("ct_"):
            comment_id = comment_id[3:]  # "ct_" 제거
        comment_data["comment_id"] = comment_id
        
        # 작성자
        author_element = await item.query_selector(RULIWEB_SELECTORS["comments"]["author"])
        comment_data["author"] = await author_element.inner_text() if author_element else ""
        
        # 내용
        content_element = await item.query_selector(RULIWEB_SELECTORS["comments"]["content"])
        comment_data["content"] = await content_element.inner_text() if content_element else ""
        
        # 날짜
        date_element = await item.query_selector(RULIWEB_SELECTORS["comments"]["date"])
        comment_data["date"] = await date_element.inner_text() if date_element else ""
        
        # 추천수
        up_element = await item.query_selector(RULIWEB_SELECTORS["comments"]["up_count"])
        up_text = await up_element.inner_text() if up_element else "0"
        comment_data["up_count"] = extract_number(up_text)
        
        # 비추천수
        down_element = await item.query_selector(RULIWEB_SELECTORS["comments"]["down_count"])
        down_text = await down_element.inner_text() if down_element else "0"
        comment_data["down_count"] = extract_number(down_text)
        
        # 레벨 및 대댓글 여부 판단
        class_name = await item.get_attribute("class") or ""
        comment_data["is_reply"] = "child" in class_name
        comment_data["level"] = 1 if comment_data["is_reply"] else 0
        
        # 부모 댓글 ID (나중에 설정)
        comment_data["parent_comment_id"] = ""
        
        # BEST 댓글 여부
        comment_data["is_best"] = is_best
        
        # 미디어 (이미지) 추출 - 루리웹의 특별한 기능
        media = []
        image_elements = await item.query_selector_all(RULIWEB_SELECTORS["comments"]["images"])
        for idx, img in enumerate(image_elements):
            src = await img.get_attribute("src") or ""
            alt = await img.get_attribute("alt") or ""
            width = await img.get_attribute("width") or ""
            height = await img.get_attribute("height") or ""
            
            if src:
                media.append({
                    "type": "image",
                    "order": idx,
                    "data": {
                        "src": src,
                        "alt": alt,
                        "width": width,
                        "height": height
                    }
                })
        
        comment_data["media"] = media
        return comment_data
        
    except Exception as e:
        print(f"Error extracting comment: {e}")
        return None


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


async def scrape_ruliweb_post(url: str) -> Optional[Dict[str, Any]]:
    """루리웹 게시글 스크래핑 메인 함수"""
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
            "community": "ruliweb",
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
    test_url = "https://bbs.ruliweb.com/community/board/300148/read/38077550"
    
    print(f"Scraping: {test_url}")
    result = await scrape_ruliweb_post(test_url)
    
    if result:
        filename = f"ruliweb_{result['post_id']}.json"
        save_to_json(result, filename)
        print("Scraping completed successfully!")
        print(f"Post ID: {result['post_id']}")
        print(f"Title: {result['metadata']['title']}")
        print(f"Author: {result['metadata']['author']}")
        print(f"Comments: {len(result['comments'])}")
        print(f"Content items: {len(result['content'])}")
        
        # 댓글 이미지 개수 확인
        image_count = sum(len(comment['media']) for comment in result['comments'])
        print(f"Comment images: {image_count}")
    else:
        print("Scraping failed!")


if __name__ == "__main__":
    asyncio.run(main()) 
#!/usr/bin/env python3
"""
루리웹 정치유머 게시판 스크래퍼 v3 (TDD 기반)

주요 기능:
- 루리웹 정치유머 게시판 (https://bbs.ruliweb.com/community/board/300148) 전용
- 게시글 목록 스크래핑 및 개별 게시글 상세 정보 추출
- 메타데이터, 본문 콘텐츠, 댓글 완전 추출
- 실시간 API 연동 지원
- 개선된 텍스트 처리 (줄바꿈, 색상 보존)

작성자: AI Assistant
작성일: 2025년 6월 4일 17:45 (KST)
기반: 디버그 스크립트 분석 결과
"""

import asyncio
import json
import re
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from playwright.async_api import async_playwright, Browser, Page, ElementHandle
import pytz
import os

# 루리웹 셀렉터 정의 (디버그 결과 기반)
RULIWEB_SELECTORS = {
    "list": {
        "container": "table.board_list_table tbody",
        "post_rows": "tr.table_body.blocktarget",
        "title": "td.subject a.subject_link",
        "author": "td.writer a",
        "recommend": "td.recomd",
        "hit": "td.hit",
        "time": "td.time",
        "category": "td.divsn a",
        "comment_count_in_title": "span.num_reply"
    },
    "metadata": {
        "title": ".board_main_view .subject_inner",
        "author": ".board_main_view .writer",
        "date": ".board_main_view .regdate",
        "category": ".board_main_view .category",
        "info": ".board_main_view .board_info span",
        "view_count": ".board_main_view .board_info .hit",
        "recommend_count": ".board_main_view .board_info .recomd"
    },
    "content": {
        "container": ".board_main_view .view_content"
    },
    "comments": {
        "container": ".comment_view .comment_element",
        "author": ".comment_writer",
        "content": ".comment_content",
        "date": ".comment_regdate",
        "media": "img, video",
        "up_count": ".comment_up",
        "down_count": ".comment_down"
    }
}

# 데이터 스키마
POST_SCHEMA = {
    "post_id": str,
    "post_url": str,
    "scraped_at": str,
    "metadata": {
        "title": str,
        "category": str,
        "author": str,
        "date": str,
        "view_count": int,
        "up_count": int,
        "down_count": int,
        "comment_count": int
    },
    "content": list,
    "comments": list
}

# 유틸리티 함수들
def clean_text(text: str) -> str:
    """텍스트 정리 (기본적인 정리만)"""
    if not text:
        return ""
    return text.strip()

def parse_number(text: str) -> int:
    """텍스트에서 숫자 추출"""
    if not text:
        return 0
    numbers = re.findall(r'\d+', str(text).replace(',', ''))
    return int(numbers[0]) if numbers else 0

def parse_post_id(url: str) -> str:
    """URL에서 게시글 ID 추출"""
    if not url:
        return ""
    match = re.search(r'/read/(\d+)', url)
    return match.group(1) if match else ""

def parse_date(date_str: str) -> str:
    """날짜 문자열을 ISO 형식으로 변환"""
    if not date_str:
        return datetime.now(pytz.timezone('Asia/Seoul')).isoformat()
    
    try:
        # 루리웹 날짜 형식 처리
        date_str = date_str.strip()
        
        # "17:43" 형식 (오늘)
        if re.match(r'^\d{1,2}:\d{2}$', date_str):
            now = datetime.now(pytz.timezone('Asia/Seoul'))
            time_parts = date_str.split(':')
            hour, minute = int(time_parts[0]), int(time_parts[1])
            today = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            return today.isoformat()
        
        # "2025.06.04" 형식
        elif re.match(r'^\d{4}\.\d{2}\.\d{2}$', date_str):
            date_obj = datetime.strptime(date_str, '%Y.%m.%d')
            date_obj = pytz.timezone('Asia/Seoul').localize(date_obj)
            return date_obj.isoformat()
        
        # 기타 형식은 그대로 반환
        else:
            return date_str
            
    except Exception as e:
        print(f"날짜 파싱 오류: {e}")
        return datetime.now(pytz.timezone('Asia/Seoul')).isoformat()

def select_top_posts(posts: List[Dict], limit: int = 10) -> List[Dict]:
    """상위 게시글 선별 (추천수, 조회수, 댓글수 기준)"""
    if not posts:
        return []
    
    # 공지사항 제외
    filtered_posts = [post for post in posts if post.get("category", "").lower() != "공지"]
    
    # 점수 계산 (추천수 * 3 + 조회수 * 0.1 + 댓글수 * 2)
    for post in filtered_posts:
        recommend = post.get("recommend", 0)
        hit = post.get("hit", 0)
        comment_count = post.get("comment_count", 0)
        
        score = recommend * 3 + hit * 0.1 + comment_count * 2
        post["_score"] = score
    
    # 점수순 정렬 후 상위 선택
    sorted_posts = sorted(filtered_posts, key=lambda x: x.get("_score", 0), reverse=True)
    return sorted_posts[:limit]

# 브라우저 관련 함수들
async def setup_browser(config: Optional[Dict] = None) -> Tuple[Browser, Page]:
    """브라우저 설정 및 시작"""
    if config is None:
        config = {}
    
    playwright = await async_playwright().start()
    browser = await playwright.chromium.launch(
        headless=config.get('headless', True),
        slow_mo=config.get('slow_mo', 0)
    )
    
    page = await browser.new_page()
    await page.set_viewport_size({"width": 1920, "height": 1080})
    
    return browser, page

async def close_browser(browser: Browser):
    """브라우저 종료"""
    await browser.close()

async def navigate_to_page(page: Page, url: str, config: Optional[Dict] = None) -> bool:
    """페이지 이동"""
    if config is None:
        config = {}
    
    try:
        await page.goto(url, wait_until="networkidle", timeout=config.get('timeout', 30000))
        await page.wait_for_timeout(config.get('wait_time', 2) * 1000)
        return True
    except Exception as e:
        print(f"페이지 이동 실패: {e}")
        return False

# 텍스트 추출 함수 (개선된 버전)
async def extract_text_content(element: ElementHandle) -> str:
    """요소에서 텍스트 추출 (줄바꿈 및 스타일 보존)"""
    try:
        html_content = await element.evaluate("""
            element => {
                const clone = element.cloneNode(true);
                
                // br 태그를 줄바꿈으로 변환
                const brElements = clone.querySelectorAll('br');
                brElements.forEach(br => {
                    br.replaceWith('\\n');
                });
                
                // p, div 태그 사이에 줄바꿈 추가
                const blockElements = clone.querySelectorAll('p, div');
                blockElements.forEach(block => {
                    if (block.nextSibling) {
                        block.insertAdjacentText('afterend', '\\n');
                    }
                });
                
                // 색상 정보가 있는 요소들 처리
                const colorElements = clone.querySelectorAll('[style*="color"], [color]');
                colorElements.forEach(el => {
                    const style = el.getAttribute('style') || '';
                    const color = el.getAttribute('color') || '';
                    let colorValue = '';
                    
                    if (style.includes('color:')) {
                        const colorMatch = style.match(/color:\\s*([^;]+)/);
                        if (colorMatch) colorValue = colorMatch[1].trim();
                    } else if (color) {
                        colorValue = color;
                    }
                    
                    if (colorValue && colorValue !== 'black' && colorValue !== '#000' && colorValue !== '#000000') {
                        const text = el.textContent || '';
                        if (text.trim()) {
                            el.textContent = `[색상:${colorValue}]${text}[/색상]`;
                        }
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

async def extract_attribute(element: ElementHandle, attr: str) -> str:
    """요소에서 속성 추출"""
    try:
        value = await element.get_attribute(attr)
        return value or ""
    except Exception:
        return ""

# 게시글 목록 추출
async def extract_post_list(page: Page, selectors: Dict) -> List[Dict]:
    """게시글 목록 추출"""
    posts = []
    post_selectors = selectors["list"]
    
    try:
        post_elements = await page.query_selector_all(post_selectors["post_rows"])
        print(f"📋 발견된 게시글 수: {len(post_elements)}")
        
        for element in post_elements:
            post_data = {}
            
            # 제목 및 URL 추출
            title_element = await element.query_selector(post_selectors["title"])
            if title_element:
                title = await extract_text_content(title_element)
                url = await extract_attribute(title_element, "href")
                
                # 상대 URL을 절대 URL로 변환
                if url and url.startswith('/'):
                    url = "https://bbs.ruliweb.com" + url
                    
                post_data["title"] = clean_text(title)
                post_data["url"] = url
                post_data["post_id"] = parse_post_id(url) if url else ""
            else:
                continue  # 제목이 없으면 스킵
                
            # 작성자 추출
            author_element = await element.query_selector(post_selectors["author"])
            if author_element:
                post_data["author"] = await extract_text_content(author_element)
            else:
                post_data["author"] = ""
                
            # 카테고리 추출
            category_element = await element.query_selector(post_selectors["category"])
            if category_element:
                post_data["category"] = await extract_text_content(category_element)
            else:
                post_data["category"] = ""
                
            # 추천수 추출
            recommend_element = await element.query_selector(post_selectors["recommend"])
            if recommend_element:
                recommend_text = await extract_text_content(recommend_element)
                post_data["recommend"] = parse_number(recommend_text)
            else:
                post_data["recommend"] = 0
                
            # 조회수 추출
            hit_element = await element.query_selector(post_selectors["hit"])
            if hit_element:
                hit_text = await extract_text_content(hit_element)
                post_data["hit"] = parse_number(hit_text)
            else:
                post_data["hit"] = 0
                
            # 작성일 추출
            time_element = await element.query_selector(post_selectors["time"])
            if time_element:
                time_text = await extract_text_content(time_element)
                post_data["date"] = parse_date(time_text)
            else:
                post_data["date"] = datetime.now(pytz.timezone('Asia/Seoul')).isoformat()
                
            # 댓글수 추출 (제목에서)
            comment_element = await element.query_selector(post_selectors["comment_count_in_title"])
            if comment_element:
                comment_text = await extract_text_content(comment_element)
                post_data["comment_count"] = parse_number(comment_text)
            else:
                # 제목에서 댓글수 추출 시도
                title_text = post_data.get("title", "")
                comment_match = re.search(r'\((\d+)\)', title_text)
                post_data["comment_count"] = int(comment_match.group(1)) if comment_match else 0
                
            posts.append(post_data)
            
    except Exception as e:
        print(f"게시글 목록 추출 오류: {e}")
        
    return posts

# 루리웹 스크래퍼 클래스
class RuliwebScraper:
    """루리웹 스크래퍼 클래스"""
    
    def __init__(self):
        self.selectors = {
            "post_list": {
                "container": ".board_list_table tbody",
                "items": "tr.table_body:not(.notice):not(.list_inner)",
                "title": ".subject .subject_link",
                "url": ".subject .subject_link",
                "author": ".writer a",
                "date": ".time",
                "view_count": ".hit",
                "recommend_count": ".recomd",
                "comment_count": ".num_reply"
            },
            "metadata": {
                "title": ".subject_wrapper .subject .subject_text .subject_inner_text",
                "author": ".user_info .nick a",
                "date": ".regdate",
                "view_count": ".mini_profile .hit strong",
                "recommend_count": ".mini_profile .recomd strong",
                "comment_count": ".reply_count",
                "category": ".category_text",
                "info": ".user_info p"
            },
            "content": {
                "container": ".view_content article"
            },
            "comments": {
                "container": ".comment_table tbody tr.comment_element",
                "author": ".nick_link strong span",
                "content": ".text_wrapper .text",
                "date": ".time",
                "recommend": ".btn_like .num",
                "unrecommend": ".btn_dislike .num",
                "profile_image": ".profile_image_m"
            }
        }

    async def extract_metadata(self, page: Page) -> Dict:
        """메타데이터 추출 (실제 HTML 구조 기반)"""
        metadata = {}
        selectors = self.selectors["metadata"]
        
        try:
            # 제목 추출 (실제 HTML 구조 기반)
            title_selectors = [
                ".subject_wrapper .subject .subject_text .subject_inner_text",  # 실제 구조
                ".subject_text .subject_inner_text",
                ".subject .subject_inner_text",
                ".subject_inner_text",  # 더 간단한 셀렉터
                "h4.subject .subject_inner_text",
                ".subject_wrapper .subject_inner_text",
                ".subject_text",
                ".subject",
                "h4.subject",
                ".board_main_view .subject",
                ".view_subject",
                ".title",
                "h1",
                "h2",
                "h3",
                "h4"
            ]
            
            title_found = False
            for title_selector in title_selectors:
                title_element = await page.query_selector(title_selector)
                if title_element:
                    title_text = await extract_text_content(title_element)
                    if title_text and title_text.strip() and len(title_text.strip()) > 3:
                        # 너무 짧은 텍스트는 제목이 아닐 가능성이 높음
                        metadata["title"] = title_text.strip()
                        title_found = True
                        print(f"✅ 제목 추출 성공 ({title_selector}): {title_text[:50]}...")
                        break
                    else:
                        print(f"❌ 제목 후보 발견했지만 부적절 ({title_selector}): '{title_text}'")
                else:
                    print(f"❌ 셀렉터 매치 없음: {title_selector}")
            
            if not title_found:
                # 페이지 제목에서 추출 시도
                page_title = await page.title()
                print(f"🔍 페이지 제목 확인: {page_title}")
                if page_title and "루리웹" in page_title:
                    # "제목 - 루리웹" 형식에서 제목 부분만 추출
                    title_part = page_title.split(" - ")[0].strip()
                    if title_part and title_part != "루리웹" and len(title_part) > 3:
                        metadata["title"] = title_part
                        print(f"✅ 페이지 제목에서 추출: {title_part}")
                        title_found = True
                
            if not title_found:
                # 모든 텍스트 요소에서 제목 후보 찾기
                print("🔍 모든 텍스트 요소에서 제목 후보 찾는 중...")
                all_text_elements = await page.query_selector_all("h1, h2, h3, h4, .title, .subject, [class*='title'], [class*='subject']")
                for i, element in enumerate(all_text_elements[:10]):  # 상위 10개만 확인
                    text = await extract_text_content(element)
                    if text and len(text.strip()) > 5 and len(text.strip()) < 200:
                        print(f"🔍 제목 후보 {i+1}: '{text[:50]}...'")
                        if not title_found:  # 첫 번째 적절한 후보를 제목으로 사용
                            metadata["title"] = text.strip()
                            title_found = True
                            print(f"✅ 첫 번째 후보를 제목으로 선택: {text[:50]}...")
                            break
                
            if not title_found:
                metadata["title"] = f"게시글 #{parse_post_id(page.url)}"
                print(f"❌ 제목 추출 실패, 기본값 사용: {metadata['title']}")
                
            # 작성자 추출 (실제 HTML 구조 기반)
            author_selectors = [
                ".user_info_wrapper .nick .nick_link strong",  # 실제 구조
                ".user_info .nick a",  # 기존 구조
                ".user_info_wrapper .nick a",
                ".nick a"
            ]
            
            author_found = False
            for author_selector in author_selectors:
                author_element = await page.query_selector(author_selector)
                if author_element:
                    author_text = await extract_text_content(author_element)
                    if author_text and author_text.strip():
                        metadata["author"] = author_text.strip()
                        author_found = True
                        print(f"✅ 작성자 추출 성공: {author_text}")
                        break
                        
            if not author_found:
                metadata["author"] = ""
                print("❌ 작성자 추출 실패")
                
            # 작성일 추출
            date_selectors = [
                ".control_box .time",  # 실제 구조
                ".regdate",
                ".user_info .regdate",
                ".mini_profile .regdate"
            ]
            
            date_found = False
            for date_selector in date_selectors:
                date_element = await page.query_selector(date_selector)
                if date_element:
                    date_text = await extract_text_content(date_element)
                    if date_text and date_text.strip():
                        metadata["date"] = parse_date(date_text)
                        date_found = True
                        print(f"✅ 작성일 추출 성공: {date_text}")
                        break
                        
            if not date_found:
                metadata["date"] = datetime.now(pytz.timezone('Asia/Seoul')).isoformat()
                
            # 조회수 추출 (실제 HTML 구조 기반)
            view_selectors = [
                ".mini_profile .hit strong",  # 실제 구조
                ".user_info .hit",
                ".hit strong"
            ]
            
            metadata["view_count"] = 0
            for view_selector in view_selectors:
                view_element = await page.query_selector(view_selector)
                if view_element:
                    view_text = await extract_text_content(view_element)
                    if view_text and view_text.strip():
                        metadata["view_count"] = parse_number(view_text)
                        if metadata["view_count"] > 0:
                            print(f"✅ 조회수 추출 성공: {metadata['view_count']:,}")
                            break
            
            # 추천수 추출 (실제 HTML 구조 기반)
            recommend_selectors = [
                ".mini_profile .recomd strong",  # 실제 구조
                ".like_value",
                ".recomd strong"
            ]
            
            metadata["up_count"] = 0
            for recommend_selector in recommend_selectors:
                recommend_element = await page.query_selector(recommend_selector)
                if recommend_element:
                    recommend_text = await extract_text_content(recommend_element)
                    if recommend_text and recommend_text.strip():
                        metadata["up_count"] = parse_number(recommend_text)
                        if metadata["up_count"] > 0:
                            print(f"✅ 추천수 추출 성공: {metadata['up_count']:,}")
                            break
            
            # 댓글수 추출 (실제 HTML 구조 기반)
            comment_count_selectors = [
                ".reply_count",
                ".mini_profile .replycount .num strong",
                ".num_reply"
            ]
            
            metadata["comment_count"] = 0
            for comment_selector in comment_count_selectors:
                comment_element = await page.query_selector(comment_selector)
                if comment_element:
                    comment_text = await extract_text_content(comment_element)
                    if comment_text and comment_text.strip():
                        metadata["comment_count"] = parse_number(comment_text)
                        if metadata["comment_count"] > 0:
                            print(f"✅ 댓글수 추출 성공: {metadata['comment_count']:,}")
                            break
            
            # 댓글수를 댓글 컨테이너에서 직접 계산 (더 정확함)
            if metadata["comment_count"] == 0:
                comment_elements = await page.query_selector_all(".comment_table tbody tr.comment_element")
                if comment_elements:
                    # 중복 제거를 위해 고유한 comment_id만 계산
                    unique_comment_ids = set()
                    for element in comment_elements:
                        comment_id = await element.get_attribute("id")
                        if comment_id:
                            unique_comment_ids.add(comment_id)
                    metadata["comment_count"] = len(unique_comment_ids)
                    print(f"✅ 댓글수 직접 계산 (중복 제거): {metadata['comment_count']:,}")
                    
            # 비추천수 (루리웹은 없음)
            metadata["down_count"] = 0
                
            # 카테고리 추출 (실제 HTML 구조 기반)
            category_selectors = [
                ".subject_text .category_text",  # 실제 구조
                ".category_text",
                ".subject_text .category_text"
            ]
            
            category_found = False
            for category_selector in category_selectors:
                category_element = await page.query_selector(category_selector)
                if category_element:
                    category_text = await extract_text_content(category_element)
                    if category_text and category_text.strip():
                        # [유머], [정치] 등에서 대괄호 제거
                        category_clean = category_text.strip().replace('[', '').replace(']', '')
                        metadata["category"] = category_clean
                        category_found = True
                        print(f"✅ 카테고리 추출 성공: {category_clean}")
                        break
                        
            if not category_found:
                # URL에서 카테고리 추출 시도
                current_url = page.url
                if "board/300148" in current_url:
                    metadata["category"] = "정치유머"
                else:
                    metadata["category"] = ""
                
            print(f"📊 메타데이터 추출 완료:")
            print(f"  - 제목: {metadata['title'][:50]}...")
            print(f"  - 작성자: {metadata['author']}")
            print(f"  - 조회수: {metadata['view_count']:,}")
            print(f"  - 추천수: {metadata['up_count']:,}")
            print(f"  - 댓글수: {metadata['comment_count']:,}")
            print(f"  - 카테고리: {metadata['category']}")
                
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
        
    async def extract_content(self, page: Page) -> List[Dict]:
        """본문 콘텐츠 추출"""
        content = []
        selectors = self.selectors["content"]
        order = 0
        
        try:
            container = await page.query_selector(selectors["container"])
            if not container:
                print("❌ 본문 컨테이너를 찾을 수 없습니다.")
                return content
                
            print("🔍 본문 콘텐츠 추출 중...")
            
            # 모든 하위 요소를 순서대로 처리
            all_elements = await container.query_selector_all("*")
            
            for element in all_elements:
                tag_name = await element.evaluate("el => el.tagName.toLowerCase()")
                
                # 텍스트 요소 처리
                if tag_name in ['p', 'div']:
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
                            src = "https://bbs.ruliweb.com" + src
                            
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
            
            # 대체 방법으로 콘텐츠 추출
            if len(content) == 0:
                print("🔄 대체 방법으로 콘텐츠 추출 시도...")
                
                # 텍스트 요소들
                text_elements = await container.query_selector_all("p, div")
                for element in text_elements:
                    text = await extract_text_content(element)
                    if text and text.strip():
                        content.append({
                            "type": "text",
                            "order": order,
                            "data": {"text": text.strip()}
                        })
                        order += 1
                        print(f"  📝 텍스트 추가 (대체): {text[:50]}...")
                
                # 이미지들
                img_elements = await container.query_selector_all("img")
                for element in img_elements:
                    src = await extract_attribute(element, "src")
                    alt = await extract_attribute(element, "alt")
                    
                    if src:
                        if src.startswith("//"):
                            src = "https:" + src
                        elif src.startswith("/"):
                            src = "https://bbs.ruliweb.com" + src
                            
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
        """댓글 추출 (실제 HTML 구조 기반, 중복 제거)"""
        comments = []
        seen_comment_ids = set()  # 중복 제거를 위한 집합
        
        try:
            # 실제 HTML 구조에 맞는 댓글 컨테이너 선택
            comment_elements = await page.query_selector_all(".comment_table tbody tr.comment_element")
            print(f"🔍 댓글 요소 {len(comment_elements)}개 발견")
            
            for i, element in enumerate(comment_elements):
                comment_data = {}
                
                # 댓글 ID 추출 (실제 HTML에서 id 속성 사용)
                comment_id = await element.get_attribute("id")
                if comment_id:
                    # 중복 체크
                    if comment_id in seen_comment_ids:
                        print(f"  ⚠️ 중복 댓글 ID 발견, 건너뜀: {comment_id}")
                        continue
                    seen_comment_ids.add(comment_id)
                    comment_data["comment_id"] = comment_id
                else:
                    comment_data["comment_id"] = f"comment_{i}"
                    
                # 댓글 작성자 추출 (실제 HTML 구조 기반)
                author_selectors = [
                    ".user_info_wrapper .nick .nick_link strong",  # 실제 구조
                    ".nick_link strong",
                    ".nick a",
                    ".user_info_wrapper .nick a"
                ]
                
                author_found = False
                for author_selector in author_selectors:
                    author_element = await element.query_selector(author_selector)
                    if author_element:
                        author_text = await extract_text_content(author_element)
                        if author_text and author_text.strip():
                            comment_data["author"] = author_text.strip()
                            author_found = True
                            break
                            
                if not author_found:
                    comment_data["author"] = "익명"
                    
                # 댓글 내용 추출 (실제 HTML 구조 기반)
                content_selectors = [
                    ".text_wrapper .text",  # 실제 구조
                    ".comment .text",
                    ".text"
                ]
                
                content_found = False
                for content_selector in content_selectors:
                    content_element = await element.query_selector(content_selector)
                    if content_element:
                        content_text = await extract_text_content(content_element)
                        if content_text and content_text.strip():
                            comment_data["content"] = content_text.strip()
                            content_found = True
                            break
                            
                if not content_found:
                    comment_data["content"] = ""
                    
                # 댓글 작성일 추출 (실제 HTML 구조 기반)
                date_selectors = [
                    ".control_box .time",  # 실제 구조
                    ".parent_control_box_wrapper .control_box .time",
                    ".time",
                    ".regdate"
                ]
                
                date_found = False
                for date_selector in date_selectors:
                    date_element = await element.query_selector(date_selector)
                    if date_element:
                        date_text = await extract_text_content(date_element)
                        if date_text and date_text.strip():
                            comment_data["date"] = parse_date(date_text)
                            date_found = True
                            break
                            
                if not date_found:
                    comment_data["date"] = datetime.now(pytz.timezone('Asia/Seoul')).isoformat()
                    
                # 댓글 추천수 추출 (실제 HTML 구조 기반)
                recommend_selectors = [
                    ".btn_like .num",  # 실제 구조
                    ".control_box .btn_like .num",
                    ".parent_control_box_wrapper .control_box .btn_like .num"
                ]
                
                comment_data["up_count"] = 0
                for recommend_selector in recommend_selectors:
                    recommend_element = await element.query_selector(recommend_selector)
                    if recommend_element:
                        recommend_text = await extract_text_content(recommend_element)
                        if recommend_text and recommend_text.strip():
                            comment_data["up_count"] = parse_number(recommend_text)
                            break
                
                # 댓글 비추천수 추출 (실제 HTML 구조 기반)
                unrecommend_selectors = [
                    ".btn_dislike .num",  # 실제 구조
                    ".control_box .btn_dislike .num",
                    ".parent_control_box_wrapper .control_box .btn_dislike .num"
                ]
                
                comment_data["down_count"] = 0
                for unrecommend_selector in unrecommend_selectors:
                    unrecommend_element = await element.query_selector(unrecommend_selector)
                    if unrecommend_element:
                        unrecommend_text = await extract_text_content(unrecommend_element)
                        if unrecommend_text and unrecommend_text.strip():
                            comment_data["down_count"] = parse_number(unrecommend_text)
                            break
                    
                # 댓글 미디어 추출 (프로필 이미지 포함)
                media_list = []
                
                # 프로필 이미지 추출
                profile_img_element = await element.query_selector(".profile_image_m")
                if profile_img_element:
                    profile_src = await extract_attribute(profile_img_element, "src")
                    if profile_src:
                        # 상대 URL을 절대 URL로 변환
                        if profile_src.startswith("//"):
                            profile_src = "https:" + profile_src
                        elif profile_src.startswith("/"):
                            profile_src = "https://bbs.ruliweb.com" + profile_src
                            
                        media_list.append({
                            "type": "image",
                            "order": 0,
                            "data": {
                                "src": profile_src,
                                "alt": "프로필 이미지",
                                "width": "40",
                                "height": "40"
                            }
                        })
                
                # 댓글 내 다른 이미지들 추출
                img_elements = await element.query_selector_all(".text_wrapper img, .comment img")
                for j, img_element in enumerate(img_elements):
                    img_src = await extract_attribute(img_element, "src")
                    if img_src:
                        if img_src.startswith("//"):
                            img_src = "https:" + img_src
                        elif img_src.startswith("/"):
                            img_src = "https://bbs.ruliweb.com" + img_src
                            
                        media_list.append({
                            "type": "image",
                            "order": j + 1,
                            "data": {
                                "src": img_src,
                                "alt": f"댓글 이미지 {j+1}",
                                "width": "",
                                "height": ""
                            }
                        })
                        
                comment_data["media"] = media_list
                
                # 루리웹 댓글 구조 (대부분 1레벨, 답글 구조는 복잡함)
                comment_data["level"] = 1
                comment_data["is_reply"] = False
                comment_data["parent_comment_id"] = ""
                
                # 댓글이 유효한 경우에만 추가
                if comment_data["content"] or comment_data["media"]:
                    comments.append(comment_data)
                    print(f"  ✅ 댓글 {len(comments)}: {comment_data['author']} - {comment_data['content'][:30]}... (👍{comment_data['up_count']} 👎{comment_data['down_count']})")
                    
        except Exception as e:
            print(f"댓글 추출 오류: {e}")
            
        print(f"📝 총 {len(comments)}개 댓글 추출 완료 (중복 제거됨)")
        return comments
        
    async def scrape_post(self, url: str, config: Optional[Dict] = None) -> Dict:
        """개별 게시글 스크래핑"""
        if config is None:
            config = {}
            
        browser, page = await setup_browser(config)
        
        try:
            success = await navigate_to_page(page, url, config)
            if not success:
                return {}
                
            # 메타데이터 추출
            metadata = await self.extract_metadata(page)
            
            # 본문 콘텐츠 추출
            content = await self.extract_content(page)
            
            # 댓글 추출
            comments = await self.extract_comments(page)
            
            # 결과 구성
            result = {
                "post_id": parse_post_id(url),
                "post_url": url,
                "scraped_at": datetime.now(pytz.timezone('Asia/Seoul')).isoformat(),
                "metadata": metadata,
                "content": content,
                "comments": comments
            }
            
            return result
            
        except Exception as e:
            print(f"게시글 스크래핑 오류: {e}")
            return {}
        finally:
            await close_browser(browser)

# API 전송 함수
async def send_to_api(data: List[Dict], api_url: str) -> bool:
    """API로 데이터 전송"""
    try:
        response = requests.post(api_url, json=data, timeout=30)
        if response.status_code == 200:
            print(f"✅ API 전송 성공: {len(data)}개 게시글")
            return True
        else:
            print(f"❌ API 전송 실패: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ API 전송 오류: {e}")
        return False

# 메인 스크래핑 함수
async def scrape_ruliweb_politics_page(config: Optional[Dict] = None) -> List[Dict]:
    """루리웹 정치유머 게시판 스크래핑"""
    if config is None:
        config = {}
    
    page_url = "https://bbs.ruliweb.com/community/board/300148"
    print(f"🔍 루리웹 페이지 스크래핑 시작: {page_url}")
    
    browser, page = await setup_browser(config)
    
    try:
        # 게시글 목록 페이지 이동
        success = await navigate_to_page(page, page_url, config)
        if not success:
            return []
        
        # 게시글 목록 추출
        posts = await extract_post_list(page, RULIWEB_SELECTORS)
        
        # 상위 게시글 선별
        selected_posts = select_top_posts(posts, limit=config.get('post_limit', 10))
        print(f"📋 선별된 게시글 수: {len(selected_posts)}")
        
        await close_browser(browser)
        
        # 개별 게시글 스크래핑
        scraper = RuliwebScraper()
        results = []
        
        for i, post in enumerate(selected_posts, 1):
            post_url = post.get("url")
            if not post_url:
                continue
                
            print(f"📄 게시글 {i}/{len(selected_posts)} 스크래핑 중: {post.get('title', 'N/A')}")
            
            # 요청 간 지연
            if i > 1:
                delay = config.get('delay_between_requests', 3)
                await asyncio.sleep(delay)
            
            # 개별 게시글 스크래핑
            post_data = await scraper.scrape_post(post_url, config)
            
            if post_data:
                results.append(post_data)
                print(f"✅ 성공: {post_data['metadata']['title']}")
            else:
                print(f"❌ 실패: {post.get('title', 'N/A')}")
        
        # 결과 저장
        if results:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"ruliweb_politics_experiment_{timestamp}.json"
            
            # scraping/data 폴더에 저장
            data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
            os.makedirs(data_dir, exist_ok=True)
            filepath = os.path.join(data_dir, filename)
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
            
            print(f"💾 결과가 {filepath}에 저장되었습니다.")
            
            # API로 전송 (수정된 엔드포인트)
            api_url = config.get('api_url', 'http://localhost:3000/api/scraping-data')
            if api_url and results:
                print(f"🌐 API로 데이터 전송 중: {api_url}")
                try:
                    response = requests.post(api_url, json=results, timeout=30)
                    if response.status_code == 200:
                        print(f"✅ API 전송 성공: {len(results)}개 게시글")
                    else:
                        print(f"❌ API 전송 실패: {response.status_code} - {response.text}")
                except Exception as e:
                    print(f"❌ API 전송 오류: {e}")
        
        print(f"📊 최종 결과: {len(results)}/{len(selected_posts)} 성공")
        return results
        
    except Exception as e:
        print(f"스크래핑 오류: {e}")
        return []
    finally:
        try:
            await close_browser(browser)
        except:
            pass

if __name__ == "__main__":
    # 테스트 실행
    async def main():
        config = {
            'headless': True,
            'slow_mo': 1000,
            'wait_time': 2,
            'delay_between_requests': 3,
            'timeout': 45000,
            'post_limit': 5,
            'api_url': 'http://localhost:3000/api/scraping-data'
        }
        
        results = await scrape_ruliweb_politics_page(config)
        print(f"✅ 스크래핑 완료: {len(results)}개 게시글")
    
    asyncio.run(main()) 
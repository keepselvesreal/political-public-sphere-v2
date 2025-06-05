#!/usr/bin/env python3
"""
FMKorea 셀렉터 디버그 스크립트
실제 페이지 구조를 확인하여 올바른 셀렉터를 찾습니다.
"""

import asyncio
import sys
import os
from playwright.async_api import async_playwright

async def debug_fmkorea_page():
    """FMKorea 페이지 구조 디버그"""
    
    # 테스트할 URL (첨부된 JSON에서 댓글이 있는 게시글)
    test_url = "https://www.fmkorea.com/8476127692"  # 댓글 4개가 있는 게시글
    
    playwright = await async_playwright().start()
    browser = await playwright.chromium.launch(headless=False)  # 브라우저 창 표시
    page = await browser.new_page()
    
    try:
        print(f"🔍 페이지 로딩: {test_url}")
        await page.goto(test_url, wait_until='networkidle', timeout=30000)
        await asyncio.sleep(5)  # 페이지 완전 로딩 대기
        
        print("\n📋 페이지 구조 분석 중...")
        
        # 1. 본문 컨테이너 확인 (간단히)
        print("\n1. 본문 컨테이너:")
        xe_content = await page.query_selector(".xe_content")
        if xe_content:
            text = await xe_content.text_content()
            print(f"  ✅ .xe_content: 텍스트 길이 {len(text) if text else 0}")
        
        # 2. 댓글 관련 모든 요소 찾기
        print("\n2. 댓글 관련 요소 탐색:")
        
        # 일반적인 댓글 관련 클래스명들 검색
        comment_keywords = [
            "comment", "reply", "fdb", "feedback", 
            "lst", "list", "item", "content"
        ]
        
        for keyword in comment_keywords:
            try:
                # 클래스명에 키워드가 포함된 모든 요소 찾기
                elements = await page.query_selector_all(f"[class*='{keyword}']")
                if elements:
                    print(f"  🔍 '{keyword}' 포함 요소: {len(elements)}개")
                    
                    # 각 요소의 클래스명 출력
                    for i, elem in enumerate(elements[:5]):  # 처음 5개만
                        class_name = await elem.get_attribute("class")
                        tag_name = await elem.evaluate("el => el.tagName.toLowerCase()")
                        text = await elem.text_content()
                        text_preview = text[:50] if text else ""
                        print(f"    - {tag_name}.{class_name}: {text_preview}...")
            except Exception as e:
                print(f"  ❌ '{keyword}' 검색 오류: {e}")
        
        # 3. 특정 댓글 컨테이너 후보들 재확인
        print("\n3. 댓글 컨테이너 후보들 (확장):")
        comment_containers = [
            ".fdb_lst_ul li",
            ".fdb_lst_ul",
            "ul.fdb_lst_ul li",
            ".comment_list",
            ".comment-list",
            ".xe_comment",
            "#comment_list",
            "[class*='comment']",
            "[class*='fdb']",
            "li[class*='fdb']",
            "li[class*='comment']"
        ]
        
        for selector in comment_containers:
            try:
                elements = await page.query_selector_all(selector)
                if elements:
                    print(f"  ✅ {selector}: {len(elements)}개 발견")
                    
                    # 첫 번째 요소 상세 분석
                    if len(elements) > 0:
                        first_elem = elements[0]
                        text = await first_elem.text_content()
                        class_name = await first_elem.get_attribute("class")
                        id_name = await first_elem.get_attribute("id")
                        
                        print(f"     - 클래스: {class_name}")
                        print(f"     - ID: {id_name}")
                        print(f"     - 텍스트: {text[:100] if text else 'N/A'}...")
                        
                        # 하위 요소들 확인
                        sub_elements = await first_elem.query_selector_all("*")
                        print(f"     - 하위 요소: {len(sub_elements)}개")
                else:
                    print(f"  ❌ {selector}: 찾을 수 없음")
            except Exception as e:
                print(f"  ❌ {selector}: 오류 - {e}")
        
        # 4. 페이지 전체에서 "comment" 텍스트가 포함된 요소 찾기
        print("\n4. 'comment' 텍스트 포함 요소:")
        try:
            # JavaScript로 모든 요소 검색
            comment_elements = await page.evaluate("""
                () => {
                    const elements = [];
                    const walker = document.createTreeWalker(
                        document.body,
                        NodeFilter.SHOW_ELEMENT,
                        null,
                        false
                    );
                    
                    let node;
                    while (node = walker.nextNode()) {
                        const className = node.className || '';
                        const id = node.id || '';
                        const tagName = node.tagName.toLowerCase();
                        
                        if (className.includes('comment') || 
                            className.includes('fdb') || 
                            id.includes('comment') ||
                            tagName === 'li') {
                            elements.push({
                                tag: tagName,
                                class: className,
                                id: id,
                                text: node.textContent ? node.textContent.substring(0, 100) : ''
                            });
                        }
                    }
                    return elements.slice(0, 20);  // 처음 20개만
                }
            """)
            
            for elem in comment_elements:
                if elem['text'].strip():
                    print(f"  - {elem['tag']}.{elem['class']}#{elem['id']}: {elem['text'][:50]}...")
                    
        except Exception as e:
            print(f"JavaScript 검색 오류: {e}")
        
        print("\n✅ 디버그 완료. 브라우저를 수동으로 확인하세요.")
        print("Enter를 눌러 종료...")
        input()
        
    except Exception as e:
        print(f"❌ 디버그 오류: {e}")
        
    finally:
        await browser.close()

if __name__ == "__main__":
    asyncio.run(debug_fmkorea_page()) 
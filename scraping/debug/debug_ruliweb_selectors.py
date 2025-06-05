#!/usr/bin/env python3
"""
루리웹 HTML 구조 디버그 스크립트

목적: 루리웹 정치유머 게시판의 HTML 구조를 분석하여 정확한 CSS 셀렉터를 찾습니다.
대상: https://bbs.ruliweb.com/community/board/300148
개별 게시글: https://bbs.ruliweb.com/community/board/300148/read/38065511

작성자: AI Assistant
작성일: 2025년 6월 4일 17:40 (KST)
"""

import asyncio
from playwright.async_api import async_playwright
import json

async def debug_ruliweb_structure():
    """루리웹 HTML 구조 분석"""
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        
        try:
            print("🔍 루리웹 정치유머 게시판 분석 시작...")
            
            # 1. 게시글 목록 페이지 분석
            print("\n📋 게시글 목록 페이지 분석...")
            await page.goto("https://bbs.ruliweb.com/community/board/300148", wait_until="networkidle")
            await page.wait_for_timeout(3000)
            
            # 게시글 목록 구조 분석
            print("\n🔍 게시글 목록 요소 분석:")
            
            # 게시글 행들 찾기
            post_rows = await page.query_selector_all("tr.table_body.blocktarget")
            print(f"  - 게시글 행 수: {len(post_rows)}")
            
            if post_rows:
                first_row = post_rows[0]
                
                # 제목 링크 분석
                title_link = await first_row.query_selector("td.subject a.subject_link")
                if title_link:
                    title = await title_link.text_content()
                    href = await title_link.get_attribute("href")
                    print(f"  - 제목: {title[:50]}...")
                    print(f"  - 링크: {href}")
                
                # 작성자 분석
                author_element = await first_row.query_selector("td.writer a")
                if author_element:
                    author = await author_element.text_content()
                    print(f"  - 작성자: {author}")
                
                # 추천수 분석
                recommend_element = await first_row.query_selector("td.recomd")
                if recommend_element:
                    recommend = await recommend_element.text_content()
                    print(f"  - 추천수: {recommend}")
                
                # 조회수 분석
                hit_element = await first_row.query_selector("td.hit")
                if hit_element:
                    hit = await hit_element.text_content()
                    print(f"  - 조회수: {hit}")
                
                # 날짜 분석
                time_element = await first_row.query_selector("td.time")
                if time_element:
                    time_text = await time_element.text_content()
                    print(f"  - 날짜: {time_text}")
            
            # 2. 개별 게시글 페이지 분석
            print("\n📄 개별 게시글 페이지 분석...")
            await page.goto("https://bbs.ruliweb.com/community/board/300148/read/38065511", wait_until="networkidle")
            await page.wait_for_timeout(3000)
            
            # 게시글 메타데이터 분석
            print("\n🔍 게시글 메타데이터 분석:")
            
            # 제목
            title_element = await page.query_selector(".board_main_view .subject_inner")
            if title_element:
                title = await title_element.text_content()
                print(f"  - 제목: {title}")
            
            # 작성자
            author_element = await page.query_selector(".board_main_view .writer")
            if author_element:
                author = await author_element.text_content()
                print(f"  - 작성자: {author}")
            
            # 작성일
            date_element = await page.query_selector(".board_main_view .regdate")
            if date_element:
                date = await date_element.text_content()
                print(f"  - 작성일: {date}")
            
            # 조회수, 추천수 등
            info_elements = await page.query_selector_all(".board_main_view .board_info span")
            for info in info_elements:
                info_text = await info.text_content()
                print(f"  - 정보: {info_text}")
            
            # 본문 내용 분석
            print("\n🔍 본문 내용 분석:")
            content_element = await page.query_selector(".board_main_view .view_content")
            if content_element:
                # 텍스트 요소들
                text_elements = await content_element.query_selector_all("p, div")
                print(f"  - 텍스트 요소 수: {len(text_elements)}")
                
                # 이미지 요소들
                img_elements = await content_element.query_selector_all("img")
                print(f"  - 이미지 요소 수: {len(img_elements)}")
                
                if img_elements:
                    first_img = img_elements[0]
                    img_src = await first_img.get_attribute("src")
                    print(f"  - 첫 번째 이미지: {img_src}")
                
                # 전체 HTML 구조 확인
                content_html = await content_element.inner_html()
                print(f"  - 본문 HTML 길이: {len(content_html)} 문자")
            
            # 댓글 분석
            print("\n🔍 댓글 분석:")
            comment_elements = await page.query_selector_all(".comment_view .comment_element")
            print(f"  - 댓글 요소 수: {len(comment_elements)}")
            
            if comment_elements:
                first_comment = comment_elements[0]
                
                # 댓글 작성자
                comment_author = await first_comment.query_selector(".comment_writer")
                if comment_author:
                    author_text = await comment_author.text_content()
                    print(f"  - 댓글 작성자: {author_text}")
                
                # 댓글 내용
                comment_content = await first_comment.query_selector(".comment_content")
                if comment_content:
                    content_text = await comment_content.text_content()
                    print(f"  - 댓글 내용: {content_text[:50]}...")
                
                # 댓글 날짜
                comment_date = await first_comment.query_selector(".comment_regdate")
                if comment_date:
                    date_text = await comment_date.text_content()
                    print(f"  - 댓글 날짜: {date_text}")
            
            # 셀렉터 정보 저장
            selectors = {
                "list_page": {
                    "post_rows": "tr.table_body.blocktarget",
                    "title": "td.subject a.subject_link",
                    "author": "td.writer a",
                    "recommend": "td.recomd",
                    "hit": "td.hit",
                    "time": "td.time",
                    "category": "td.divsn a"
                },
                "detail_page": {
                    "title": ".board_main_view .subject_inner",
                    "author": ".board_main_view .writer",
                    "date": ".board_main_view .regdate",
                    "content": ".board_main_view .view_content",
                    "info": ".board_main_view .board_info span"
                },
                "comments": {
                    "container": ".comment_view .comment_element",
                    "author": ".comment_writer",
                    "content": ".comment_content",
                    "date": ".comment_regdate"
                }
            }
            
            # 결과 저장
            with open("ruliweb_selectors_debug.json", "w", encoding="utf-8") as f:
                json.dump(selectors, f, ensure_ascii=False, indent=2)
            
            print(f"\n✅ 분석 완료! 셀렉터 정보가 ruliweb_selectors_debug.json에 저장되었습니다.")
            
        except Exception as e:
            print(f"❌ 분석 중 오류 발생: {e}")
            import traceback
            traceback.print_exc()
        
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(debug_ruliweb_structure()) 
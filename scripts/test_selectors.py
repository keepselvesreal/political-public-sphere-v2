"""
셀렉터 테스트 스크립트

주요 기능:
- 실제 게시글 페이지 구조 분석 (line 20-40)
- 본문 컨테이너 셀렉터 테스트 (line 41-80)
- 댓글 컨테이너 셀렉터 테스트 (line 81-120)

작성자: AI Assistant
작성일: 2025-01-28
목적: 올바른 셀렉터 찾기
"""

import asyncio
from playwright.async_api import async_playwright
from loguru import logger


async def test_fmkorea_selectors():
    """FM코리아 게시글 페이지에서 셀렉터 테스트"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # 최근 스크래핑된 FM코리아 게시글 URL 사용
        test_url = "https://www.fmkorea.com/8468474639"
        
        try:
            logger.info(f"🔍 FM코리아 페이지 분석: {test_url}")
            await page.goto(test_url, wait_until='networkidle')
            
            # 페이지 제목 확인
            title = await page.title()
            logger.info(f"페이지 제목: {title}")
            
            # 다양한 본문 컨테이너 셀렉터 테스트
            content_selectors = [
                '.xe_content .document_content',
                '.document_content',
                '.content',
                'article',
                '.rd_body',
                '.xe_content',
                '#article_content',
                '.article_content',
                '.post_content',
                '.board_content',
                'main .content',
                '.view_content'
            ]
            
            logger.info("📋 본문 컨테이너 셀렉터 테스트:")
            found_selectors = []
            
            for selector in content_selectors:
                try:
                    element = await page.query_selector(selector)
                    if element:
                        text_content = await element.inner_text()
                        if text_content and len(text_content.strip()) > 10:
                            logger.info(f"✅ {selector}: {len(text_content)}자")
                            found_selectors.append(selector)
                        else:
                            logger.info(f"⚠️ {selector}: 빈 내용")
                    else:
                        logger.info(f"❌ {selector}: 요소 없음")
                except Exception as e:
                    logger.info(f"💥 {selector}: 오류 - {e}")
            
            # 댓글 컨테이너 셀렉터 테스트
            comment_selectors = [
                '.comment_list',
                '.comments',
                '#comment_list',
                '.reply_list',
                '.comment_area',
                '.comment_wrap',
                '.comment_container'
            ]
            
            logger.info("\n💬 댓글 컨테이너 셀렉터 테스트:")
            
            for selector in comment_selectors:
                try:
                    element = await page.query_selector(selector)
                    if element:
                        comments = await element.query_selector_all('.comment, .reply, li')
                        logger.info(f"✅ {selector}: {len(comments)}개 댓글 요소")
                    else:
                        logger.info(f"❌ {selector}: 요소 없음")
                except Exception as e:
                    logger.info(f"💥 {selector}: 오류 - {e}")
            
            # 페이지 HTML 구조 일부 출력 (디버깅용)
            logger.info("\n🔍 페이지 HTML 구조 샘플:")
            body_html = await page.evaluate('() => document.body.innerHTML.substring(0, 2000)')
            logger.info(f"Body HTML (첫 2000자): {body_html}")
            
        except Exception as e:
            logger.error(f"💥 FM코리아 페이지 분석 실패: {e}")
        finally:
            await browser.close()


async def test_ruliweb_selectors():
    """루리웹 게시글 페이지에서 셀렉터 테스트"""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # 최근 스크래핑된 루리웹 게시글 URL 사용
        test_url = "https://bbs.ruliweb.com/community/board/300148/read/38050316?"
        
        try:
            logger.info(f"🔍 루리웹 페이지 분석: {test_url}")
            await page.goto(test_url, wait_until='networkidle')
            
            # 페이지 제목 확인
            title = await page.title()
            logger.info(f"페이지 제목: {title}")
            
            # 다양한 본문 컨테이너 셀렉터 테스트
            content_selectors = [
                '.view_content .article_content',
                '.article_content',
                '.content',
                '.view_content',
                '.board_content',
                '.post_content',
                'article',
                '.text_content'
            ]
            
            logger.info("📋 본문 컨테이너 셀렉터 테스트:")
            
            for selector in content_selectors:
                try:
                    element = await page.query_selector(selector)
                    if element:
                        text_content = await element.inner_text()
                        if text_content and len(text_content.strip()) > 10:
                            logger.info(f"✅ {selector}: {len(text_content)}자")
                        else:
                            logger.info(f"⚠️ {selector}: 빈 내용")
                    else:
                        logger.info(f"❌ {selector}: 요소 없음")
                except Exception as e:
                    logger.info(f"💥 {selector}: 오류 - {e}")
            
            # 댓글 컨테이너 셀렉터 테스트
            comment_selectors = [
                '.comment_list',
                '.comments',
                '.reply_list',
                '.comment_area',
                '.comment_wrap',
                '.comment_container',
                '.board_comment'
            ]
            
            logger.info("\n💬 댓글 컨테이너 셀렉터 테스트:")
            
            for selector in comment_selectors:
                try:
                    element = await page.query_selector(selector)
                    if element:
                        comments = await element.query_selector_all('.comment, .reply, li, .comment_item')
                        logger.info(f"✅ {selector}: {len(comments)}개 댓글 요소")
                    else:
                        logger.info(f"❌ {selector}: 요소 없음")
                except Exception as e:
                    logger.info(f"💥 {selector}: 오류 - {e}")
            
        except Exception as e:
            logger.error(f"💥 루리웹 페이지 분석 실패: {e}")
        finally:
            await browser.close()


async def main():
    """메인 실행 함수"""
    logger.info("🚀 셀렉터 테스트 시작")
    
    logger.info("="*60)
    await test_fmkorea_selectors()
    
    logger.info("="*60)
    await test_ruliweb_selectors()
    
    logger.info("✅ 셀렉터 테스트 완료")


if __name__ == "__main__":
    asyncio.run(main()) 
#!/usr/bin/env python3
"""
Playwright-Stealth 테스트 스크래퍼

목적: 제공된 HTML 구조를 기반으로 스크래핑 성공 여부 테스트
작성일: 2025년 6월 5일 10:45 (KST)
"""

import asyncio
import sys
import os
from datetime import datetime
from typing import List, Dict, Optional
from urllib.parse import urljoin

from playwright.async_api import async_playwright, Browser, Page
from playwright_stealth import stealth_async

class StealthTestScraper:
    """Playwright-Stealth 테스트 스크래퍼"""
    
    def __init__(self):
        self.base_url = 'https://www.fmkorea.com'
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.playwright = None
    
    async def __aenter__(self):
        await self.setup_browser()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close_browser()
    
    async def setup_browser(self):
        """브라우저 설정 (Stealth 모드 적용)"""
        try:
            self.playwright = await async_playwright().start()
            
            # 브라우저 옵션 설정 (기존 성공한 스크래퍼와 동일)
            self.browser = await self.playwright.chromium.launch(
                headless=False,  # 헤드리스 모드 해제
                args=[
                    '--no-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-blink-features=AutomationControlled',
                    '--window-size=1920,1080',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            )
            
            # 새 페이지 생성
            self.page = await self.browser.new_page()
            
            # Stealth 모드 적용
            await stealth_async(self.page)
            
            # 추가 설정
            await self.page.set_viewport_size({"width": 1920, "height": 1080})
            await self.page.set_extra_http_headers({
                'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
            })
            
            print("✅ Stealth 브라우저 설정 완료")
            
        except Exception as e:
            print(f"❌ 브라우저 설정 실패: {e}")
            raise
    
    async def close_browser(self):
        """브라우저 종료"""
        try:
            if self.page:
                await self.page.close()
                self.page = None
                
            if self.browser:
                await self.browser.close()
                self.browser = None
                
            if self.playwright:
                await self.playwright.stop()
                self.playwright = None
                
            print("✅ 브라우저 종료 완료")
            
        except Exception as e:
            print(f"⚠️ 브라우저 종료 중 오류: {e}")
    
    async def test_fmkorea_politics_page(self) -> bool:
        """FM코리아 정치 게시판 테스트"""
        try:
            url = 'https://www.fmkorea.com/politics'
            print(f"🔍 페이지 접속 시도: {url}")
            
            # 페이지 이동 (타임아웃 증가)
            await self.page.goto(url, wait_until="networkidle", timeout=60000)
            
            # 페이지 로드 확인
            page_title = await self.page.title()
            print(f"📄 페이지 제목: {page_title}")
            
            # 게시글 목록 테이블 확인 (제공된 HTML 구조 기반)
            table_selector = 'table.bd_lst.bd_tb_lst.bd_tb'
            table_element = await self.page.query_selector(table_selector)
            
            if not table_element:
                print("❌ 게시글 목록 테이블을 찾을 수 없습니다.")
                return False
            
            print("✅ 게시글 목록 테이블 발견")
            
            # 게시글 행들 추출 (공지사항 제외)
            post_rows = await self.page.query_selector_all('table.bd_lst tbody tr:not(.notice)')
            
            if not post_rows:
                print("❌ 게시글 행을 찾을 수 없습니다.")
                return False
            
            print(f"✅ 게시글 행 발견: {len(post_rows)}개")
            
            # 첫 번째 게시글 정보 추출 테스트
            first_post = await self.extract_post_info(post_rows[0])
            
            if first_post:
                print("✅ 게시글 정보 추출 성공:")
                print(f"   - 제목: {first_post.get('title', 'N/A')[:50]}...")
                print(f"   - 작성자: {first_post.get('author', 'N/A')}")
                print(f"   - 조회수: {first_post.get('view_count', 0)}")
                print(f"   - 추천수: {first_post.get('up_count', 0)}")
                return True
            else:
                print("❌ 게시글 정보 추출 실패")
                return False
                
        except Exception as e:
            print(f"❌ 테스트 실패: {e}")
            return False
    
    async def extract_post_info(self, row_element) -> Optional[Dict]:
        """게시글 정보 추출 (제공된 HTML 구조 기반)"""
        try:
            post_info = {}
            
            # 카테고리 추출
            try:
                cate_element = await row_element.query_selector('td.cate a')
                if cate_element:
                    category = await cate_element.inner_text()
                    post_info['category'] = category.strip()
            except:
                post_info['category'] = ''
            
            # 제목 및 URL 추출
            try:
                title_element = await row_element.query_selector('td.title a')
                if title_element:
                    title = await title_element.inner_text()
                    href = await title_element.get_attribute('href')
                    
                    post_info['title'] = title.strip()
                    
                    # 절대 URL로 변환
                    if href:
                        if href.startswith('/'):
                            post_info['url'] = urljoin(self.base_url, href)
                        else:
                            post_info['url'] = href
                        
                        # 게시글 ID 추출
                        if '/' in href:
                            post_id = href.split('/')[-1]
                            post_info['post_id'] = post_id
                else:
                    return None
            except:
                return None
            
            # 댓글 수 추출 (제목 옆의 replyNum)
            try:
                reply_element = await row_element.query_selector('td.title a.replyNum')
                if reply_element:
                    reply_text = await reply_element.inner_text()
                    post_info['comment_count'] = int(reply_text) if reply_text.isdigit() else 0
                else:
                    post_info['comment_count'] = 0
            except:
                post_info['comment_count'] = 0
            
            # 작성자 추출
            try:
                author_element = await row_element.query_selector('td.author a.member_plate')
                if author_element:
                    author = await author_element.inner_text()
                    post_info['author'] = author.strip()
                else:
                    post_info['author'] = ''
            except:
                post_info['author'] = ''
            
            # 작성시간 추출
            try:
                time_element = await row_element.query_selector('td.time')
                if time_element:
                    time_text = await time_element.inner_text()
                    post_info['date'] = time_text.strip()
                else:
                    post_info['date'] = ''
            except:
                post_info['date'] = ''
            
            # 조회수 추출
            try:
                view_elements = await row_element.query_selector_all('td.m_no')
                if len(view_elements) >= 1:
                    view_text = await view_elements[0].inner_text()
                    post_info['view_count'] = int(view_text.strip()) if view_text.strip().isdigit() else 0
                else:
                    post_info['view_count'] = 0
            except:
                post_info['view_count'] = 0
            
            # 추천수 추출 (마지막 td.m_no)
            try:
                vote_elements = await row_element.query_selector_all('td.m_no')
                if len(vote_elements) >= 2:
                    vote_text = await vote_elements[-1].inner_text()
                    vote_text = vote_text.strip()
                    
                    # 비추천수 처리 (음수)
                    if vote_text.startswith('-'):
                        post_info['up_count'] = 0
                        post_info['down_count'] = abs(int(vote_text)) if vote_text[1:].isdigit() else 0
                    elif vote_text.isdigit():
                        post_info['up_count'] = int(vote_text)
                        post_info['down_count'] = 0
                    else:
                        post_info['up_count'] = 0
                        post_info['down_count'] = 0
                else:
                    post_info['up_count'] = 0
                    post_info['down_count'] = 0
            except:
                post_info['up_count'] = 0
                post_info['down_count'] = 0
            
            return post_info
            
        except Exception as e:
            print(f"⚠️ 게시글 정보 추출 실패: {e}")
            return None
    
    async def test_ruliweb_politics_page(self) -> bool:
        """루리웹 정치유머 게시판 테스트"""
        try:
            url = 'https://bbs.ruliweb.com/community/board/300148'
            print(f"🔍 루리웹 페이지 접속 시도: {url}")
            
            # 페이지 이동 (타임아웃 증가)
            await self.page.goto(url, wait_until="networkidle", timeout=60000)
            
            # 페이지 로드 확인
            page_title = await self.page.title()
            print(f"📄 페이지 제목: {page_title}")
            
            # 게시글 목록 테이블 확인
            table_selector = '.board_list_table'
            table_element = await self.page.query_selector(table_selector)
            
            if not table_element:
                print("❌ 루리웹 게시글 목록 테이블을 찾을 수 없습니다.")
                return False
            
            print("✅ 루리웹 게시글 목록 테이블 발견")
            
            # 게시글 행들 추출
            post_rows = await self.page.query_selector_all('.board_list_table tbody tr.table_body:not(.notice)')
            
            if not post_rows:
                print("❌ 루리웹 게시글 행을 찾을 수 없습니다.")
                return False
            
            print(f"✅ 루리웹 게시글 행 발견: {len(post_rows)}개")
            return True
                
        except Exception as e:
            print(f"❌ 루리웹 테스트 실패: {e}")
            return False

async def main():
    """메인 테스트 함수"""
    print('🚀 Playwright-Stealth 테스트 시작')
    print(f'⏰ 시작 시간: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    print()
    
    async with StealthTestScraper() as scraper:
        # FM코리아 테스트
        print('🧪 FM코리아 정치 게시판 테스트')
        print('=' * 50)
        fmkorea_success = await scraper.test_fmkorea_politics_page()
        print()
        
        # 루리웹 테스트
        print('🧪 루리웹 정치유머 게시판 테스트')
        print('=' * 50)
        ruliweb_success = await scraper.test_ruliweb_politics_page()
        print()
        
        # 결과 요약
        print('📊 테스트 결과 요약')
        print('=' * 50)
        print(f'FM코리아 Stealth 테스트: {"✅ 성공" if fmkorea_success else "❌ 실패"}')
        print(f'루리웹 Stealth 테스트: {"✅ 성공" if ruliweb_success else "❌ 실패"}')
        
        if fmkorea_success or ruliweb_success:
            print()
            print('🔍 성공한 설정 분석')
            print('=' * 50)
            print('성공 요인:')
            print('  - playwright-stealth 적용')
            print('  - 헤드리스 모드 해제 (headless=False)')
            print('  - 추가 브라우저 인수 설정')
            print('  - 상세한 HTTP 헤더 설정')
            print('  - 타임아웃 증가 (60초)')
            print('  - 제공된 HTML 구조 기반 셀렉터 사용')
            
            return fmkorea_success, ruliweb_success
        else:
            print('❌ 모든 테스트 실패')
            return False, False
    
    print()
    print(f'⏰ 완료 시간: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')

if __name__ == "__main__":
    asyncio.run(main()) 
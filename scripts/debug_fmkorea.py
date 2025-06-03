"""
FM코리아 HTML 구조 디버깅 스크립트

목적: 실제 HTML 구조를 분석하여 올바른 셀렉터 찾기
"""

import asyncio
import sys
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from scraping.scrapers.fmkorea_scraper_v2 import FMKoreaScraper
from loguru import logger


async def debug_fmkorea_structure():
    """FM코리아 HTML 구조 디버깅"""
    logger.info("🔍 FM코리아 HTML 구조 디버깅 시작")
    
    board_url = "https://www.fmkorea.com/best"
    
    try:
        async with FMKoreaScraper() as scraper:
            await scraper.page.goto(board_url, wait_until='networkidle')
            await asyncio.sleep(3)
            
            # 페이지 기본 정보
            title = await scraper.page.title()
            logger.info(f"페이지 제목: {title}")
            
            # 테이블 구조 확인
            tables = await scraper.page.query_selector_all('table')
            logger.info(f"테이블 개수: {len(tables)}")
            
            for i, table in enumerate(tables):
                try:
                    table_class = await table.get_attribute('class')
                    table_id = await table.get_attribute('id')
                    logger.info(f"테이블 {i+1}: class='{table_class}', id='{table_id}'")
                    
                    # 테이블 내 tr 개수 확인
                    rows = await table.query_selector_all('tr')
                    logger.info(f"  - 행 개수: {len(rows)}")
                    
                    if len(rows) > 0:
                        # 첫 번째 행의 구조 확인
                        first_row = rows[0]
                        cells = await first_row.query_selector_all('td, th')
                        logger.info(f"  - 첫 번째 행 셀 개수: {len(cells)}")
                        
                        for j, cell in enumerate(cells[:5]):  # 처음 5개 셀만
                            cell_text = await cell.inner_text()
                            cell_class = await cell.get_attribute('class')
                            logger.info(f"    셀 {j+1}: '{cell_text[:20]}...' (class: {cell_class})")
                
                except Exception as e:
                    logger.error(f"테이블 {i+1} 분석 실패: {e}")
            
            # 게시글 링크 패턴 확인
            links = await scraper.page.query_selector_all('a[href*="document_srl"], a[href*="/"]')
            logger.info(f"링크 개수: {len(links)}")
            
            for i, link in enumerate(links[:10]):  # 처음 10개만
                try:
                    href = await link.get_attribute('href')
                    text = await link.inner_text()
                    if text and len(text.strip()) > 5:  # 의미있는 텍스트만
                        logger.info(f"링크 {i+1}: '{text[:30]}...' -> {href}")
                except:
                    continue
            
            # 특정 클래스나 ID 요소 확인
            potential_selectors = [
                '.board_list',
                '.list_table',
                '.document_list',
                '#board_list',
                '.xe-content-list',
                'tbody tr',
                '.list-group',
                '.post-list'
            ]
            
            for selector in potential_selectors:
                try:
                    elements = await scraper.page.query_selector_all(selector)
                    if elements:
                        logger.info(f"셀렉터 '{selector}': {len(elements)}개 요소 발견")
                        
                        if selector == 'tbody tr' and len(elements) > 0:
                            # tbody tr의 구조 상세 분석
                            for i, row in enumerate(elements[:3]):
                                cells = await row.query_selector_all('td')
                                logger.info(f"  행 {i+1}: {len(cells)}개 셀")
                                for j, cell in enumerate(cells):
                                    cell_text = await cell.inner_text()
                                    cell_class = await cell.get_attribute('class')
                                    if cell_text.strip():
                                        logger.info(f"    셀 {j+1}: '{cell_text[:30]}...' (class: {cell_class})")
                except:
                    continue
            
            # 페이지 HTML 저장 (디버깅용)
            html_content = await scraper.page.content()
            with open('debug_fmkorea.html', 'w', encoding='utf-8') as f:
                f.write(html_content)
            logger.info("HTML 내용을 debug_fmkorea.html에 저장했습니다.")
            
    except Exception as e:
        logger.error(f"디버깅 실패: {e}")


if __name__ == "__main__":
    asyncio.run(debug_fmkorea_structure()) 
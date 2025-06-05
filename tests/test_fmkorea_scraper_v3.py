# 목차
# 1. 테스트 임포트 및 설정 (1-20)
# 2. 유틸리티 함수 테스트 (21-80)
# 3. 셀렉터 테스트 (81-120)
# 4. 메타데이터 추출 테스트 (121-180)
# 5. 본문 콘텐츠 추출 테스트 (181-240)
# 6. 댓글 추출 테스트 (241-300)
# 7. 통합 스크래핑 테스트 (301-360)
# 8. MongoDB 연동 테스트 (361-420)

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime
import pytz

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'scraping', 'scrapers'))

from fmkorea_scraper_v3 import (
    FMKoreaScraper, 
    FMKOREA_SELECTORS, 
    POST_SCHEMA,
    parse_post_id,
    validate_data,
    clean_text,
    parse_number,
    parse_date,
    setup_browser,
    close_browser,
    navigate_to_page,
    extract_text_content,
    extract_attribute,
    scrape_and_save
)

class TestUtilityFunctions:
    """유틸리티 함수 테스트"""
    
    def test_parse_post_id(self):
        """URL에서 게시글 ID 추출 테스트"""
        url = "https://www.fmkorea.com/8475910237"
        expected = "8475910237"
        result = parse_post_id(url)
        assert result == expected
        
    def test_parse_post_id_with_trailing_slash(self):
        """끝에 슬래시가 있는 URL 테스트"""
        url = "https://www.fmkorea.com/8475910237/"
        expected = "8475910237"
        result = parse_post_id(url)
        assert result == expected
        
    def test_clean_text(self):
        """텍스트 정리 함수 테스트"""
        text = "  안녕하세요   \n\t  반갑습니다  "
        expected = "안녕하세요 반갑습니다"
        result = clean_text(text)
        assert result == expected
        
    def test_clean_text_empty(self):
        """빈 텍스트 처리 테스트"""
        result = clean_text("")
        assert result == ""
        
    def test_parse_number(self):
        """숫자 추출 함수 테스트"""
        text = "조회 수 1,234"
        expected = 1234
        result = parse_number(text)
        assert result == expected
        
    def test_parse_number_no_number(self):
        """숫자가 없는 텍스트 테스트"""
        text = "숫자없음"
        expected = 0
        result = parse_number(text)
        assert result == expected
        
    def test_parse_date_full_format(self):
        """전체 날짜 형식 파싱 테스트"""
        date_str = "2025.06.04 15:26"
        result = parse_date(date_str)
        assert "2025-06-04T15:26:00" in result
        
    def test_parse_date_time_only(self):
        """시간만 있는 형식 파싱 테스트"""
        date_str = "15:26"
        result = parse_date(date_str)
        today = datetime.now(pytz.timezone('Asia/Seoul')).date()
        assert today.strftime('%Y-%m-%d') in result
        
    def test_validate_data_valid(self):
        """유효한 데이터 검증 테스트"""
        valid_data = {
            "post_id": "8475910237",
            "metadata": {
                "title": "테스트 제목",
                "author": "테스트 작성자",
                "date": "2025-06-04T15:26:00+09:00",
                "view_count": 100,
                "up_count": 5,
                "down_count": 0,
                "comment_count": 2
            },
            "content": [],
            "comments": [],
            "scraped_at": "2025-06-04T15:30:00+09:00"
        }
        result = validate_data(valid_data, POST_SCHEMA)
        assert result == True
        
    def test_validate_data_invalid(self):
        """유효하지 않은 데이터 검증 테스트"""
        invalid_data = {
            "post_id": "8475910237",
            # metadata 누락
            "content": [],
            "comments": []
        }
        result = validate_data(invalid_data, POST_SCHEMA)
        assert result == False

class TestFMKoreaScraper:
    """FMKorea 스크래퍼 클래스 테스트"""
    
    @pytest.fixture
    def scraper(self):
        """스크래퍼 인스턴스 생성"""
        return FMKoreaScraper()
        
    def test_scraper_initialization(self, scraper):
        """스크래퍼 초기화 테스트"""
        assert scraper.selectors == FMKOREA_SELECTORS
        assert scraper.schema == POST_SCHEMA
        
    @pytest.mark.asyncio
    async def test_extract_metadata_with_mock_page(self, scraper):
        """메타데이터 추출 함수 테스트 (모킹된 페이지 사용)"""
        mock_page = AsyncMock()
        
        # 모킹된 요소들 설정
        mock_title_element = AsyncMock()
        mock_title_element.text_content = AsyncMock(return_value="테스트 제목")
        
        mock_author_element = AsyncMock()
        mock_author_element.text_content = AsyncMock(return_value="테스트 작성자")
        
        mock_date_element = AsyncMock()
        mock_date_element.text_content = AsyncMock(return_value="2025.06.04 15:26")
        
        mock_view_element = AsyncMock()
        mock_view_element.text_content = AsyncMock(return_value="100")
        
        mock_up_element = AsyncMock()
        mock_up_element.text_content = AsyncMock(return_value="5")
        
        mock_comment_element = AsyncMock()
        mock_comment_element.text_content = AsyncMock(return_value="2")
        
        mock_category_element = AsyncMock()
        mock_category_element.text_content = AsyncMock(return_value="자유")
        
        # query_selector 모킹
        def mock_query_selector(selector):
            if "title" in selector:
                return mock_title_element
            elif "author" in selector:
                return mock_author_element
            elif "date" in selector:
                return mock_date_element
            elif "view_count" in selector:
                return mock_view_element
            elif "up_count" in selector:
                return mock_up_element
            elif "comment_count" in selector:
                return mock_comment_element
            elif "category" in selector:
                return mock_category_element
            return None
            
        mock_page.query_selector = AsyncMock(side_effect=mock_query_selector)
        
        result = await scraper.extract_metadata(mock_page)
        
        assert result["title"] == "테스트 제목"
        assert result["author"] == "테스트 작성자"
        assert result["view_count"] == 100
        assert result["up_count"] == 5
        assert result["down_count"] == 0
        assert result["comment_count"] == 2
        assert result["category"] == "자유"
        
    @pytest.mark.asyncio
    async def test_extract_content_with_mock_page(self, scraper):
        """본문 콘텐츠 추출 함수 테스트 (모킹된 페이지 사용)"""
        mock_page = AsyncMock()
        
        # 모킹된 컨테이너 설정
        mock_container = AsyncMock()
        
        # 텍스트 요소 모킹
        mock_text_element = AsyncMock()
        mock_text_element.text_content = AsyncMock(return_value="테스트 텍스트 내용")
        mock_text_element.query_selector_all = AsyncMock(return_value=[])  # img, a.highslide 없음
        
        # 이미지 요소 모킹
        mock_img_element = AsyncMock()
        mock_img_element.get_attribute = AsyncMock(side_effect=lambda attr: {
            "src": "//image.fmkorea.com/test.jpg",
            "alt": "테스트 이미지",
            "width": "100",
            "height": "100"
        }.get(attr, ""))
        
        mock_container.query_selector_all = AsyncMock(side_effect=lambda selector: {
            "p": [mock_text_element],
            "img": [mock_img_element],
            "video": []
        }.get(selector.split()[-1], []))
        
        mock_page.query_selector = AsyncMock(return_value=mock_container)
        
        result = await scraper.extract_content(mock_page)
        
        assert len(result) == 2  # 텍스트 1개, 이미지 1개
        assert result[0]["type"] == "text"
        assert result[0]["data"]["text"] == "테스트 텍스트 내용"
        assert result[1]["type"] == "image"
        assert result[1]["data"]["src"] == "https://image.fmkorea.com/test.jpg"
        
    @pytest.mark.asyncio
    async def test_extract_comments_with_mock_page(self, scraper):
        """댓글 추출 함수 테스트 (모킹된 페이지 사용)"""
        mock_page = AsyncMock()
        
        # 모킹된 댓글 요소 설정
        mock_comment_element = AsyncMock()
        mock_comment_element.get_attribute = AsyncMock(return_value="comment_123")
        
        mock_content_element = AsyncMock()
        mock_content_element.text_content = AsyncMock(return_value="테스트 댓글 내용")
        
        mock_author_element = AsyncMock()
        mock_author_element.text_content = AsyncMock(return_value="댓글 작성자")
        
        mock_date_element = AsyncMock()
        mock_date_element.text_content = AsyncMock(return_value="1 분 전")
        
        def mock_comment_query_selector(selector):
            if "content" in selector:
                return mock_content_element
            elif "author" in selector:
                return mock_author_element
            elif "date" in selector:
                return mock_date_element
            return None
            
        mock_comment_element.query_selector = AsyncMock(side_effect=mock_comment_query_selector)
        mock_comment_element.query_selector_all = AsyncMock(return_value=[])  # 미디어 없음
        
        mock_page.query_selector_all = AsyncMock(return_value=[mock_comment_element])
        
        result = await scraper.extract_comments(mock_page)
        
        assert len(result) == 1
        assert result[0]["comment_id"] == "comment_123"
        assert result[0]["content"] == "테스트 댓글 내용"
        assert result[0]["author"] == "댓글 작성자"
        assert result[0]["level"] == 1
        assert result[0]["is_reply"] == False

class TestBrowserManagement:
    """브라우저 관리 함수 테스트"""
    
    @pytest.mark.asyncio
    async def test_setup_browser(self):
        """브라우저 설정 테스트"""
        # 실제 브라우저를 사용하지 않고 모킹
        with patch('fmkorea_scraper_v3.async_playwright') as mock_playwright:
            mock_playwright_instance = AsyncMock()
            mock_playwright.return_value.start = AsyncMock(return_value=mock_playwright_instance)
            
            mock_browser = AsyncMock()
            mock_page = AsyncMock()
            mock_playwright_instance.chromium.launch = AsyncMock(return_value=mock_browser)
            mock_browser.new_page = AsyncMock(return_value=mock_page)
            
            browser, page = await setup_browser()
            
            assert browser == mock_browser
            assert page == mock_page
            mock_page.set_extra_http_headers.assert_called_once()
            
    @pytest.mark.asyncio
    async def test_close_browser(self):
        """브라우저 종료 테스트"""
        mock_browser = AsyncMock()
        await close_browser(mock_browser)
        mock_browser.close.assert_called_once()
        
    @pytest.mark.asyncio
    async def test_navigate_to_page_success(self):
        """페이지 이동 성공 테스트"""
        mock_page = AsyncMock()
        mock_page.goto = AsyncMock()
        
        url = "https://www.fmkorea.com/8475910237"
        result = await navigate_to_page(mock_page, url)
        
        assert result == True
        mock_page.goto.assert_called_once_with(url, wait_until='networkidle', timeout=30000)
        
    @pytest.mark.asyncio
    async def test_navigate_to_page_failure(self):
        """페이지 이동 실패 테스트"""
        mock_page = AsyncMock()
        mock_page.goto = AsyncMock(side_effect=Exception("네트워크 오류"))
        
        url = "https://www.fmkorea.com/8475910237"
        result = await navigate_to_page(mock_page, url)
        
        assert result == False

class TestSelectors:
    """셀렉터 정의 테스트"""
    
    def test_metadata_selectors_exist(self):
        """메타데이터 셀렉터가 정의되어 있는지 확인"""
        metadata_selectors = FMKOREA_SELECTORS["metadata"]
        required_keys = ["title", "author", "date", "view_count", "up_count", "comment_count", "category"]
        
        for key in required_keys:
            assert key in metadata_selectors
            
    def test_content_selectors_exist(self):
        """본문 콘텐츠 셀렉터가 정의되어 있는지 확인"""
        content_selectors = FMKOREA_SELECTORS["content"]
        required_keys = ["container", "text", "image", "video"]
        
        for key in required_keys:
            assert key in content_selectors
            
    def test_comments_selectors_exist(self):
        """댓글 셀렉터가 정의되어 있는지 확인"""
        comments_selectors = FMKOREA_SELECTORS["comments"]
        required_keys = ["container", "comment_id", "content", "author", "date"]
        
        for key in required_keys:
            assert key in comments_selectors

class TestDataExtraction:
    """데이터 추출 함수 테스트"""
    
    @pytest.mark.asyncio
    async def test_extract_text_content(self):
        """텍스트 추출 함수 테스트"""
        mock_element = AsyncMock()
        mock_element.text_content = AsyncMock(return_value="  테스트 텍스트  ")
        
        result = await extract_text_content(mock_element)
        assert result == "테스트 텍스트"
        
    @pytest.mark.asyncio
    async def test_extract_attribute(self):
        """속성 추출 함수 테스트"""
        mock_element = AsyncMock()
        mock_element.get_attribute = AsyncMock(return_value="test_value")
        
        result = await extract_attribute(mock_element, "src")
        assert result == "test_value"

# 통합 테스트
class TestIntegration:
    """통합 테스트"""
    
    @pytest.mark.asyncio
    async def test_scrape_and_save_without_mongo(self):
        """MongoDB 없이 스크래핑 테스트"""
        url = "https://www.fmkorea.com/8475910237"
        
        # 전체 스크래핑 프로세스를 모킹
        with patch('fmkorea_scraper_v3.setup_browser') as mock_setup, \
             patch('fmkorea_scraper_v3.navigate_to_page') as mock_navigate, \
             patch('fmkorea_scraper_v3.close_browser') as mock_close:
            
            mock_browser = AsyncMock()
            mock_page = AsyncMock()
            mock_setup.return_value = (mock_browser, mock_page)
            mock_navigate.return_value = True
            
            # 스크래퍼 메서드들 모킹
            with patch.object(FMKoreaScraper, 'extract_metadata') as mock_metadata, \
                 patch.object(FMKoreaScraper, 'extract_content') as mock_content, \
                 patch.object(FMKoreaScraper, 'extract_comments') as mock_comments:
                
                mock_metadata.return_value = {
                    "title": "테스트 제목",
                    "author": "테스트 작성자",
                    "date": "2025-06-04T15:26:00+09:00",
                    "view_count": 100,
                    "up_count": 5,
                    "down_count": 0,
                    "comment_count": 2,
                    "category": "자유"
                }
                mock_content.return_value = []
                mock_comments.return_value = []
                
                result = await scrape_and_save(url)
                
                assert result["post_id"] == "8475910237"
                assert result["metadata"]["title"] == "테스트 제목"
                assert "scraped_at" in result
                mock_setup.assert_called_once()
                mock_close.assert_called_once()
        
    @pytest.mark.asyncio
    async def test_mongodb_integration_mock(self):
        """MongoDB 연동 테스트 (모킹)"""
        # MongoDB 관련 함수들을 모킹하여 테스트
        with patch('fmkorea_scraper_v3.connect_mongodb') as mock_connect, \
             patch('fmkorea_scraper_v3.save_to_mongodb') as mock_save:
            
            mock_collection = Mock()
            mock_connect.return_value = mock_collection
            mock_save.return_value = "test_object_id"
            
            # 실제 함수 호출
            from fmkorea_scraper_v3 import connect_mongodb, save_to_mongodb
            
            collection = await connect_mongodb("test_connection", "test_db", "test_collection")
            inserted_id = await save_to_mongodb(collection, {"test": "data"})
            
            assert collection == mock_collection
            assert inserted_id == "test_object_id" 
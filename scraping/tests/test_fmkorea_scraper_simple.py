import pytest
import asyncio
from fmkorea_scraper import FMKoreaScraper

class TestFMKoreaScraper:
    
    def test_parse_post_id(self):
        """게시글 ID 추출 테스트"""
        scraper = FMKoreaScraper()
        
        # 정상적인 URL
        url1 = "https://www.fmkorea.com/8485393463"
        assert scraper.parse_post_id(url1) == "8485393463"
        
        # 슬래시가 있는 URL
        url2 = "https://www.fmkorea.com/8485393463/"
        assert scraper.parse_post_id(url2) == "8485393463"
        
        # 잘못된 URL
        url3 = "https://www.fmkorea.com/invalid"
        assert scraper.parse_post_id(url3) == ""
    
    def test_validate_data_schema(self):
        """데이터 스키마 검증 테스트"""
        scraper = FMKoreaScraper()
        
        # 올바른 데이터
        valid_data = {
            "post_id": "8485393463",
            "metadata": {
                "title": "테스트 제목",
                "author": "테스트 작성자",
                "date": "2025.06.06 15:27",
                "view_count": 156,
                "up_count": 4,
                "down_count": 0,
                "comment_count": 5
            },
            "content": [
                {
                    "type": "text",
                    "order": 1,
                    "data": {"text": "테스트 텍스트"}
                }
            ],
            "comments": [
                {
                    "comment_id": "123",
                    "content": "테스트 댓글",
                    "author": "댓글 작성자",
                    "date": "2025.06.06 15:30",
                    "media": [],
                    "level": 0,
                    "is_reply": False,
                    "parent_comment_id": "",
                    "up_count": 0,
                    "down_count": 0
                }
            ]
        }
        
        assert scraper.validate_data(valid_data) == True
        
        # 잘못된 데이터 (필수 필드 누락)
        invalid_data = {
            "post_id": "8485393463",
            "metadata": {
                "title": "테스트 제목"
                # 필수 필드들이 누락됨
            },
            "content": [],
            "comments": []
        }
        
        assert scraper.validate_data(invalid_data) == False
    
    def test_selectors_structure(self):
        """셀렉터 구조 테스트"""
        scraper = FMKoreaScraper()
        selectors = scraper.selectors
        
        # 필수 셀렉터 그룹 확인
        assert "metadata" in selectors
        assert "content" in selectors
        assert "comments" in selectors
        
        # 메타데이터 셀렉터 확인
        metadata_selectors = selectors["metadata"]
        required_metadata = ["title", "author", "date", "view_count", "up_count", "comment_count"]
        for field in required_metadata:
            assert field in metadata_selectors
        
        # 댓글 셀렉터 확인
        comment_selectors = selectors["comments"]
        required_comment = ["container", "items", "author", "content", "date"]
        for field in required_comment:
            assert field in comment_selectors

if __name__ == "__main__":
    pytest.main([__file__, "-v"]) 
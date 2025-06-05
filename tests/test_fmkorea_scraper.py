"""
# 목차
1. 테스트 설정 및 임포트 (1-25)
2. FMKoreaScraperTest 클래스 (26-150)
   - setUp: 테스트 환경 설정 (28-40)
   - test_init: 초기화 테스트 (42-49)
   - test_parse_post_id: 게시글 ID 파싱 테스트 (51-58)
   - test_get_post_list: 게시글 목록 파싱 테스트 (60-75)
   - test_parse_post_metadata: 게시글 메타데이터 파싱 테스트 (77-95)
   - test_parse_post_content: 게시글 내용 파싱 테스트 (97-110)
   - test_parse_comments: 댓글 파싱 테스트 (112-125)
   - test_scrape_post: 전체 게시글 스크래핑 테스트 (127-150)
"""

import os
import json
import pytest
from unittest import TestCase
from unittest.mock import patch, MagicMock, mock_open
from bs4 import BeautifulSoup

# 스크래퍼 모듈 임포트
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scraping.scrapers.fmkorea_scraper import FMKoreaScraper

# HTML 샘플 데이터 경로
FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "fixtures")
if not os.path.exists(FIXTURES_DIR):
    os.makedirs(FIXTURES_DIR)


class FMKoreaScraperTest(TestCase):
    def setUp(self):
        """테스트 환경 설정"""
        # 스크래퍼 인스턴스 생성
        self.scraper = FMKoreaScraper()
        
        # 테스트용 HTML 샘플 로드
        self.post_list_html = open(os.path.join(FIXTURES_DIR, "fmkorea_post_list.html"), "r", encoding="utf-8").read() if os.path.exists(os.path.join(FIXTURES_DIR, "fmkorea_post_list.html")) else ""
        self.post_detail_html = open(os.path.join(FIXTURES_DIR, "fmkorea_post_detail.html"), "r", encoding="utf-8").read() if os.path.exists(os.path.join(FIXTURES_DIR, "fmkorea_post_detail.html")) else ""
        
        # BeautifulSoup 객체 생성
        self.post_list_soup = BeautifulSoup(self.post_list_html, "html.parser") if self.post_list_html else None
        self.post_detail_soup = BeautifulSoup(self.post_detail_html, "html.parser") if self.post_detail_html else None

    def test_init(self):
        """스크래퍼 초기화 테스트"""
        # 스크래퍼 인스턴스가 올바르게 생성되었는지 확인
        self.assertIsNotNone(self.scraper)
        self.assertEqual(self.scraper.base_url, "https://www.fmkorea.com")
        self.assertEqual(self.scraper.community_name, "fmkorea")
        self.assertIsNotNone(self.scraper.selectors)

    def test_parse_post_id(self):
        """게시글 ID 파싱 테스트"""
        # 다양한 URL 형식에서 게시글 ID 추출 테스트
        test_urls = [
            "https://www.fmkorea.com/8475798834",
            "https://www.fmkorea.com/8475798834/",
            "https://www.fmkorea.com/index.php?mid=politics&document_srl=8475798834"
        ]
        for url in test_urls:
            self.assertEqual(self.scraper.parse_post_id(url), "8475798834")

    def test_get_post_list(self):
        """게시글 목록 파싱 테스트"""
        # HTML이 없으면 스킵
        if not self.post_list_soup:
            self.skipTest("게시글 목록 HTML 샘플이 없습니다.")
        
        # 게시글 목록 파싱 테스트
        with patch.object(self.scraper, '_get_soup', return_value=self.post_list_soup):
            posts = self.scraper.get_post_list("https://www.fmkorea.com/politics")
            
            # 결과 검증
            self.assertIsInstance(posts, list)
            self.assertGreater(len(posts), 0)
            for post in posts:
                self.assertIn("post_id", post)
                self.assertIn("title", post)
                self.assertIn("url", post)

    def test_parse_post_metadata(self):
        """게시글 메타데이터 파싱 테스트"""
        # HTML이 없으면 스킵
        if not self.post_detail_soup:
            self.skipTest("게시글 상세 HTML 샘플이 없습니다.")
        
        # 게시글 메타데이터 파싱 테스트
        with patch.object(self.scraper, '_get_soup', return_value=self.post_detail_soup):
            metadata = self.scraper.parse_post_metadata(self.post_detail_soup)
            
            # 결과 검증
            self.assertIsInstance(metadata, dict)
            self.assertIn("title", metadata)
            self.assertIn("author", metadata)
            self.assertIn("date", metadata)
            self.assertIn("view_count", metadata)
            self.assertIn("up_count", metadata)
            self.assertIn("down_count", metadata)
            self.assertIn("comment_count", metadata)

    def test_parse_post_content(self):
        """게시글 내용 파싱 테스트"""
        # HTML이 없으면 스킵
        if not self.post_detail_soup:
            self.skipTest("게시글 상세 HTML 샘플이 없습니다.")
        
        # 게시글 내용 파싱 테스트
        with patch.object(self.scraper, '_get_soup', return_value=self.post_detail_soup):
            content = self.scraper.parse_post_content(self.post_detail_soup)
            
            # 결과 검증
            self.assertIsInstance(content, list)
            self.assertGreater(len(content), 0)
            for item in content:
                self.assertIn("type", item)
                self.assertIn("order", item)
                self.assertIn("data", item)

    def test_parse_comments(self):
        """댓글 파싱 테스트"""
        # HTML이 없으면 스킵
        if not self.post_detail_soup:
            self.skipTest("게시글 상세 HTML 샘플이 없습니다.")
        
        # 댓글 파싱 테스트
        with patch.object(self.scraper, '_get_soup', return_value=self.post_detail_soup):
            comments = self.scraper.parse_comments(self.post_detail_soup)
            
            # 결과 검증
            self.assertIsInstance(comments, list)
            if len(comments) > 0:
                for comment in comments:
                    self.assertIn("comment_id", comment)
                    self.assertIn("content", comment)
                    self.assertIn("author", comment)
                    self.assertIn("date", comment)

    def test_scrape_post(self):
        """전체 게시글 스크래핑 테스트"""
        # HTML이 없으면 스킵
        if not self.post_detail_soup:
            self.skipTest("게시글 상세 HTML 샘플이 없습니다.")
        
        # 전체 게시글 스크래핑 테스트
        with patch.object(self.scraper, '_get_soup', return_value=self.post_detail_soup), \
             patch.object(self.scraper, 'parse_post_metadata', return_value={"title": "테스트 제목", "author": "테스트 작성자", "date": "2025.06.04", "view_count": 100, "up_count": 10, "down_count": 0, "comment_count": 2}), \
             patch.object(self.scraper, 'parse_post_content', return_value=[{"type": "text", "order": 0, "data": {"text": "테스트 내용"}}]), \
             patch.object(self.scraper, 'parse_comments', return_value=[{"comment_id": "123", "content": "테스트 댓글", "author": "댓글 작성자", "date": "2025.06.04", "media": [], "level": 1, "is_reply": False, "parent_comment_id": "", "up_count": 0, "down_count": 0}]):
            
            post_data = self.scraper.scrape_post("https://www.fmkorea.com/8475798834")
            
            # 결과 검증
            self.assertIsInstance(post_data, dict)
            self.assertIn("post_id", post_data)
            self.assertIn("metadata", post_data)
            self.assertIn("content", post_data)
            self.assertIn("comments", post_data)
            self.assertIn("scraped_at", post_data)


if __name__ == "__main__":
    pytest.main(["-v", "test_fmkorea_scraper.py"])

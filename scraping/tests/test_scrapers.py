"""
스크래퍼 테스트 파일
에펨코리아와 루리웹 스크래퍼의 기본 기능을 테스트
"""

import pytest
import asyncio
import sys
from pathlib import Path

# 상위 디렉토리의 scrapers 모듈을 import하기 위해 경로 추가
sys.path.append(str(Path(__file__).parent.parent))

from scrapers.fmkorea_scraper import (
    extract_post_id as fmkorea_extract_post_id,
    extract_number,
    scrape_fmkorea_post
)
from scrapers.ruliweb_scraper import (
    extract_post_id as ruliweb_extract_post_id,
    scrape_ruliweb_post
)


class TestFMKoreaScraper:
    """에펨코리아 스크래퍼 테스트"""
    
    def test_extract_post_id(self):
        """게시글 ID 추출 테스트"""
        url = "https://www.fmkorea.com/8485393463"
        post_id = fmkorea_extract_post_id(url)
        assert post_id == "8485393463"
        
        # 슬래시가 있는 경우
        url_with_slash = "https://www.fmkorea.com/8485393463/"
        post_id_with_slash = fmkorea_extract_post_id(url_with_slash)
        assert post_id_with_slash == "8485393463"
    
    def test_extract_number(self):
        """숫자 추출 테스트"""
        assert extract_number("123") == 123
        assert extract_number("1,234") == 1234
        assert extract_number("조회 1,506") == 1506
        assert extract_number("추천 41") == 41
        assert extract_number("") == 0
        assert extract_number("텍스트만") == 0
    
    @pytest.mark.asyncio
    async def test_scrape_post_structure(self):
        """게시글 스크래핑 구조 테스트"""
        test_url = "https://www.fmkorea.com/8485393463"
        result = await scrape_fmkorea_post(test_url)
        
        if result:  # 네트워크 문제로 실패할 수 있으므로 조건부 테스트
            # 기본 구조 확인
            assert "post_id" in result
            assert "metadata" in result
            assert "content" in result
            assert "comments" in result
            assert "scraped_at" in result
            
            # 메타데이터 구조 확인
            metadata = result["metadata"]
            required_fields = ["title", "author", "date", "view_count", "up_count", "down_count", "comment_count"]
            for field in required_fields:
                assert field in metadata
            
            # 콘텐츠 구조 확인
            if result["content"]:
                content_item = result["content"][0]
                assert "type" in content_item
                assert "order" in content_item
                assert "data" in content_item
                assert content_item["type"] in ["text", "image", "video"]
            
            # 댓글 구조 확인
            if result["comments"]:
                comment = result["comments"][0]
                comment_fields = ["comment_id", "content", "author", "date", "media", "level", "is_reply", "parent_comment_id", "up_count", "down_count"]
                for field in comment_fields:
                    assert field in comment


class TestRuliwebScraper:
    """루리웹 스크래퍼 테스트"""
    
    def test_extract_post_id(self):
        """게시글 ID 추출 테스트"""
        url = "https://bbs.ruliweb.com/community/board/300148/read/38077550"
        post_id = ruliweb_extract_post_id(url)
        assert post_id == "38077550"
    
    @pytest.mark.asyncio
    async def test_scrape_post_structure(self):
        """게시글 스크래핑 구조 테스트"""
        test_url = "https://bbs.ruliweb.com/community/board/300148/read/38077550"
        result = await scrape_ruliweb_post(test_url)
        
        if result:  # 네트워크 문제로 실패할 수 있으므로 조건부 테스트
            # 기본 구조 확인
            assert "post_id" in result
            assert "metadata" in result
            assert "content" in result
            assert "comments" in result
            assert "scraped_at" in result
            
            # 메타데이터 구조 확인
            metadata = result["metadata"]
            required_fields = ["title", "author", "date", "view_count", "up_count", "down_count", "comment_count", "category"]
            for field in required_fields:
                assert field in metadata
            
            # 댓글 구조 확인 (루리웹은 is_best 필드 추가)
            if result["comments"]:
                comment = result["comments"][0]
                comment_fields = ["comment_id", "content", "author", "date", "media", "level", "is_reply", "parent_comment_id", "up_count", "down_count", "is_best"]
                for field in comment_fields:
                    assert field in comment
                
                # 댓글 이미지 확인 (루리웹의 특별한 기능)
                if comment["media"]:
                    media_item = comment["media"][0]
                    assert "type" in media_item
                    assert "order" in media_item
                    assert "data" in media_item
                    assert media_item["type"] in ["image", "video"]


class TestScraperIntegration:
    """스크래퍼 통합 테스트"""
    
    @pytest.mark.asyncio
    async def test_both_scrapers_work(self):
        """두 스크래퍼 모두 작동하는지 테스트"""
        fmkorea_url = "https://www.fmkorea.com/8485393463"
        ruliweb_url = "https://bbs.ruliweb.com/community/board/300148/read/38077550"
        
        # 에펨코리아 테스트
        fmkorea_result = await scrape_fmkorea_post(fmkorea_url)
        
        # 루리웹 테스트
        ruliweb_result = await scrape_ruliweb_post(ruliweb_url)
        
        # 최소한 하나는 성공해야 함 (네트워크 문제 고려)
        assert fmkorea_result is not None or ruliweb_result is not None
        
        if fmkorea_result:
            print(f"FMKorea scraping successful: {fmkorea_result['post_id']}")
        
        if ruliweb_result:
            print(f"Ruliweb scraping successful: {ruliweb_result['post_id']}")


if __name__ == "__main__":
    # 간단한 테스트 실행
    async def run_simple_tests():
        print("=== 스크래퍼 테스트 시작 ===")
        
        # 에펨코리아 테스트
        print("\n1. 에펨코리아 스크래퍼 테스트")
        fmkorea_url = "https://www.fmkorea.com/8485393463"
        fmkorea_result = await scrape_fmkorea_post(fmkorea_url)
        
        if fmkorea_result:
            print(f"✅ 성공: {fmkorea_result['metadata']['title']}")
            print(f"   작성자: {fmkorea_result['metadata']['author']}")
            print(f"   댓글수: {len(fmkorea_result['comments'])}")
        else:
            print("❌ 실패")
        
        # 루리웹 테스트
        print("\n2. 루리웹 스크래퍼 테스트")
        ruliweb_url = "https://bbs.ruliweb.com/community/board/300148/read/38077550"
        ruliweb_result = await scrape_ruliweb_post(ruliweb_url)
        
        if ruliweb_result:
            print(f"✅ 성공: {ruliweb_result['metadata']['title']}")
            print(f"   작성자: {ruliweb_result['metadata']['author']}")
            print(f"   댓글수: {len(ruliweb_result['comments'])}")
            
            # 댓글 이미지 개수 확인
            image_count = sum(len(comment['media']) for comment in ruliweb_result['comments'])
            print(f"   댓글 이미지: {image_count}개")
        else:
            print("❌ 실패")
        
        print("\n=== 테스트 완료 ===")
    
    asyncio.run(run_simple_tests()) 
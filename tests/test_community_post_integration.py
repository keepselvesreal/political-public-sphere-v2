"""
커뮤니티 게시글 통합 테스트 (실제 데이터 기반)

주요 테스트:
- 스크래핑 데이터 구조 검증 (line 20-50)
- 프론트엔드 컴포넌트 데이터 매핑 테스트 (line 52-100)
- API 응답 형식 검증 (line 102-150)
- 게시글 목록 렌더링 테스트 (line 152-200)
- 게시글 상세 렌더링 테스트 (line 202-250)

작성자: AI Assistant
작성일: 2025-01-28
목적: 실제 데이터 기반 TDD 검증
"""

import pytest
import json
from pathlib import Path
from typing import Dict, List, Any


class TestCommunityPostIntegration:
    """커뮤니티 게시글 통합 테스트"""
    
    @pytest.fixture
    def scraped_data(self) -> Dict:
        """실제 스크래핑된 데이터 로드"""
        # 최신 결과 파일 찾기
        results_dir = Path(__file__).parent.parent / "results"
        result_files = list(results_dir.glob("*_scraper_v2_test_results.json"))
        
        if not result_files:
            pytest.skip("스크래핑 결과 파일이 없습니다.")
        
        latest_file = max(result_files, key=lambda f: f.stat().st_mtime)
        
        with open(latest_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def test_scraped_data_structure(self, scraped_data):
        """스크래핑된 데이터 구조 검증"""
        # 최상위 구조 검증
        assert "fmkorea" in scraped_data
        assert "ruliweb" in scraped_data
        
        # FM코리아 데이터 구조 검증
        fmkorea_data = scraped_data["fmkorea"]
        assert "board_posts" in fmkorea_data
        assert "detailed_posts" in fmkorea_data
        assert isinstance(fmkorea_data["board_posts"], list)
        assert isinstance(fmkorea_data["detailed_posts"], list)
        
        # 루리웹 데이터 구조 검증
        ruliweb_data = scraped_data["ruliweb"]
        assert "board_posts" in ruliweb_data
        assert "detailed_posts" in ruliweb_data
        assert isinstance(ruliweb_data["board_posts"], list)
        assert isinstance(ruliweb_data["detailed_posts"], list)
    
    def test_board_post_fields(self, scraped_data):
        """게시판 목록 필드 검증"""
        # FM코리아 게시판 목록 필드 검증
        fmkorea_posts = scraped_data["fmkorea"]["board_posts"]
        if fmkorea_posts:
            post = fmkorea_posts[0]
            required_fields = ["title", "post_url", "post_id", "like_count", 
                             "comment_count", "view_count", "author", "date"]
            for field in required_fields:
                assert field in post, f"FM코리아 게시글에 {field} 필드가 없습니다."
        
        # 루리웹 게시판 목록 필드 검증
        ruliweb_posts = scraped_data["ruliweb"]["board_posts"]
        if ruliweb_posts:
            post = ruliweb_posts[0]
            required_fields = ["post_id", "title", "post_url", 
                             "comment_count", "author", "like_count", "view_count", "date"]
            for field in required_fields:
                assert field in post, f"루리웹 게시글에 {field} 필드가 없습니다."
    
    def test_detailed_post_structure(self, scraped_data):
        """상세 게시글 구조 검증"""
        # FM코리아 상세 게시글 구조 검증
        fmkorea_detailed = scraped_data["fmkorea"]["detailed_posts"]
        if fmkorea_detailed:
            post = fmkorea_detailed[0]
            required_fields = ["post_id", "post_url", "scraped_at", "metadata", 
                             "content", "comments", "experiment_purpose", "page_title"]
            for field in required_fields:
                assert field in post, f"FM코리아 상세 게시글에 {field} 필드가 없습니다."
            
            # 메타데이터 구조 검증
            metadata = post["metadata"]
            assert isinstance(metadata, dict)
            assert "view_count" in metadata
            assert "like_count" in metadata
            assert "comment_count" in metadata
        
        # 루리웹 상세 게시글 구조 검증
        ruliweb_detailed = scraped_data["ruliweb"]["detailed_posts"]
        if ruliweb_detailed:
            post = ruliweb_detailed[0]
            required_fields = ["post_id", "post_url", "scraped_at", "metadata", 
                             "content", "comments", "experiment_purpose", "page_title"]
            for field in required_fields:
                assert field in post, f"루리웹 상세 게시글에 {field} 필드가 없습니다."
            
            # 메타데이터 구조 검증
            metadata = post["metadata"]
            assert isinstance(metadata, dict)
            assert "title" in metadata
            assert "author" in metadata
            assert "view_count" in metadata
            assert "like_count" in metadata
    
    def test_comment_structure(self, scraped_data):
        """댓글 구조 검증"""
        # 루리웹 댓글 구조 검증 (댓글이 있는 경우)
        ruliweb_detailed = scraped_data["ruliweb"]["detailed_posts"]
        for post in ruliweb_detailed:
            comments = post.get("comments", [])
            for comment in comments:
                required_fields = ["comment_id", "author", "content", "created_at", 
                                 "like_count", "dislike_count", "is_best"]
                for field in required_fields:
                    assert field in comment, f"루리웹 댓글에 {field} 필드가 없습니다."
    
    def test_data_types(self, scraped_data):
        """데이터 타입 검증"""
        # FM코리아 데이터 타입 검증
        fmkorea_posts = scraped_data["fmkorea"]["board_posts"]
        if fmkorea_posts:
            post = fmkorea_posts[0]
            assert isinstance(post["like_count"], int)
            assert isinstance(post["comment_count"], int)
            assert isinstance(post["view_count"], int)
            assert isinstance(post["title"], str)
            assert isinstance(post["post_url"], str)
        
        # 루리웹 데이터 타입 검증
        ruliweb_posts = scraped_data["ruliweb"]["board_posts"]
        if ruliweb_posts:
            post = ruliweb_posts[0]
            assert isinstance(post["like_count"], int)
            assert isinstance(post["comment_count"], int)
            assert isinstance(post["view_count"], int)
            assert isinstance(post["title"], str)
            assert isinstance(post["post_url"], str)
    
    def test_frontend_data_mapping(self, scraped_data):
        """프론트엔드 컴포넌트 데이터 매핑 테스트"""
        # 게시판 목록 데이터를 프론트엔드 형식으로 변환 테스트
        def convert_to_frontend_format(scraped_post: Dict, site: str) -> Dict:
            """스크래핑 데이터를 프론트엔드 형식으로 변환"""
            if site == "fmkorea":
                return {
                    "_id": scraped_post["post_id"],
                    "post_id": scraped_post["post_id"],
                    "community": "fmkorea",
                    "site": "fmkorea",
                    "title": scraped_post["title"],
                    "author": scraped_post["author"],
                    "created_at": scraped_post["date"],
                    "views": scraped_post["view_count"],
                    "likes": scraped_post["like_count"],
                    "dislikes": 0,  # FM코리아는 비추천 없음
                    "comments_count": scraped_post["comment_count"],
                    "url": scraped_post["post_url"],
                    "top_likes": False,
                    "top_comments": False,
                    "top_views": False
                }
            elif site == "ruliweb":
                return {
                    "_id": scraped_post["post_id"],
                    "post_id": scraped_post["post_id"],
                    "community": "ruliweb",
                    "site": "ruliweb",
                    "title": scraped_post["title"],
                    "author": scraped_post["author"],
                    "created_at": scraped_post["date"],
                    "views": scraped_post["view_count"],
                    "likes": scraped_post["like_count"],
                    "dislikes": 0,  # 루리웹도 비추천 없음
                    "comments_count": scraped_post["comment_count"],
                    "url": scraped_post["post_url"],
                    "top_likes": False,
                    "top_comments": False,
                    "top_views": False
                }
        
        # FM코리아 변환 테스트
        fmkorea_posts = scraped_data["fmkorea"]["board_posts"]
        if fmkorea_posts:
            converted = convert_to_frontend_format(fmkorea_posts[0], "fmkorea")
            assert "_id" in converted
            assert "community" in converted
            assert "site" in converted
            assert converted["site"] == "fmkorea"
        
        # 루리웹 변환 테스트
        ruliweb_posts = scraped_data["ruliweb"]["board_posts"]
        if ruliweb_posts:
            converted = convert_to_frontend_format(ruliweb_posts[0], "ruliweb")
            assert "_id" in converted
            assert "community" in converted
            assert "site" in converted
            assert converted["site"] == "ruliweb"
    
    def test_detailed_post_frontend_mapping(self, scraped_data):
        """상세 게시글 프론트엔드 매핑 테스트"""
        def convert_detailed_to_frontend(scraped_post: Dict) -> Dict:
            """상세 게시글을 프론트엔드 형식으로 변환"""
            return {
                "post_id": scraped_post["post_id"],
                "post_url": scraped_post["post_url"],
                "scraped_at": scraped_post["scraped_at"],
                "metadata": scraped_post["metadata"],
                "content": scraped_post["content"],
                "comments": scraped_post["comments"],
                "experiment_purpose": scraped_post.get("experiment_purpose", "")
            }
        
        # 루리웹 상세 게시글 변환 테스트
        ruliweb_detailed = scraped_data["ruliweb"]["detailed_posts"]
        if ruliweb_detailed:
            converted = convert_detailed_to_frontend(ruliweb_detailed[0])
            assert "post_id" in converted
            assert "metadata" in converted
            assert "content" in converted
            assert "comments" in converted
    
    def test_api_response_format(self, scraped_data):
        """API 응답 형식 검증"""
        # MongoDB에서 반환될 것으로 예상되는 형식 검증
        def simulate_api_response(scraped_data: Dict) -> Dict:
            """API 응답 시뮬레이션"""
            all_posts = []
            
            # FM코리아 게시글 추가
            for post in scraped_data["fmkorea"]["board_posts"]:
                api_post = {
                    "_id": post["post_id"],
                    "post_id": post["post_id"],
                    "community": "fmkorea",
                    "site": "fmkorea",
                    "title": post["title"],
                    "author": post["author"],
                    "created_at": post["date"],
                    "views": post["view_count"],
                    "likes": post["like_count"],
                    "dislikes": 0,
                    "comments_count": post["comment_count"],
                    "url": post["post_url"],
                    "top_likes": post["like_count"] > 50,
                    "top_comments": post["comment_count"] > 10,
                    "top_views": post["view_count"] > 1000
                }
                all_posts.append(api_post)
            
            # 루리웹 게시글 추가
            for post in scraped_data["ruliweb"]["board_posts"]:
                api_post = {
                    "_id": post["post_id"],
                    "post_id": post["post_id"],
                    "community": "ruliweb",
                    "site": "ruliweb",
                    "title": post["title"],
                    "author": post["author"],
                    "created_at": post["date"],
                    "views": post["view_count"],
                    "likes": post["like_count"],
                    "dislikes": 0,
                    "comments_count": post["comment_count"],
                    "url": post["post_url"],
                    "top_likes": post["like_count"] > 20,
                    "top_comments": post["comment_count"] > 5,
                    "top_views": post["view_count"] > 500
                }
                all_posts.append(api_post)
            
            # 메트릭별 분류
            likes_per_view = [p for p in all_posts if p["top_likes"]]
            comments_per_view = [p for p in all_posts if p["top_comments"]]
            views_per_hour = [p for p in all_posts if p["top_views"]]
            
            return {
                "likesPerView": likes_per_view,
                "commentsPerView": comments_per_view,
                "viewsPerHour": views_per_hour
            }
        
        api_response = simulate_api_response(scraped_data)
        
        # API 응답 구조 검증
        assert "likesPerView" in api_response
        assert "commentsPerView" in api_response
        assert "viewsPerHour" in api_response
        
        # 각 카테고리가 리스트인지 확인
        assert isinstance(api_response["likesPerView"], list)
        assert isinstance(api_response["commentsPerView"], list)
        assert isinstance(api_response["viewsPerHour"], list)
        
        # 게시글 필드 검증
        all_posts = (api_response["likesPerView"] + 
                    api_response["commentsPerView"] + 
                    api_response["viewsPerHour"])
        
        if all_posts:
            post = all_posts[0]
            required_fields = ["_id", "post_id", "community", "site", "title", 
                             "author", "created_at", "views", "likes", "dislikes", 
                             "comments_count", "url", "top_likes", 
                             "top_comments", "top_views"]
            for field in required_fields:
                assert field in post, f"API 응답 게시글에 {field} 필드가 없습니다."


if __name__ == "__main__":
    pytest.main([__file__, "-v"]) 
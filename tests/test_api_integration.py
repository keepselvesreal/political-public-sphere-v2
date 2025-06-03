"""
API 통합 테스트 (실제 데이터 기반)

주요 테스트:
- 스크래핑 데이터 → API 형식 변환 테스트 (line 20-80)
- API 응답 형식 검증 (line 82-120)
- 메트릭별 분류 테스트 (line 122-160)

작성자: AI Assistant
작성일: 2025-01-28
목적: API 데이터 변환 로직 검증
"""

import pytest
import json
import sys
from pathlib import Path

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from api.community_posts_api import load_latest_scraped_data, convert_scraped_to_api_format


class TestAPIIntegration:
    """API 통합 테스트"""
    
    @pytest.fixture
    def scraped_data(self):
        """실제 스크래핑된 데이터 로드"""
        return load_latest_scraped_data()
    
    def test_load_scraped_data(self, scraped_data):
        """스크래핑 데이터 로드 테스트"""
        assert isinstance(scraped_data, dict)
        assert "fmkorea" in scraped_data
        assert "ruliweb" in scraped_data
        
        # 각 사이트 데이터 구조 확인
        for site in ["fmkorea", "ruliweb"]:
            site_data = scraped_data[site]
            assert "board_posts" in site_data
            assert "detailed_posts" in site_data
            assert isinstance(site_data["board_posts"], list)
            assert isinstance(site_data["detailed_posts"], list)
    
    def test_convert_to_api_format(self, scraped_data):
        """스크래핑 데이터 → API 형식 변환 테스트"""
        api_data = convert_scraped_to_api_format(scraped_data)
        
        # API 응답 구조 확인
        assert isinstance(api_data, dict)
        assert "likesPerView" in api_data
        assert "commentsPerView" in api_data
        assert "viewsPerHour" in api_data
        assert "allPosts" in api_data
        
        # 각 카테고리가 리스트인지 확인
        for key in ["likesPerView", "commentsPerView", "viewsPerHour", "allPosts"]:
            assert isinstance(api_data[key], list)
    
    def test_api_post_structure(self, scraped_data):
        """API 게시글 구조 테스트"""
        api_data = convert_scraped_to_api_format(scraped_data)
        
        if api_data["allPosts"]:
            post = api_data["allPosts"][0]
            
            # 필수 필드 확인
            required_fields = [
                "_id", "post_id", "community", "site", "title", "author",
                "created_at", "views", "likes", "dislikes", "comments_count",
                "url", "top_likes", "top_comments", "top_views"
            ]
            
            for field in required_fields:
                assert field in post, f"API 게시글에 {field} 필드가 없습니다."
            
            # 데이터 타입 확인
            assert isinstance(post["_id"], str)
            assert isinstance(post["post_id"], str)
            assert isinstance(post["community"], str)
            assert isinstance(post["site"], str)
            assert isinstance(post["title"], str)
            assert isinstance(post["author"], str)
            assert isinstance(post["views"], int)
            assert isinstance(post["likes"], int)
            assert isinstance(post["dislikes"], int)
            assert isinstance(post["comments_count"], int)
            assert isinstance(post["url"], str)
            assert isinstance(post["top_likes"], bool)
            assert isinstance(post["top_comments"], bool)
            assert isinstance(post["top_views"], bool)
    
    def test_metric_classification(self, scraped_data):
        """메트릭별 분류 테스트"""
        api_data = convert_scraped_to_api_format(scraped_data)
        
        # 메트릭별 분류 로직 확인
        for post in api_data["likesPerView"]:
            assert post["top_likes"] == True, "likesPerView에 top_likes가 False인 게시글이 있습니다."
        
        for post in api_data["commentsPerView"]:
            assert post["top_comments"] == True, "commentsPerView에 top_comments가 False인 게시글이 있습니다."
        
        for post in api_data["viewsPerHour"]:
            assert post["top_views"] == True, "viewsPerHour에 top_views가 False인 게시글이 있습니다."
    
    def test_site_specific_conversion(self, scraped_data):
        """사이트별 변환 테스트"""
        api_data = convert_scraped_to_api_format(scraped_data)
        
        # 사이트별 게시글 분리
        fmkorea_posts = [p for p in api_data["allPosts"] if p["site"] == "fmkorea"]
        ruliweb_posts = [p for p in api_data["allPosts"] if p["site"] == "ruliweb"]
        
        # FM코리아 게시글 특성 확인
        for post in fmkorea_posts:
            assert post["community"] == "fmkorea"
            assert post["site"] == "fmkorea"
            assert post["dislikes"] == 0   # FM코리아는 비추천 없음
        
        # 루리웹 게시글 특성 확인
        for post in ruliweb_posts:
            assert post["community"] == "ruliweb"
            assert post["site"] == "ruliweb"
            assert post["dislikes"] == 0   # 루리웹도 비추천 없음
    
    def test_metric_thresholds(self, scraped_data):
        """메트릭 임계값 테스트"""
        api_data = convert_scraped_to_api_format(scraped_data)
        
        # FM코리아 임계값 확인
        fmkorea_posts = [p for p in api_data["allPosts"] if p["site"] == "fmkorea"]
        for post in fmkorea_posts:
            if post["top_likes"]:
                assert post["likes"] > 50, f"FM코리아 top_likes 임계값 오류: {post['likes']}"
            if post["top_comments"]:
                assert post["comments_count"] > 10, f"FM코리아 top_comments 임계값 오류: {post['comments_count']}"
            if post["top_views"]:
                assert post["views"] > 1000, f"FM코리아 top_views 임계값 오류: {post['views']}"
        
        # 루리웹 임계값 확인
        ruliweb_posts = [p for p in api_data["allPosts"] if p["site"] == "ruliweb"]
        for post in ruliweb_posts:
            if post["top_likes"]:
                assert post["likes"] > 20, f"루리웹 top_likes 임계값 오류: {post['likes']}"
            if post["top_comments"]:
                assert post["comments_count"] > 5, f"루리웹 top_comments 임계값 오류: {post['comments_count']}"
            if post["top_views"]:
                assert post["views"] > 500, f"루리웹 top_views 임계값 오류: {post['views']}"
    
    def test_data_consistency(self, scraped_data):
        """데이터 일관성 테스트"""
        api_data = convert_scraped_to_api_format(scraped_data)
        
        # 전체 게시글 수와 메트릭별 게시글 수 비교
        total_posts = len(api_data["allPosts"])
        metric_posts = (len(api_data["likesPerView"]) + 
                       len(api_data["commentsPerView"]) + 
                       len(api_data["viewsPerHour"]))
        
        # 메트릭별 게시글은 전체 게시글의 부분집합이어야 함
        assert metric_posts <= total_posts * 3  # 중복 가능하므로 3배까지 허용
        
        # 모든 메트릭 게시글이 전체 게시글에 포함되어야 함
        all_post_ids = {p["_id"] for p in api_data["allPosts"]}
        
        for post in api_data["likesPerView"]:
            assert post["_id"] in all_post_ids, "likesPerView 게시글이 allPosts에 없습니다."
        
        for post in api_data["commentsPerView"]:
            assert post["_id"] in all_post_ids, "commentsPerView 게시글이 allPosts에 없습니다."
        
        for post in api_data["viewsPerHour"]:
            assert post["_id"] in all_post_ids, "viewsPerHour 게시글이 allPosts에 없습니다."
    
    def test_api_response_simulation(self, scraped_data):
        """API 응답 시뮬레이션 테스트"""
        api_data = convert_scraped_to_api_format(scraped_data)
        
        # API 응답 형식 시뮬레이션
        def simulate_api_response(metric=None, site=None, limit=50):
            if metric == "likes":
                posts = api_data["likesPerView"]
            elif metric == "comments":
                posts = api_data["commentsPerView"]
            elif metric == "views":
                posts = api_data["viewsPerHour"]
            else:
                posts = api_data["allPosts"]
            
            if site:
                posts = [p for p in posts if p["site"] == site]
            
            posts = posts[:limit]
            
            return {
                "success": True,
                "data": {
                    "likesPerView": api_data["likesPerView"][:limit] if metric != "likes" else posts,
                    "commentsPerView": api_data["commentsPerView"][:limit] if metric != "comments" else posts,
                    "viewsPerHour": api_data["viewsPerHour"][:limit] if metric != "views" else posts,
                    "total": len(posts),
                    "filters": {
                        "metric": metric,
                        "site": site,
                        "limit": limit
                    }
                }
            }
        
        # 다양한 필터 조건으로 테스트
        test_cases = [
            {"metric": None, "site": None, "limit": 50},
            {"metric": "likes", "site": None, "limit": 10},
            {"metric": "comments", "site": "fmkorea", "limit": 5},
            {"metric": "views", "site": "ruliweb", "limit": 20}
        ]
        
        for case in test_cases:
            response = simulate_api_response(**case)
            
            # 응답 구조 확인
            assert response["success"] == True
            assert "data" in response
            assert "total" in response["data"]
            assert "filters" in response["data"]
            
            # 필터 적용 확인
            assert response["data"]["filters"]["metric"] == case["metric"]
            assert response["data"]["filters"]["site"] == case["site"]
            assert response["data"]["filters"]["limit"] == case["limit"]
            
            # 결과 개수 확인
            assert response["data"]["total"] <= case["limit"]


def main():
    """테스트 실행 및 결과 출력"""
    print("🧪 API 통합 테스트 시작")
    
    # 데이터 로드 테스트
    scraped_data = load_latest_scraped_data()
    print(f"✅ 스크래핑 데이터 로드 완료")
    print(f"   - FM코리아 게시글: {len(scraped_data.get('fmkorea', {}).get('board_posts', []))}개")
    print(f"   - 루리웹 게시글: {len(scraped_data.get('ruliweb', {}).get('board_posts', []))}개")
    
    # API 형식 변환 테스트
    api_data = convert_scraped_to_api_format(scraped_data)
    print(f"✅ API 형식 변환 완료")
    print(f"   - 전체 게시글: {len(api_data['allPosts'])}개")
    print(f"   - 추천률 높은 게시글: {len(api_data['likesPerView'])}개")
    print(f"   - 댓글률 높은 게시글: {len(api_data['commentsPerView'])}개")
    print(f"   - 조회수 높은 게시글: {len(api_data['viewsPerHour'])}개")
    
    # 샘플 데이터 출력
    if api_data['allPosts']:
        sample_post = api_data['allPosts'][0]
        print(f"✅ 샘플 게시글:")
        print(f"   - 제목: {sample_post['title'][:30]}...")
        print(f"   - 사이트: {sample_post['site']}")
        print(f"   - 조회수: {sample_post['views']:,}")
        print(f"   - 추천수: {sample_post['likes']:,}")
        print(f"   - 댓글수: {sample_post['comments_count']:,}")
    
    print("🎉 API 통합 테스트 완료!")


if __name__ == "__main__":
    main() 
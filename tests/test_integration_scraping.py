"""
실제 스크래핑 통합 테스트

주요 테스트:
- FM코리아 게시판 목록 스크래핑 (line 20-60)
- 루리웹 게시판 목록 스크래핑 (line 62-100)
- 지표별 선별 로직 검증 (line 102-150)
- CommunityPost 모델 출력 검증 (line 152-200)

작성자: AI Assistant
작성일: 2025-01-28
목적: TDD 방식으로 실제 스크래핑 기능 검증
"""

import pytest
import asyncio
from typing import Dict, List

# 실제 구현된 모듈들 import
from scraping.scrapers.fmkorea_scraper_v2 import FMKoreaScraper
from scraping.scrapers.ruliweb_scraper_v2 import RuliwebScraper
from scripts.community_post_utils import SelectionCriteria


class TestFMKoreaScraping:
    """FM코리아 실제 스크래핑 테스트"""
    
    @pytest.mark.asyncio
    async def test_fmkorea_board_scraping(self):
        """FM코리아 게시판 목록 스크래핑 테스트"""
        # FM코리아 정치 게시판 URL (실제 테스트용)
        board_url = "https://www.fmkorea.com/index.php?mid=politics"
        
        async with FMKoreaScraper() as scraper:
            # 게시판 목록 스크래핑
            posts = await scraper.scrape_board_list(board_url)
            
            # 기본 검증
            assert isinstance(posts, list)
            assert len(posts) > 0, "게시글이 하나도 추출되지 않았습니다"
            
            # 첫 번째 게시글 구조 검증
            first_post = posts[0]
            required_fields = ['post_id', 'title', 'post_url', 'like_count', 'comment_count', 'view_count']
            
            for field in required_fields:
                assert field in first_post, f"필수 필드 '{field}'가 없습니다"
            
            # 데이터 타입 검증
            assert isinstance(first_post['post_id'], str)
            assert isinstance(first_post['title'], str)
            assert isinstance(first_post['post_url'], str)
            assert isinstance(first_post['like_count'], int)
            assert isinstance(first_post['comment_count'], int)
            assert isinstance(first_post['view_count'], int)
            
            # URL 형식 검증
            assert first_post['post_url'].startswith('https://www.fmkorea.com')
            
            print(f"✅ FM코리아 게시글 {len(posts)}개 추출 성공")
            print(f"📝 첫 번째 게시글: {first_post['title'][:30]}...")
    
    @pytest.mark.asyncio
    async def test_fmkorea_post_selection(self):
        """FM코리아 지표별 선별 테스트"""
        board_url = "https://www.fmkorea.com/index.php?mid=politics"
        
        async with FMKoreaScraper() as scraper:
            # 지표별 선별 스크래핑
            selected_posts = await scraper.scrape_board_with_selection(board_url, criteria_count=3)
            
            # 기본 구조 검증
            assert isinstance(selected_posts, dict)
            expected_criteria = ['likes', 'comments', 'views']
            
            for criteria in expected_criteria:
                assert criteria in selected_posts, f"선별 기준 '{criteria}'가 없습니다"
                assert isinstance(selected_posts[criteria], list)
                assert len(selected_posts[criteria]) <= 3, f"{criteria} 기준 게시글이 3개를 초과했습니다"
            
            # 중복 제거 검증
            all_post_ids = set()
            for criteria, posts in selected_posts.items():
                for post in posts:
                    post_id = post['post_id']
                    assert post_id not in all_post_ids, f"중복된 게시글 ID 발견: {post_id}"
                    all_post_ids.add(post_id)
            
            print(f"✅ FM코리아 지표별 선별 완료:")
            for criteria, posts in selected_posts.items():
                print(f"  - {criteria}: {len(posts)}개")


class TestRuliwebScraping:
    """루리웹 실제 스크래핑 테스트"""
    
    @pytest.mark.asyncio
    async def test_ruliweb_board_scraping(self):
        """루리웹 게시판 목록 스크래핑 테스트"""
        # 루리웹 정치 게시판 URL (실제 테스트용)
        board_url = "https://bbs.ruliweb.com/community/board/300143"
        
        async with RuliwebScraper() as scraper:
            # 게시판 목록 스크래핑
            posts = await scraper.scrape_board_list(board_url)
            
            # 기본 검증
            assert isinstance(posts, list)
            assert len(posts) > 0, "게시글이 하나도 추출되지 않았습니다"
            
            # 첫 번째 게시글 구조 검증
            first_post = posts[0]
            required_fields = ['post_id', 'title', 'post_url', 'like_count', 'comment_count', 'view_count']
            
            for field in required_fields:
                assert field in first_post, f"필수 필드 '{field}'가 없습니다"
            
            # 데이터 타입 검증
            assert isinstance(first_post['post_id'], str)
            assert isinstance(first_post['title'], str)
            assert isinstance(first_post['post_url'], str)
            assert isinstance(first_post['like_count'], int)
            assert isinstance(first_post['comment_count'], int)
            assert isinstance(first_post['view_count'], int)
            
            # URL 형식 검증
            assert first_post['post_url'].startswith('https://bbs.ruliweb.com')
            
            print(f"✅ 루리웹 게시글 {len(posts)}개 추출 성공")
            print(f"📝 첫 번째 게시글: {first_post['title'][:30]}...")
    
    @pytest.mark.asyncio
    async def test_ruliweb_post_selection(self):
        """루리웹 지표별 선별 테스트"""
        board_url = "https://bbs.ruliweb.com/community/board/300143"
        
        async with RuliwebScraper() as scraper:
            # 지표별 선별 스크래핑
            selected_posts = await scraper.scrape_board_with_selection(board_url, criteria_count=3)
            
            # 기본 구조 검증
            assert isinstance(selected_posts, dict)
            expected_criteria = ['likes', 'comments', 'views']
            
            for criteria in expected_criteria:
                assert criteria in selected_posts, f"선별 기준 '{criteria}'가 없습니다"
                assert isinstance(selected_posts[criteria], list)
                assert len(selected_posts[criteria]) <= 3, f"{criteria} 기준 게시글이 3개를 초과했습니다"
            
            # 중복 제거 검증
            all_post_ids = set()
            for criteria, posts in selected_posts.items():
                for post in posts:
                    post_id = post['post_id']
                    assert post_id not in all_post_ids, f"중복된 게시글 ID 발견: {post_id}"
                    all_post_ids.add(post_id)
            
            print(f"✅ 루리웹 지표별 선별 완료:")
            for criteria, posts in selected_posts.items():
                print(f"  - {criteria}: {len(posts)}개")


class TestCommunityPostIntegration:
    """CommunityPost 모델 통합 테스트"""
    
    @pytest.mark.asyncio
    async def test_fmkorea_post_detail_scraping(self):
        """FM코리아 게시글 상세 스크래핑 테스트"""
        # 먼저 게시판에서 게시글 URL 하나 가져오기
        board_url = "https://www.fmkorea.com/index.php?mid=politics"
        
        async with FMKoreaScraper() as scraper:
            posts = await scraper.scrape_board_list(board_url)
            assert len(posts) > 0, "테스트할 게시글이 없습니다"
            
            # 첫 번째 게시글 상세 스크래핑
            test_post_url = posts[0]['post_url']
            post_detail = await scraper.scrape_post_detail(test_post_url)
            
            # CommunityPost 모델 구조 검증
            required_fields = ['post_id', 'post_url', 'scraped_at', 'metadata', 'content', 'comments']
            for field in required_fields:
                assert field in post_detail, f"CommunityPost 필수 필드 '{field}'가 없습니다"
            
            # 메타데이터 구조 검증
            metadata = post_detail['metadata']
            metadata_fields = ['title', 'author', 'view_count', 'like_count', 'comment_count']
            for field in metadata_fields:
                assert field in metadata, f"메타데이터 필드 '{field}'가 없습니다"
            
            # 콘텐츠 구조 검증
            content = post_detail['content']
            assert isinstance(content, list), "콘텐츠는 리스트여야 합니다"
            
            if content:  # 콘텐츠가 있는 경우
                first_content = content[0]
                assert 'type' in first_content, "콘텐츠에 type 필드가 없습니다"
                assert 'order' in first_content, "콘텐츠에 order 필드가 없습니다"
                assert 'data' in first_content, "콘텐츠에 data 필드가 없습니다"
            
            # 댓글 구조 검증
            comments = post_detail['comments']
            assert isinstance(comments, list), "댓글은 리스트여야 합니다"
            
            print(f"✅ FM코리아 게시글 상세 스크래핑 성공")
            print(f"📝 제목: {metadata['title'][:50]}...")
            print(f"📊 콘텐츠: {len(content)}개, 댓글: {len(comments)}개")
    
    @pytest.mark.asyncio
    async def test_ruliweb_post_detail_scraping(self):
        """루리웹 게시글 상세 스크래핑 테스트"""
        # 먼저 게시판에서 게시글 URL 하나 가져오기
        board_url = "https://bbs.ruliweb.com/community/board/300143"
        
        async with RuliwebScraper() as scraper:
            posts = await scraper.scrape_board_list(board_url)
            assert len(posts) > 0, "테스트할 게시글이 없습니다"
            
            # 첫 번째 게시글 상세 스크래핑
            test_post_url = posts[0]['post_url']
            post_detail = await scraper.scrape_post_detail(test_post_url)
            
            # CommunityPost 모델 구조 검증
            required_fields = ['post_id', 'post_url', 'scraped_at', 'metadata', 'content', 'comments']
            for field in required_fields:
                assert field in post_detail, f"CommunityPost 필수 필드 '{field}'가 없습니다"
            
            # 메타데이터 구조 검증
            metadata = post_detail['metadata']
            metadata_fields = ['title', 'author', 'view_count', 'like_count', 'comment_count']
            for field in metadata_fields:
                assert field in metadata, f"메타데이터 필드 '{field}'가 없습니다"
            
            # 콘텐츠 구조 검증
            content = post_detail['content']
            assert isinstance(content, list), "콘텐츠는 리스트여야 합니다"
            
            # 댓글 구조 검증 (루리웹 특화: 이미지 포함)
            comments = post_detail['comments']
            assert isinstance(comments, list), "댓글은 리스트여야 합니다"
            
            if comments:  # 댓글이 있는 경우
                first_comment = comments[0]
                assert 'images' in first_comment, "루리웹 댓글에 images 필드가 없습니다"
                assert isinstance(first_comment['images'], list), "댓글 이미지는 리스트여야 합니다"
            
            print(f"✅ 루리웹 게시글 상세 스크래핑 성공")
            print(f"📝 제목: {metadata['title'][:50]}...")
            print(f"📊 콘텐츠: {len(content)}개, 댓글: {len(comments)}개")


if __name__ == "__main__":
    # 개별 테스트 실행 예시
    import asyncio
    
    async def run_quick_test():
        """빠른 테스트 실행"""
        print("🚀 FM코리아 빠른 테스트 시작...")
        
        async with FMKoreaScraper() as scraper:
            board_url = "https://www.fmkorea.com/index.php?mid=politics"
            posts = await scraper.scrape_board_list(board_url)
            print(f"✅ {len(posts)}개 게시글 추출 완료")
            
            if posts:
                print(f"📝 첫 번째 게시글: {posts[0]['title'][:30]}...")
    
    # asyncio.run(run_quick_test()) 
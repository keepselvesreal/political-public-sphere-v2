"""
실험용 스크래퍼 테스트 모듈

주요 기능:
- test_scraper_initialization: 스크래퍼 초기화 테스트 (line 20-40)
- test_post_scraping: 게시글 스크래핑 테스트 (line 42-80)
- test_content_extraction: 콘텐츠 추출 테스트 (line 82-120)
- test_comment_extraction: 댓글 추출 테스트 (line 122-160)

작성자: AI Assistant
작성일: 2025-01-28
목적: 실험용 스크래퍼 기능 검증
"""

import asyncio
import pytest
from scraping.fmkorea_experiment_scraper import FMKoreaExperimentScraper, scrape_fmkorea_experiment


class TestFMKoreaExperimentScraper:
    """실험용 스크래퍼 테스트 클래스"""
    
    @pytest.mark.asyncio
    async def test_scraper_initialization(self):
        """스크래퍼 초기화 테스트"""
        async with FMKoreaExperimentScraper() as scraper:
            assert scraper.base_url == 'https://www.fmkorea.com'
            assert scraper.browser is not None
            assert scraper.page is not None
            print("✅ 스크래퍼 초기화 성공")
    
    @pytest.mark.asyncio
    async def test_post_scraping_basic(self):
        """기본 게시글 스크래핑 테스트"""
        # 테스트용 게시글 URL (실제 존재하는 게시글)
        test_url = "https://www.fmkorea.com/8465873058"
        
        result = await scrape_fmkorea_experiment(test_url)
        
        # 기본 구조 검증
        assert 'post_id' in result
        assert 'post_url' in result
        assert 'scraped_at' in result
        assert 'metadata' in result
        assert 'content' in result
        assert 'comments' in result
        
        # 메타데이터 검증
        metadata = result['metadata']
        assert 'title' in metadata
        assert 'author' in metadata
        assert 'view_count' in metadata
        assert 'like_count' in metadata
        assert 'comment_count' in metadata
        
        print(f"✅ 게시글 스크래핑 성공: {metadata.get('title', 'N/A')}")
        print(f"   - 콘텐츠 요소: {len(result['content'])}개")
        print(f"   - 댓글: {len(result['comments'])}개")
        
        return result
    
    @pytest.mark.asyncio
    async def test_content_structure(self):
        """콘텐츠 구조 검증 테스트"""
        test_url = "https://www.fmkorea.com/8465873058"
        result = await scrape_fmkorea_experiment(test_url)
        
        content_list = result.get('content', [])
        assert len(content_list) > 0, "콘텐츠가 추출되지 않았습니다"
        
        # 각 콘텐츠 요소 구조 검증
        for i, content in enumerate(content_list):
            assert 'type' in content, f"콘텐츠 {i}: type 필드 누락"
            assert 'order' in content, f"콘텐츠 {i}: order 필드 누락"
            assert 'data' in content, f"콘텐츠 {i}: data 필드 누락"
            
            content_type = content['type']
            assert content_type in ['image', 'text', 'video'], f"콘텐츠 {i}: 잘못된 타입 {content_type}"
            
            # 타입별 필수 필드 검증
            data = content['data']
            if content_type == 'image':
                assert 'src' in data, f"이미지 콘텐츠 {i}: src 필드 누락"
            elif content_type == 'text':
                assert 'text' in data, f"텍스트 콘텐츠 {i}: text 필드 누락"
            elif content_type == 'video':
                assert 'src' in data, f"비디오 콘텐츠 {i}: src 필드 누락"
        
        print(f"✅ 콘텐츠 구조 검증 완료: {len(content_list)}개 요소")
        
        # 중복 이미지 검사
        image_srcs = []
        for content in content_list:
            if content['type'] == 'image':
                src = content['data'].get('src')
                if src:
                    assert src not in image_srcs, f"중복 이미지 발견: {src}"
                    image_srcs.append(src)
        
        print(f"✅ 중복 이미지 검사 완료: {len(image_srcs)}개 고유 이미지")
    
    @pytest.mark.asyncio
    async def test_comment_structure(self):
        """댓글 구조 검증 테스트"""
        test_url = "https://www.fmkorea.com/8465878065"  # 댓글이 많은 게시글
        result = await scrape_fmkorea_experiment(test_url)
        
        comments = result.get('comments', [])
        if len(comments) == 0:
            print("⚠️ 댓글이 없는 게시글입니다")
            return
        
        # 댓글 구조 검증
        for i, comment in enumerate(comments):
            assert 'id' in comment, f"댓글 {i}: id 필드 누락"
            assert 'author' in comment, f"댓글 {i}: author 필드 누락"
            assert 'content' in comment, f"댓글 {i}: content 필드 누락"
            assert 'date' in comment, f"댓글 {i}: date 필드 누락"
            assert 'is_reply' in comment, f"댓글 {i}: is_reply 필드 누락"
            assert 'depth' in comment, f"댓글 {i}: depth 필드 누락"
        
        # 대댓글 구조 검증
        reply_comments = [c for c in comments if c.get('is_reply', False)]
        if reply_comments:
            for reply in reply_comments:
                assert reply.get('depth', 0) > 0, f"대댓글의 depth가 0입니다: {reply.get('id')}"
                print(f"   대댓글 발견: {reply.get('author')} (depth: {reply.get('depth')})")
        
        print(f"✅ 댓글 구조 검증 완료: {len(comments)}개 댓글, {len(reply_comments)}개 대댓글")


def run_tests():
    """테스트 실행 함수"""
    import sys
    import os
    
    # 프로젝트 루트를 Python 경로에 추가
    project_root = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, project_root)
    
    async def run_all_tests():
        """모든 테스트 실행"""
        test_instance = TestFMKoreaExperimentScraper()
        
        try:
            print("🧪 실험용 스크래퍼 테스트 시작")
            print("=" * 50)
            
            # 1. 초기화 테스트
            print("1️⃣ 스크래퍼 초기화 테스트")
            await test_instance.test_scraper_initialization()
            
            # 2. 기본 스크래핑 테스트
            print("\n2️⃣ 기본 게시글 스크래핑 테스트")
            result = await test_instance.test_post_scraping_basic()
            
            # 3. 콘텐츠 구조 테스트
            print("\n3️⃣ 콘텐츠 구조 검증 테스트")
            await test_instance.test_content_structure()
            
            # 4. 댓글 구조 테스트
            print("\n4️⃣ 댓글 구조 검증 테스트")
            await test_instance.test_comment_structure()
            
            print("\n" + "=" * 50)
            print("✅ 모든 테스트 통과! 실험용 스크래퍼가 정상 작동합니다.")
            return True
            
        except Exception as e:
            print(f"\n❌ 테스트 실패: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    # 비동기 테스트 실행
    return asyncio.run(run_all_tests())


if __name__ == "__main__":
    success = run_tests()
    exit(0 if success else 1) 
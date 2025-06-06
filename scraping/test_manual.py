"""
수동 테스트 스크립트
에펨코리아와 루리웹 스크래퍼를 실제로 테스트
"""

import asyncio
import sys
from pathlib import Path

# scrapers 모듈을 import하기 위해 경로 추가
sys.path.append(str(Path(__file__).parent))

from scrapers.fmkorea_scraper import scrape_fmkorea_post
from scrapers.ruliweb_scraper import scrape_ruliweb_post


async def test_fmkorea():
    """에펨코리아 스크래퍼 테스트"""
    print("=== 에펨코리아 스크래퍼 테스트 ===")
    
    test_url = "https://www.fmkorea.com/8485393463"
    print(f"URL: {test_url}")
    
    try:
        result = await scrape_fmkorea_post(test_url)
        
        if result:
            print("✅ 스크래핑 성공!")
            print(f"게시글 ID: {result['post_id']}")
            print(f"제목: {result['metadata']['title']}")
            print(f"작성자: {result['metadata']['author']}")
            print(f"조회수: {result['metadata']['view_count']}")
            print(f"추천수: {result['metadata']['up_count']}")
            print(f"댓글수: {len(result['comments'])}")
            print(f"본문 요소수: {len(result['content'])}")
            
            # JSON 저장
            from scrapers.fmkorea_scraper import save_to_json
            filename = f"fmkorea_{result['post_id']}_test.json"
            save_to_json(result, filename)
            
        else:
            print("❌ 스크래핑 실패")
            
    except Exception as e:
        print(f"❌ 오류 발생: {e}")


async def test_ruliweb():
    """루리웹 스크래퍼 테스트"""
    print("\n=== 루리웹 스크래퍼 테스트 ===")
    
    test_url = "https://bbs.ruliweb.com/community/board/300148/read/38077550"
    print(f"URL: {test_url}")
    
    try:
        result = await scrape_ruliweb_post(test_url)
        
        if result:
            print("✅ 스크래핑 성공!")
            print(f"게시글 ID: {result['post_id']}")
            print(f"제목: {result['metadata']['title']}")
            print(f"카테고리: {result['metadata']['category']}")
            print(f"작성자: {result['metadata']['author']}")
            print(f"조회수: {result['metadata']['view_count']}")
            print(f"추천수: {result['metadata']['up_count']}")
            print(f"댓글수: {len(result['comments'])}")
            print(f"본문 요소수: {len(result['content'])}")
            
            # 댓글 이미지 개수 확인
            image_count = sum(len(comment['media']) for comment in result['comments'])
            print(f"댓글 이미지: {image_count}개")
            
            # BEST 댓글 개수 확인
            best_count = sum(1 for comment in result['comments'] if comment.get('is_best', False))
            print(f"BEST 댓글: {best_count}개")
            
            # JSON 저장
            from scrapers.ruliweb_scraper import save_to_json
            filename = f"ruliweb_{result['post_id']}_test.json"
            save_to_json(result, filename)
            
        else:
            print("❌ 스크래핑 실패")
            
    except Exception as e:
        print(f"❌ 오류 발생: {e}")


async def main():
    """메인 테스트 함수"""
    print("스크래퍼 수동 테스트 시작\n")
    
    # 에펨코리아 테스트
    await test_fmkorea()
    
    # 루리웹 테스트
    await test_ruliweb()
    
    print("\n테스트 완료!")


if __name__ == "__main__":
    asyncio.run(main()) 
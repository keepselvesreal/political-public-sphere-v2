"""
목차:
- 최종 스크래퍼 테스트 (1-60줄)
  - test_fmkorea_scraping: 에펨코리아 실제 스크래핑 테스트
  - test_ruliweb_scraping: 루리웹 실제 스크래핑 테스트
  - main: 테스트 실행 함수
"""

import asyncio
import sys
from pathlib import Path

# scrapers 모듈 import
sys.path.append(str(Path(__file__).parent))

from scrapers.fmkorea_scraper import scrape_fmkorea_post, save_to_json
from scrapers.ruliweb_scraper import scrape_ruliweb_post

async def test_fmkorea_scraping():
    """에펨코리아 실제 스크래핑 테스트"""
    print("=== 에펨코리아 스크래핑 테스트 ===")
    
    test_url = "https://www.fmkorea.com/8485393463"
    print(f"URL: {test_url}")
    
    try:
        result = await scrape_fmkorea_post(test_url)
        
        if result:
            print(f"✅ 스크래핑 성공!")
            print(f"Post ID: {result['post_id']}")
            print(f"Community: {result['community']}")
            print(f"Title: {result['metadata']['title']}")
            print(f"Author: {result['metadata']['author']}")
            print(f"View Count: {result['metadata']['view_count']}")
            print(f"Content Items: {len(result['content'])}")
            print(f"Comments: {len(result['comments'])}")
            
            # JSON 파일로 저장
            filename = f"fmkorea_{result['post_id']}.json"
            if save_to_json(result, filename):
                print(f"✅ JSON 저장 완료: {filename}")
            
            return result
        else:
            print("❌ 스크래핑 실패")
            return None
            
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        return None

async def test_ruliweb_scraping():
    """루리웹 실제 스크래핑 테스트"""
    print("\n=== 루리웹 스크래핑 테스트 ===")
    
    test_url = "https://bbs.ruliweb.com/community/board/300148/read/38077550"
    print(f"URL: {test_url}")
    
    try:
        result = await scrape_ruliweb_post(test_url)
        
        if result:
            print(f"✅ 스크래핑 성공!")
            print(f"Post ID: {result['post_id']}")
            print(f"Community: {result['community']}")
            print(f"Title: {result['metadata']['title']}")
            print(f"Author: {result['metadata']['author']}")
            print(f"View Count: {result['metadata']['view_count']}")
            print(f"Content Items: {len(result['content'])}")
            print(f"Comments: {len(result['comments'])}")
            
            # 댓글 이미지 개수 확인
            image_count = sum(len(comment['media']) for comment in result['comments'])
            print(f"Comment Images: {image_count}")
            
            # JSON 파일로 저장
            from scrapers.ruliweb_scraper import save_to_json
            filename = f"ruliweb_{result['post_id']}.json"
            if save_to_json(result, filename):
                print(f"✅ JSON 저장 완료: {filename}")
            
            return result
        else:
            print("❌ 스크래핑 실패")
            return None
            
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        return None

async def main():
    """메인 테스트 함수"""
    print("🚀 최종 스크래퍼 테스트 시작")
    print("=" * 50)
    
    # 에펨코리아 테스트
    fmkorea_result = await test_fmkorea_scraping()
    
    # 루리웹 테스트
    ruliweb_result = await test_ruliweb_scraping()
    
    print("\n" + "=" * 50)
    print("📊 테스트 결과 요약")
    print(f"에펨코리아: {'✅ 성공' if fmkorea_result else '❌ 실패'}")
    print(f"루리웹: {'✅ 성공' if ruliweb_result else '❌ 실패'}")
    
    if fmkorea_result or ruliweb_result:
        print("\n🎉 최종 스크래퍼 테스트 완료!")
        print("새 스키마가 적용된 스크래퍼가 정상 작동합니다.")
    else:
        print("\n⚠️ 모든 스크래핑이 실패했습니다.")
        print("네트워크 연결을 확인해주세요.")

if __name__ == "__main__":
    asyncio.run(main()) 
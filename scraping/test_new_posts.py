"""
목차:
- 새로운 게시글 스크래핑 테스트 (1-80줄)
  - test_new_fmkorea_post: 새 에펨코리아 게시글 스크래핑
  - test_new_ruliweb_post: 새 루리웹 게시글 스크래핑
  - main: 테스트 실행 함수
"""

import asyncio
import sys
from pathlib import Path

# scrapers 모듈 import
sys.path.append(str(Path(__file__).parent))

from scrapers.fmkorea_scraper import scrape_fmkorea_post, save_to_json
from scrapers.ruliweb_scraper import scrape_ruliweb_post

async def test_new_fmkorea_post():
    """새로운 에펨코리아 게시글 스크래핑 테스트"""
    print("=== 새 에펨코리아 게시글 스크래핑 테스트 ===")
    
    test_url = "https://www.fmkorea.com/8485697756"
    print(f"URL: {test_url}")
    
    try:
        result = await scrape_fmkorea_post(test_url)
        
        if result:
            print(f"✅ 스크래핑 성공!")
            print(f"Post ID: {result['post_id']}")
            print(f"Community: {result['community']}")
            print(f"Title: {result['metadata']['title']}")
            print(f"Author: {result['metadata']['author']}")
            print(f"Date: {result['metadata']['date']}")
            print(f"View Count: {result['metadata']['view_count']}")
            print(f"Up Count: {result['metadata']['up_count']}")
            print(f"Comment Count: {result['metadata']['comment_count']}")
            print(f"Content Items: {len(result['content'])}")
            print(f"Comments: {len(result['comments'])}")
            
            # 댓글 상세 정보
            if result['comments']:
                print("\n댓글 상세:")
                for i, comment in enumerate(result['comments'][:3]):  # 처음 3개만 표시
                    print(f"  {i+1}. {comment['author']}: {comment['content'][:50]}...")
                    print(f"     레벨: {comment['level']}, 대댓글: {comment['is_reply']}")
            
            # JSON 파일로 저장
            filename = f"fmkorea_{result['post_id']}_new.json"
            if save_to_json(result, filename):
                print(f"✅ JSON 저장 완료: {filename}")
            
            return result
        else:
            print("❌ 스크래핑 실패")
            return None
            
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
        return None

async def test_new_ruliweb_post():
    """새로운 루리웹 게시글 스크래핑 테스트"""
    print("\n=== 새 루리웹 게시글 스크래핑 테스트 ===")
    
    test_url = "https://bbs.ruliweb.com/community/board/300148/read/38077836"
    print(f"URL: {test_url}")
    
    try:
        result = await scrape_ruliweb_post(test_url)
        
        if result:
            print(f"✅ 스크래핑 성공!")
            print(f"Post ID: {result['post_id']}")
            print(f"Community: {result['community']}")
            print(f"Title: {result['metadata']['title']}")
            print(f"Author: {result['metadata']['author']}")
            print(f"Date: {result['metadata']['date']}")
            print(f"View Count: {result['metadata']['view_count']}")
            print(f"Up Count: {result['metadata']['up_count']}")
            print(f"Content Items: {len(result['content'])}")
            print(f"Comments: {len(result['comments'])}")
            
            # 댓글 이미지 개수 확인
            image_count = sum(len(comment['media']) for comment in result['comments'])
            print(f"Comment Images: {image_count}")
            
            # 댓글 상세 정보
            if result['comments']:
                print("\n댓글 상세:")
                for i, comment in enumerate(result['comments'][:3]):  # 처음 3개만 표시
                    print(f"  {i+1}. {comment['author']}: {comment['content'][:50]}...")
                    print(f"     BEST: {comment.get('is_best', False)}, 이미지: {len(comment['media'])}개")
            
            # JSON 파일로 저장
            from scrapers.ruliweb_scraper import save_to_json
            filename = f"ruliweb_{result['post_id']}_new.json"
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
    print("🚀 새로운 게시글 스크래핑 테스트 시작")
    print("=" * 60)
    
    # 에펨코리아 새 게시글 테스트
    fmkorea_result = await test_new_fmkorea_post()
    
    # 루리웹 새 게시글 테스트
    ruliweb_result = await test_new_ruliweb_post()
    
    print("\n" + "=" * 60)
    print("📊 테스트 결과 요약")
    print(f"새 에펨코리아 게시글: {'✅ 성공' if fmkorea_result else '❌ 실패'}")
    print(f"새 루리웹 게시글: {'✅ 성공' if ruliweb_result else '❌ 실패'}")
    
    if fmkorea_result:
        print(f"\n에펨코리아 결과:")
        print(f"  - 댓글 수: {len(fmkorea_result['comments'])}")
        print(f"  - 메타데이터 완성도: {len([v for v in fmkorea_result['metadata'].values() if v])}/7")
    
    if ruliweb_result:
        print(f"\n루리웹 결과:")
        print(f"  - 댓글 수: {len(ruliweb_result['comments'])}")
        print(f"  - 댓글 이미지: {sum(len(c['media']) for c in ruliweb_result['comments'])}개")
    
    if fmkorea_result or ruliweb_result:
        print("\n🎉 새로운 게시글 스크래핑 테스트 완료!")
        print("수정된 스크래퍼가 정상 작동합니다.")
    else:
        print("\n⚠️ 모든 스크래핑이 실패했습니다.")
        print("네트워크 연결이나 스크래퍼 코드를 확인해주세요.")

if __name__ == "__main__":
    asyncio.run(main()) 
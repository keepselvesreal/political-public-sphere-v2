#!/usr/bin/env python3
"""
FMKorea 스크래퍼 수동 테스트 스크립트
실제 페이지를 스크래핑하여 동작을 확인합니다.
"""

import asyncio
import json
import sys
import os

# 스크래퍼 모듈 경로 추가
sys.path.append(os.path.join(os.path.dirname(__file__), 'scraping', 'scrapers'))

from fmkorea_scraper_v3 import FMKoreaScraper, scrape_and_save

async def test_scraper():
    """스크래퍼 테스트 실행"""
    
    # 테스트할 URL (제공된 예시 게시글)
    test_url = "https://www.fmkorea.com/8475910237"
    
    print(f"🔍 FMKorea 스크래퍼 테스트 시작")
    print(f"📄 테스트 URL: {test_url}")
    print("-" * 50)
    
    try:
        # 스크래퍼 인스턴스 생성
        scraper = FMKoreaScraper()
        
        # 스크래핑 실행
        print("⏳ 스크래핑 진행 중...")
        result = await scraper.scrape_post(test_url)
        
        if not result:
            print("❌ 스크래핑 실패: 빈 결과 반환")
            return
            
        print("✅ 스크래핑 성공!")
        print("-" * 50)
        
        # 결과 출력
        print("📊 스크래핑 결과:")
        print(f"게시글 ID: {result.get('post_id', 'N/A')}")
        
        metadata = result.get('metadata', {})
        print(f"제목: {metadata.get('title', 'N/A')}")
        print(f"작성자: {metadata.get('author', 'N/A')}")
        print(f"작성일: {metadata.get('date', 'N/A')}")
        print(f"조회수: {metadata.get('view_count', 0)}")
        print(f"추천수: {metadata.get('up_count', 0)}")
        print(f"댓글수: {metadata.get('comment_count', 0)}")
        print(f"카테고리: {metadata.get('category', 'N/A')}")
        
        content = result.get('content', [])
        print(f"본문 요소 수: {len(content)}")
        
        comments = result.get('comments', [])
        print(f"댓글 수: {len(comments)}")
        
        print("-" * 50)
        
        # 본문 내용 일부 출력
        if content:
            print("📝 본문 내용 (처음 3개 요소):")
            for i, item in enumerate(content[:3]):
                print(f"  {i+1}. {item['type']}: {str(item['data'])[:100]}...")
        
        # 댓글 일부 출력
        if comments:
            print("💬 댓글 (처음 2개):")
            for i, comment in enumerate(comments[:2]):
                print(f"  {i+1}. {comment.get('author', 'N/A')}: {comment.get('content', 'N/A')[:50]}...")
        
        # JSON 파일로 저장
        output_file = "fmkorea_scraping_result.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        
        print(f"💾 결과가 {output_file}에 저장되었습니다.")
        
        return result
        
    except Exception as e:
        print(f"❌ 스크래핑 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        return None

async def test_multiple_posts():
    """여러 게시글 스크래핑 테스트"""
    
    # FMKorea 정치 게시판 첫 페이지에서 몇 개 게시글 테스트
    test_urls = [
        "https://www.fmkorea.com/8475910237",  # 제공된 예시
        # 추가 URL들은 실제 존재하는 게시글로 교체 필요
    ]
    
    results = []
    
    for i, url in enumerate(test_urls, 1):
        print(f"\n🔍 테스트 {i}/{len(test_urls)}: {url}")
        
        try:
            result = await scrape_and_save(url)
            if result:
                results.append(result)
                print(f"✅ 성공: {result.get('metadata', {}).get('title', 'N/A')}")
            else:
                print("❌ 실패: 빈 결과")
                
        except Exception as e:
            print(f"❌ 오류: {e}")
            
        # 요청 간 간격 (서버 부하 방지)
        await asyncio.sleep(2)
    
    print(f"\n📊 전체 결과: {len(results)}/{len(test_urls)} 성공")
    
    # 전체 결과 저장
    if results:
        with open("fmkorea_multiple_results.json", 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print("💾 전체 결과가 fmkorea_multiple_results.json에 저장되었습니다.")
    
    return results

if __name__ == "__main__":
    print("🚀 FMKorea 스크래퍼 수동 테스트")
    print("=" * 50)
    
    # 단일 게시글 테스트
    result = asyncio.run(test_scraper())
    
    if result:
        print("\n" + "=" * 50)
        print("🎯 단일 게시글 테스트 완료!")
        
        # 사용자에게 다중 테스트 여부 확인
        # response = input("\n여러 게시글 테스트를 진행하시겠습니까? (y/N): ")
        # if response.lower() in ['y', 'yes']:
        #     print("\n🔄 다중 게시글 테스트 시작...")
        #     asyncio.run(test_multiple_posts())
    else:
        print("\n❌ 단일 게시글 테스트 실패")
        sys.exit(1) 
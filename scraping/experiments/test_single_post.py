#!/usr/bin/env python3
"""
수정된 FMKorea 스크래퍼 테스트 스크립트
단일 게시글로 콘텐츠와 댓글 추출이 제대로 되는지 확인합니다.
"""

import asyncio
import sys
import os
import json
from datetime import datetime

# 스크래퍼 모듈 경로 추가
sys.path.append(os.path.join(os.path.dirname(__file__), 'scraping', 'scrapers'))

from fmkorea_scraper_v3 import FMKoreaScraper

async def test_single_post():
    """단일 게시글 테스트"""
    
    # 테스트할 URL들 (첨부된 JSON에서 선택)
    test_urls = [
        "https://www.fmkorea.com/8476125978",  # 김문수 턱걸이 (콘텐츠 있음)
        "https://www.fmkorea.com/8476127692",  # 국힘 인식 (댓글 4개)
        "https://www.fmkorea.com/8476125875"   # 권성동 (이미지 + 댓글 5개)
    ]
    
    scraper = FMKoreaScraper()
    
    # 스크래핑 설정
    config = {
        'headless': True,
        'slow_mo': 1000,
        'wait_time': 3,
        'timeout': 30000
    }
    
    for i, url in enumerate(test_urls, 1):
        print(f"\n{'='*80}")
        print(f"🧪 테스트 {i}/{len(test_urls)}: {url}")
        print(f"{'='*80}")
        
        try:
            result = await scraper.scrape_post(url, config)
            
            if result:
                print(f"✅ 스크래핑 성공!")
                
                # 결과 요약
                metadata = result.get('metadata', {})
                content = result.get('content', [])
                comments = result.get('comments', [])
                
                print(f"\n📋 메타데이터:")
                print(f"  제목: {metadata.get('title', 'N/A')}")
                print(f"  작성자: {metadata.get('author', 'N/A')}")
                print(f"  조회수: {metadata.get('view_count', 0):,}")
                print(f"  추천수: {metadata.get('up_count', 0):,}")
                print(f"  댓글수: {metadata.get('comment_count', 0):,}")
                
                print(f"\n📄 본문 콘텐츠 ({len(content)}개):")
                for j, item in enumerate(content):
                    if item['type'] == 'text':
                        print(f"  {j+1}. [텍스트] {item['data']['text'][:100]}...")
                    elif item['type'] == 'image':
                        print(f"  {j+1}. [이미지] {item['data']['src']}")
                    elif item['type'] == 'video':
                        print(f"  {j+1}. [비디오] {item['data']['src']}")
                
                print(f"\n💬 댓글 ({len(comments)}개):")
                for j, comment in enumerate(comments):
                    print(f"  {j+1}. {comment['author']}: {comment['content'][:50]}...")
                
                # JSON 파일로 저장
                filename = f"test_result_{i}_{datetime.now().strftime('%H%M%S')}.json"
                with open(filename, 'w', encoding='utf-8') as f:
                    json.dump(result, f, ensure_ascii=False, indent=2)
                print(f"\n💾 결과가 {filename}에 저장되었습니다.")
                
            else:
                print(f"❌ 스크래핑 실패: 결과가 없습니다.")
                
        except Exception as e:
            print(f"❌ 오류 발생: {e}")
            import traceback
            traceback.print_exc()
        
        # 다음 테스트 전 대기
        if i < len(test_urls):
            print(f"\n⏳ 다음 테스트까지 3초 대기...")
            await asyncio.sleep(3)
    
    print(f"\n{'='*80}")
    print("🏁 모든 테스트 완료!")
    print(f"{'='*80}")

if __name__ == "__main__":
    asyncio.run(test_single_post()) 
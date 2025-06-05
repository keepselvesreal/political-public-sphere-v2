#!/usr/bin/env python3
"""
루리웹 스크래퍼 직접 실행 스크립트 (scraping/experiments 폴더 내 실행용)

주요 기능:
- 루리웹 정치유머 게시판 스크래핑
- API로 데이터 전송
- scraping/data 폴더에 결과 저장

작성자: AI Assistant
작성일: 2025년 6월 4일 20:15 (KST)
"""

import sys
import os
import asyncio

# 상위 디렉토리의 scrapers 모듈을 import할 수 있도록 경로 추가
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'scrapers'))

from ruliweb_scraper_v3 import scrape_ruliweb_politics_page

async def main():
    """루리웹 스크래퍼 실행"""
    print("🚀 루리웹 정치유머 게시판 스크래핑 시작")
    print("=" * 50)
    
    # 스크래핑 설정
    config = {
        'headless': True,
        'slow_mo': 1000,
        'post_limit': 8,  # 8개 게시글만 스크래핑
        'delay_between_requests': 2,
        # 'api_url': 'http://localhost:3000/api/scraper-data'  # API 전송 비활성화
    }
    
    try:
        # 스크래핑 실행
        results = await scrape_ruliweb_politics_page(config)
        
        if results:
            print(f"\n✅ 스크래핑 완료: {len(results)}개 게시글")
            print("📊 결과 요약:")
            for i, post in enumerate(results, 1):
                title = post['metadata']['title'][:50] + "..." if len(post['metadata']['title']) > 50 else post['metadata']['title']
                print(f"  {i}. {title}")
                print(f"     - 작성자: {post['metadata']['author']}")
                print(f"     - 조회수: {post['metadata']['view_count']:,}")
                print(f"     - 추천수: {post['metadata']['up_count']:,}")
                print(f"     - 댓글수: {post['metadata']['comment_count']:,}")
        else:
            print("❌ 스크래핑 실패: 결과가 없습니다.")
            
    except Exception as e:
        print(f"❌ 스크래핑 오류: {e}")
        return 1
    
    print("\n🎉 작업 완료!")
    return 0

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code) 
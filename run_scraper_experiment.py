#!/usr/bin/env python3
"""
FMKorea 스크래퍼 실험 실행 스크립트 (실시간 API 연동)
업그레이드된 스크래퍼로 정치 게시판을 스크래핑하고 실험 페이지에 자동 전송합니다.
"""

import asyncio
import sys
import os
import json
from datetime import datetime

# 스크래퍼 모듈 경로 추가
sys.path.append(os.path.join(os.path.dirname(__file__), 'scraping', 'scrapers'))

from fmkorea_scraper_v3 import scrape_fmkorea_politics_page

async def main():
    """메인 실행 함수"""
    
    print("🚀 FMKorea 스크래퍼 v3 실험 시작 (실시간 API 연동)")
    print("=" * 70)
    print(f"⏰ 시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("🎯 대상: https://www.fmkorea.com/politics")
    print("🌐 실험 페이지: http://localhost:3000/scraper-experiment")
    print("-" * 70)
    
    # 스크래핑 설정 (API 전송 포함)
    config = {
        'headless': True,
        'slow_mo': 1000,  # 1초 지연
        'wait_time': 2,   # 페이지 로드 후 2초 대기
        'delay_between_requests': 3,  # 요청 간 3초 간격
        'timeout': 45000,  # 45초 타임아웃
        'api_url': 'http://localhost:3000/api/scraper-data'  # API 엔드포인트
    }
    
    try:
        print("🔍 FMKorea 정치 게시판 스크래핑 시작...")
        
        # 스크래핑 실행
        results = await scrape_fmkorea_politics_page(config)
        
        if results:
            print(f"✅ 스크래핑 완료! {len(results)}개 게시글 추출")
            
            # 결과 요약 출력
            print("\n📊 스크래핑 결과 요약:")
            for i, post in enumerate(results, 1):
                metadata = post.get('metadata', {})
                print(f"  {i}. {metadata.get('title', 'N/A')[:50]}...")
                print(f"     작성자: {metadata.get('author', 'N/A')}")
                print(f"     조회수: {metadata.get('view_count', 0):,}")
                print(f"     추천수: {metadata.get('up_count', 0):,}")
                print(f"     댓글수: {metadata.get('comment_count', 0):,}")
                print(f"     콘텐츠: {len(post.get('content', []))}개")
                print()
            
            # 파일명에 타임스탬프 포함
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"fmkorea_politics_experiment_{timestamp}.json"
            
            # JSON 파일로 저장 (백업용)
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
            
            print(f"💾 백업 파일이 {filename}에 저장되었습니다.")
            print(f"🌐 실험용 페이지에서 실시간 확인: http://localhost:3000/scraper-experiment")
            print("📱 실험 페이지가 자동으로 갱신됩니다!")
            
        else:
            print("❌ 스크래핑 실패: 결과가 없습니다.")
            
    except Exception as e:
        print(f"❌ 스크래핑 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        
    print("\n" + "=" * 70)
    print(f"⏰ 종료 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("🏁 FMKorea 스크래퍼 v3 실험 완료")
    print("💡 실험 페이지에서 결과를 확인하세요!")

if __name__ == "__main__":
    asyncio.run(main()) 
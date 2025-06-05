#!/usr/bin/env python3
"""
기존 스크래퍼들 테스트 스크립트

목적: v3 스크래퍼와 기존 스크래퍼 비교 분석
작성일: 2025년 6월 5일 10:35 (KST)
"""

import asyncio
import sys
import os
from datetime import datetime

# 스크래퍼 모듈 경로 추가
sys.path.append('../scrapers')

async def test_fmkorea_legacy():
    """기존 FM코리아 스크래퍼 테스트"""
    print('🧪 기존 FM코리아 스크래퍼 테스트 시작')
    print('=' * 50)
    
    try:
        from fmkorea_scraper import scrape_fmkorea_experiment
        
        # 테스트 URL (실제 게시글)
        test_url = 'https://www.fmkorea.com/8450144891'
        
        result = await scrape_fmkorea_experiment(test_url)
        
        if result and 'content' in result:
            print(f'✅ 기존 FM코리아 스크래퍼 성공')
            print(f'   - 콘텐츠 요소: {len(result.get("content", []))}개')
            print(f'   - 댓글: {len(result.get("comments", []))}개')
            print(f'   - 제목: {result.get("metadata", {}).get("title", "N/A")[:50]}...')
            return True, result
        else:
            print('❌ 기존 FM코리아 스크래퍼 실패: 결과 없음')
            return False, None
            
    except Exception as e:
        print(f'❌ 기존 FM코리아 스크래퍼 오류: {e}')
        return False, None

async def test_ruliweb_legacy():
    """기존 루리웹 스크래퍼 테스트"""
    print('🧪 기존 루리웹 스크래퍼 테스트 시작')
    print('=' * 50)
    
    try:
        from ruliweb_scraper import scrape_ruliweb_post_improved
        
        # 테스트 URL (실제 게시글)
        test_url = 'https://bbs.ruliweb.com/community/board/300148/read/65536'
        
        result = await scrape_ruliweb_post_improved(test_url)
        
        if result and 'content' in result:
            print(f'✅ 기존 루리웹 스크래퍼 성공')
            print(f'   - 콘텐츠 요소: {len(result.get("content", []))}개')
            print(f'   - 댓글: {len(result.get("comments", []))}개')
            print(f'   - 제목: {result.get("metadata", {}).get("title", "N/A")[:50]}...')
            return True, result
        else:
            print('❌ 기존 루리웹 스크래퍼 실패: 결과 없음')
            return False, None
            
    except Exception as e:
        print(f'❌ 기존 루리웹 스크래퍼 오류: {e}')
        return False, None

async def test_v2_scrapers():
    """v2 스크래퍼들 테스트"""
    print('🧪 v2 스크래퍼들 테스트 시작')
    print('=' * 50)
    
    try:
        from fmkorea_scraper_v2 import scrape_fmkorea_post_v2
        from ruliweb_scraper_v2 import scrape_ruliweb_post_v2
        
        # FM코리아 v2 테스트
        print('📝 FM코리아 v2 테스트...')
        fmkorea_result = await scrape_fmkorea_post_v2('https://www.fmkorea.com/8450144891')
        
        if fmkorea_result and 'content' in fmkorea_result:
            print(f'✅ FM코리아 v2 성공: {len(fmkorea_result.get("content", []))}개 콘텐츠')
        else:
            print('❌ FM코리아 v2 실패')
        
        # 루리웹 v2 테스트
        print('📝 루리웹 v2 테스트...')
        ruliweb_result = await scrape_ruliweb_post_v2('https://bbs.ruliweb.com/community/board/300148/read/65536')
        
        if ruliweb_result and 'content' in ruliweb_result:
            print(f'✅ 루리웹 v2 성공: {len(ruliweb_result.get("content", []))}개 콘텐츠')
        else:
            print('❌ 루리웹 v2 실패')
            
        return fmkorea_result, ruliweb_result
        
    except Exception as e:
        print(f'❌ v2 스크래퍼 오류: {e}')
        return None, None

async def main():
    """메인 테스트 함수"""
    print('🚀 기존 스크래퍼들 테스트 시작')
    print(f'⏰ 시작 시간: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    print()
    
    # 기존 스크래퍼 테스트
    fmkorea_success, fmkorea_result = await test_fmkorea_legacy()
    print()
    
    ruliweb_success, ruliweb_result = await test_ruliweb_legacy()
    print()
    
    # v2 스크래퍼 테스트
    fmkorea_v2_result, ruliweb_v2_result = await test_v2_scrapers()
    print()
    
    # 결과 요약
    print('📊 테스트 결과 요약')
    print('=' * 50)
    print(f'기존 FM코리아 스크래퍼: {"✅ 성공" if fmkorea_success else "❌ 실패"}')
    print(f'기존 루리웹 스크래퍼: {"✅ 성공" if ruliweb_success else "❌ 실패"}')
    print(f'FM코리아 v2 스크래퍼: {"✅ 성공" if fmkorea_v2_result else "❌ 실패"}')
    print(f'루리웹 v2 스크래퍼: {"✅ 성공" if ruliweb_v2_result else "❌ 실패"}')
    
    # 성공한 스크래퍼가 있으면 분석 정보 출력
    if fmkorea_success or ruliweb_success:
        print()
        print('🔍 성공한 스크래퍼 분석 정보')
        print('=' * 50)
        
        if fmkorea_success and fmkorea_result:
            print('FM코리아 스크래퍼 설정:')
            print('  - 헤드리스 모드: False (브라우저 표시)')
            print('  - Stealth 모드: 적용')
            print('  - 대기 시간: 15초')
            print('  - 네비게이션 타임아웃: 30초')
            
        if ruliweb_success and ruliweb_result:
            print('루리웹 스크래퍼 설정:')
            print('  - 헤드리스 모드: False (브라우저 표시)')
            print('  - Stealth 모드: 적용')
            print('  - 대기 시간: 15초')
            print('  - 네비게이션 타임아웃: 30초')
    
    print()
    print(f'⏰ 완료 시간: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')

if __name__ == "__main__":
    asyncio.run(main()) 
#!/usr/bin/env python3
"""
루리웹 스크래퍼 테스트 스크립트

목적: API 엔드포인트 수정 사항 테스트
작성일: 2025년 6월 5일 10:45 (KST)
"""

import asyncio
import sys
import os

# 스크래퍼 모듈 경로 추가
sys.path.append(os.path.join(os.path.dirname(__file__), 'scrapers'))

from scrapers.ruliweb_scraper_v3 import scrape_ruliweb_politics_page

async def main():
    """루리웹 스크래핑 테스트"""
    config = {
        'headless': True,
        'slow_mo': 500,
        'wait_time': 3,
        'delay_between_requests': 2,
        'timeout': 45000,
        'post_limit': 5,
        'api_url': 'http://localhost:3000/api/scraping-data'
    }
    
    print('🚀 루리웹 정치유머 게시판 스크래핑 시작')
    print('=' * 50)
    
    try:
        results = await scrape_ruliweb_politics_page(config)
        
        if results:
            print(f'\n✅ 스크래핑 완료: {len(results)}개 게시글')
            print('📊 결과 요약:')
            
            for i, post in enumerate(results, 1):
                title = post['metadata']['title'][:50] + '...' if len(post['metadata']['title']) > 50 else post['metadata']['title']
                print(f'  {i}. {title}')
                print(f'     - 작성자: {post["metadata"]["author"]}')
                print(f'     - 조회수: {post["metadata"]["view_count"]:,}')
                print(f'     - 추천수: {post["metadata"]["up_count"]:,}')
                print(f'     - 댓글수: {post["metadata"]["comment_count"]:,}')
                
                # 댓글 분석
                comments = post.get('comments', [])
                total_comments = len(comments)
                
                print(f'     - 실제 댓글: {total_comments}개')
                print()
        else:
            print('❌ 스크래핑 실패: 결과가 없습니다.')
            
    except Exception as e:
        print(f'❌ 스크래핑 오류: {e}')
        return 1
    
    return 0

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code) 
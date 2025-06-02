"""
FM코리아 데이터 수집 스크립트

주요 기능:
- collect_and_save_posts: 게시글 수집 및 MongoDB 저장 (line 20-80)
- save_to_mongodb: MongoDB 저장 함수 (line 82-120)
- main: 메인 실행 함수 (line 122-160)

작성자: AI Assistant
작성일: 2025-01-28
목적: 정식 스크래퍼로 FM코리아 데이터 수집 및 저장
"""

import asyncio
import json
from datetime import datetime
from typing import List, Dict
import pymongo
from scraping.scrapers.fmkorea_scraper import scrape_fmkorea_experiment


async def collect_and_save_posts():
    """FM코리아 게시글 수집 및 MongoDB 저장"""
    
    # 수집할 게시글 URL 목록 (실제 존재하는 게시글들)
    post_urls = [
        "https://www.fmkorea.com/8465873058",  # 민주당에서 전화돌리네
        "https://www.fmkorea.com/8465878065",  # 정치 라이트하게 보는 사람은 ㅅㅅㄴ 믿더라;;;
        "https://www.fmkorea.com/8465875749",  # 영상이 포함된 게시글
        "https://www.fmkorea.com/8466722569",  # 국힘 민주 파이널유세 인파 장난 아니네
    ]
    
    collected_posts = []
    
    print("🚀 FM코리아 데이터 수집 시작")
    print("=" * 50)
    
    for i, url in enumerate(post_urls, 1):
        try:
            print(f"\n📝 게시글 {i}/{len(post_urls)} 수집 중...")
            print(f"URL: {url}")
            
            # 게시글 스크래핑
            post_data = await scrape_fmkorea_experiment(url)
            
            if post_data and not post_data.get('error'):
                # 성공적으로 수집된 경우
                metadata = post_data.get('metadata', {})
                print(f"✅ 수집 성공: {metadata.get('title', 'N/A')}")
                print(f"   - 콘텐츠: {len(post_data.get('content', []))}개")
                print(f"   - 댓글: {len(post_data.get('comments', []))}개")
                print(f"   - 조회수: {metadata.get('view_count', 0)}")
                print(f"   - 추천수: {metadata.get('like_count', 0)}")
                
                collected_posts.append(post_data)
            else:
                print(f"❌ 수집 실패: {post_data.get('error', '알 수 없는 오류')}")
            
            # 요청 간 대기 (서버 부하 방지)
            if i < len(post_urls):
                print("⏳ 3초 대기 중...")
                await asyncio.sleep(3)
                
        except Exception as e:
            print(f"💥 게시글 {i} 수집 중 오류: {e}")
            continue
    
    print(f"\n📊 수집 완료: {len(collected_posts)}/{len(post_urls)}개 게시글")
    
    # MongoDB에 저장
    if collected_posts:
        saved_count = await save_to_mongodb(collected_posts)
        print(f"💾 MongoDB 저장 완료: {saved_count}개 게시글")
    
    return collected_posts


async def save_to_mongodb(posts: List[Dict]) -> int:
    """수집된 게시글을 MongoDB에 저장"""
    try:
        # MongoDB 연결
        client = pymongo.MongoClient("mongodb+srv://nadle:miQXsXpzayvMQAzE@cluster0.bh7mhfi.mongodb.net/")
        db = client.political_public_sphere
        collection = db.fmkorea_posts
        
        saved_count = 0
        
        for post in posts:
            try:
                # 게시글 ID로 중복 확인
                post_id = post.get('post_id')
                if not post_id:
                    continue
                
                # 기존 게시글이 있으면 업데이트, 없으면 삽입
                result = collection.replace_one(
                    {'post_id': post_id},
                    post,
                    upsert=True
                )
                
                if result.upserted_id or result.modified_count > 0:
                    saved_count += 1
                    print(f"   ✅ 저장: {post.get('metadata', {}).get('title', post_id)}")
                
            except Exception as e:
                print(f"   ❌ 저장 실패: {e}")
                continue
        
        client.close()
        return saved_count
        
    except Exception as e:
        print(f"💥 MongoDB 저장 중 오류: {e}")
        return 0


async def main():
    """메인 실행 함수"""
    try:
        print("🎯 FM코리아 정식 데이터 수집 시작")
        print(f"⏰ 시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # 데이터 수집 및 저장
        collected_posts = await collect_and_save_posts()
        
        print("\n" + "=" * 50)
        print("🎉 데이터 수집 완료!")
        print(f"📈 총 수집된 게시글: {len(collected_posts)}개")
        print(f"⏰ 완료 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # 수집된 데이터 요약 출력
        if collected_posts:
            print("\n📋 수집된 게시글 요약:")
            for i, post in enumerate(collected_posts, 1):
                metadata = post.get('metadata', {})
                print(f"  {i}. {metadata.get('title', 'N/A')}")
                print(f"     - 작성자: {metadata.get('author', 'N/A')}")
                print(f"     - 조회수: {metadata.get('view_count', 0)}")
                print(f"     - 콘텐츠: {len(post.get('content', []))}개")
                print(f"     - 댓글: {len(post.get('comments', []))}개")
        
        return True
        
    except Exception as e:
        print(f"💥 메인 실행 중 오류: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1) 
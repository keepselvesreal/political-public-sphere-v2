"""
루리웹 게시판 스크래핑 및 MongoDB 저장 스크립트

목차:
- MongoDB 연결 설정 (라인 1-30)
- 루리웹 스크래핑 실행 함수 (라인 31-80)
- 데이터 저장 및 변환 함수 (라인 81-120)
- 메인 실행 로직 (라인 121-150)

작성자: AI Assistant
작성일: 2025-01-28
목적: 루리웹 게시판 데이터를 스크래핑하여 community_posts 컬렉션에 저장
"""

import asyncio
import sys
import os
from datetime import datetime
from typing import List, Dict
import pytz

# 프로젝트 루트 경로 추가
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from scraping.scrapers.ruliweb_scraper import ImprovedRuliwebScraper
import pymongo
from loguru import logger

# MongoDB 연결 설정
MONGODB_URI = 'mongodb+srv://nadle:miQXsXpzayvMQAzE@cluster0.bh7mhfi.mongodb.net/political_public_sphere'
DATABASE_NAME = 'political_public_sphere'
COLLECTION_NAME = 'community_posts'

# 한국 시간대 설정
KST = pytz.timezone('Asia/Seoul')

# 루리웹 게시판 URL (정치 관련 게시판)
RULIWEB_BOARD_URLS = [
    'https://bbs.ruliweb.com/community/board/300143',  # 정치 게시판
    'https://bbs.ruliweb.com/community/board/300148',  # 사회 게시판
]

async def connect_mongodb():
    """MongoDB 연결"""
    try:
        client = pymongo.MongoClient(MONGODB_URI)
        db = client[DATABASE_NAME]
        collection = db[COLLECTION_NAME]
        
        # 연결 테스트
        client.admin.command('ping')
        logger.info("✅ MongoDB 연결 성공")
        
        return client, db, collection
    except Exception as e:
        logger.error(f"💥 MongoDB 연결 실패: {e}")
        raise

def transform_ruliweb_post_to_community_format(post_data: Dict) -> Dict:
    """
    루리웹 게시글 데이터를 community_posts 형식으로 변환
    
    Args:
        post_data: 루리웹 스크래핑 결과
    
    Returns:
        Dict: community_posts 형식 데이터
    """
    try:
        # 기본 메타데이터 추출
        post_id = post_data.get('id', post_data.get('post_id', 'unknown'))
        title = post_data.get('title', '제목 없음')
        author = post_data.get('author', '익명')
        created_time = post_data.get('date', post_data.get('created_time', ''))
        post_url = post_data.get('url', post_data.get('post_url', ''))
        
        # 메트릭 데이터 추출
        view_count = post_data.get('views', post_data.get('view_count', 0))
        recommend_count = post_data.get('recommendations', post_data.get('recommend_count', 0))
        reply_count = post_data.get('reply_count', 0)
        
        # 카테고리 정보
        category = post_data.get('category', '일반')
        
        # 현재 시간
        now = datetime.now(KST)
        
        # community_posts 형식으로 변환
        community_post = {
            'post_id': str(post_id),
            'site': 'ruliweb',
            'post_url': post_url,
            'scraped_at': now.isoformat(),
            'metadata': {
                'title': title,
                'author': author,
                'date': created_time,
                'created_at': created_time,
                'category': category,
                'view_count': int(view_count) if isinstance(view_count, (int, str)) and str(view_count).isdigit() else 0,
                'like_count': int(recommend_count) if isinstance(recommend_count, (int, str)) and str(recommend_count).isdigit() else 0,
                'comment_count': int(reply_count) if isinstance(reply_count, (int, str)) and str(reply_count).isdigit() else 0,
                'recommendations': int(recommend_count) if isinstance(recommend_count, (int, str)) and str(recommend_count).isdigit() else 0,
                'views': int(view_count) if isinstance(view_count, (int, str)) and str(view_count).isdigit() else 0,
            },
            'content': [
                {
                    'type': 'text',
                    'order': 0,
                    'text': title,
                    'extracted_at': now.isoformat()
                }
            ],
            'comments': [],
            'created_at': now.isoformat(),
            'updated_at': now.isoformat()
        }
        
        return community_post
        
    except Exception as e:
        logger.error(f"💥 루리웹 게시글 변환 실패: {e}")
        return None

async def scrape_ruliweb_boards():
    """루리웹 게시판 스크래핑 실행"""
    try:
        logger.info("🚀 루리웹 게시판 스크래핑 시작")
        
        # MongoDB 연결
        client, db, collection = await connect_mongodb()
        
        # 루리웹 스크래퍼 초기화
        async with ImprovedRuliwebScraper() as scraper:
            all_posts = []
            
            for board_url in RULIWEB_BOARD_URLS:
                try:
                    logger.info(f"📋 게시판 스크래핑 시작: {board_url}")
                    
                    # 게시판 첫 페이지 스크래핑
                    posts = await scraper.extract_board_list(board_url, page=1)
                    
                    if posts:
                        logger.info(f"✅ {len(posts)}개 게시글 발견")
                        all_posts.extend(posts)
                    else:
                        logger.warning(f"⚠️ 게시글을 찾을 수 없습니다: {board_url}")
                    
                    # 요청 간 대기
                    await asyncio.sleep(2)
                    
                except Exception as e:
                    logger.error(f"💥 게시판 스크래핑 실패 ({board_url}): {e}")
                    continue
            
            if not all_posts:
                logger.warning("⚠️ 스크래핑된 게시글이 없습니다.")
                return
            
            logger.info(f"📊 총 {len(all_posts)}개 게시글 스크래핑 완료")
            
            # 데이터베이스에 저장
            saved_count = 0
            for post_data in all_posts:
                try:
                    # community_posts 형식으로 변환
                    community_post = transform_ruliweb_post_to_community_format(post_data)
                    
                    if community_post:
                        # 중복 확인 (post_id와 site 기준)
                        existing = collection.find_one({
                            'post_id': community_post['post_id'],
                            'site': 'ruliweb'
                        })
                        
                        if existing:
                            # 기존 데이터 업데이트
                            collection.update_one(
                                {'_id': existing['_id']},
                                {'$set': {
                                    'metadata': community_post['metadata'],
                                    'updated_at': community_post['updated_at']
                                }}
                            )
                            logger.debug(f"🔄 게시글 업데이트: {community_post['post_id']}")
                        else:
                            # 새 데이터 삽입
                            collection.insert_one(community_post)
                            saved_count += 1
                            logger.debug(f"💾 새 게시글 저장: {community_post['post_id']}")
                    
                except Exception as e:
                    logger.error(f"💥 게시글 저장 실패: {e}")
                    continue
            
            logger.info(f"✅ 루리웹 스크래핑 완료: {saved_count}개 새 게시글 저장")
            
    except Exception as e:
        logger.error(f"💥 루리웹 스크래핑 실패: {e}")
        raise
    finally:
        # MongoDB 연결 종료
        if 'client' in locals():
            client.close()

async def main():
    """메인 실행 함수"""
    try:
        await scrape_ruliweb_boards()
        logger.info("🎉 루리웹 스크래핑 작업 완료")
    except Exception as e:
        logger.error(f"💥 스크래핑 작업 실패: {e}")
        sys.exit(1)

if __name__ == "__main__":
    # 로그 설정
    logger.add("logs/ruliweb_scraping.log", rotation="1 day", retention="7 days")
    
    # 비동기 실행
    asyncio.run(main()) 
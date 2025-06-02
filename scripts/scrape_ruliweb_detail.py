"""
루리웹 개별 게시글 상세 스크래핑 스크립트

목차:
- MongoDB 연결 및 기존 데이터 조회 (라인 1-50)
- 개별 게시글 상세 스크래핑 (라인 51-100)
- 데이터 업데이트 (라인 101-150)

작성자: AI Assistant
작성일: 2025-01-28
목적: 루리웹 게시글의 본문과 댓글을 상세 스크래핑하여 업데이트
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

async def scrape_ruliweb_post_details():
    """루리웹 게시글 상세 내용 스크래핑"""
    try:
        logger.info("🚀 루리웹 게시글 상세 스크래핑 시작")
        
        # MongoDB 연결
        client, db, collection = await connect_mongodb()
        
        # 루리웹 게시글 중 본문이 부족한 것들 조회 (content가 1개 이하인 것들)
        ruliweb_posts = list(collection.find({
            'site': 'ruliweb',
            '$or': [
                {'content': {'$size': 0}},
                {'content': {'$size': 1}},
                {'comments': {'$size': 0}}
            ]
        }).limit(5))  # 처음 5개만 테스트
        
        logger.info(f"📋 상세 스크래핑 대상: {len(ruliweb_posts)}개 게시글")
        
        if not ruliweb_posts:
            logger.info("✅ 모든 루리웹 게시글이 이미 상세 스크래핑되었습니다.")
            return
        
        # 루리웹 스크래퍼 초기화
        async with ImprovedRuliwebScraper() as scraper:
            updated_count = 0
            
            for post in ruliweb_posts:
                try:
                    post_url = post.get('post_url')
                    post_id = post.get('post_id')
                    
                    if not post_url:
                        logger.warning(f"⚠️ 게시글 URL이 없습니다: {post_id}")
                        continue
                    
                    logger.info(f"📄 상세 스크래핑 시작: {post_id}")
                    
                    # 개별 게시글 상세 스크래핑
                    detailed_data = await scraper.scrape_post(post_url)
                    
                    if detailed_data and detailed_data.get('content'):
                        # 기존 데이터 업데이트
                        update_data = {
                            'content': detailed_data.get('content', []),
                            'comments': detailed_data.get('comments', []),
                            'updated_at': datetime.now(KST).isoformat()
                        }
                        
                        # 메타데이터도 더 상세한 정보로 업데이트
                        if detailed_data.get('metadata'):
                            detailed_metadata = detailed_data['metadata']
                            current_metadata = post.get('metadata', {})
                            
                            # 기존 메타데이터와 새 메타데이터 병합
                            merged_metadata = {**current_metadata}
                            
                            # 더 상세한 정보가 있으면 업데이트
                            if detailed_metadata.get('view_count'):
                                merged_metadata['view_count'] = detailed_metadata['view_count']
                            if detailed_metadata.get('like_count'):
                                merged_metadata['like_count'] = detailed_metadata['like_count']
                            if detailed_metadata.get('comment_count'):
                                merged_metadata['comment_count'] = detailed_metadata['comment_count']
                            
                            update_data['metadata'] = merged_metadata
                        
                        # MongoDB 업데이트
                        result = collection.update_one(
                            {'_id': post['_id']},
                            {'$set': update_data}
                        )
                        
                        if result.modified_count > 0:
                            updated_count += 1
                            content_count = len(detailed_data.get('content', []))
                            comment_count = len(detailed_data.get('comments', []))
                            logger.info(f"✅ 게시글 업데이트 완료: {post_id} (본문: {content_count}개, 댓글: {comment_count}개)")
                        else:
                            logger.warning(f"⚠️ 게시글 업데이트 실패: {post_id}")
                    else:
                        logger.warning(f"⚠️ 상세 데이터를 가져올 수 없습니다: {post_id}")
                    
                    # 요청 간 대기 (서버 부하 방지)
                    await asyncio.sleep(3)
                    
                except Exception as e:
                    logger.error(f"💥 게시글 상세 스크래핑 실패 ({post_id}): {e}")
                    continue
            
            logger.info(f"✅ 루리웹 상세 스크래핑 완료: {updated_count}개 게시글 업데이트")
            
    except Exception as e:
        logger.error(f"💥 루리웹 상세 스크래핑 실패: {e}")
        raise
    finally:
        # MongoDB 연결 종료
        if 'client' in locals():
            client.close()

async def main():
    """메인 실행 함수"""
    try:
        await scrape_ruliweb_post_details()
        logger.info("🎉 루리웹 상세 스크래핑 작업 완료")
    except Exception as e:
        logger.error(f"💥 상세 스크래핑 작업 실패: {e}")
        sys.exit(1)

if __name__ == "__main__":
    # 로그 설정
    logger.add("logs/ruliweb_detail_scraping.log", rotation="1 day", retention="7 days")
    
    # 비동기 실행
    asyncio.run(main()) 
"""
MongoDB 데이터 디버깅 스크립트

주요 기능:
- MongoDB 저장된 데이터 직접 조회 (line 20-40)
- 본문과 댓글 데이터 상세 분석 (line 41-80)
- 스크래핑 원본 데이터와 비교 (line 81-120)

작성자: AI Assistant
작성일: 2025-01-28
목적: 게시글 본문/댓글 누락 원인 분석
"""

import json
import os
import sys
from datetime import datetime
from loguru import logger
import pymongo
from pprint import pprint

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def analyze_mongodb_data(mongodb_uri: str):
    """MongoDB 저장된 데이터 분석"""
    try:
        logger.info("🔍 MongoDB 데이터 분석 시작")
        
        # MongoDB 연결
        client = pymongo.MongoClient(mongodb_uri)
        db = client.political_public_sphere
        collection = db.community_posts
        
        # 1. 전체 통계
        total_count = collection.count_documents({})
        fmkorea_count = collection.count_documents({"site": "fmkorea"})
        ruliweb_count = collection.count_documents({"site": "ruliweb"})
        
        logger.info(f"📊 전체 게시글: {total_count}개")
        logger.info(f"📊 FM코리아: {fmkorea_count}개")
        logger.info(f"📊 루리웹: {ruliweb_count}개")
        
        # 2. 샘플 데이터 조회 (각 사이트별 1개씩)
        logger.info("\n" + "="*50)
        logger.info("🔍 FM코리아 샘플 데이터 분석")
        
        fmkorea_sample = collection.find_one({"site": "fmkorea"})
        if fmkorea_sample:
            logger.info(f"게시글 ID: {fmkorea_sample.get('post_id')}")
            logger.info(f"제목: {fmkorea_sample.get('metadata', {}).get('title', 'N/A')}")
            
            content = fmkorea_sample.get('content', [])
            comments = fmkorea_sample.get('comments', [])
            
            logger.info(f"본문 콘텐츠 개수: {len(content)}")
            logger.info(f"댓글 개수: {len(comments)}")
            
            if content:
                logger.info("본문 첫 번째 요소:")
                pprint(content[0])
            else:
                logger.warning("⚠️ 본문 콘텐츠가 비어있음")
            
            if comments:
                logger.info("댓글 첫 번째 요소:")
                pprint(comments[0])
            else:
                logger.warning("⚠️ 댓글이 비어있음")
        
        logger.info("\n" + "="*50)
        logger.info("🔍 루리웹 샘플 데이터 분석")
        
        ruliweb_sample = collection.find_one({"site": "ruliweb"})
        if ruliweb_sample:
            logger.info(f"게시글 ID: {ruliweb_sample.get('post_id')}")
            logger.info(f"제목: {ruliweb_sample.get('metadata', {}).get('title', 'N/A')}")
            
            content = ruliweb_sample.get('content', [])
            comments = ruliweb_sample.get('comments', [])
            
            logger.info(f"본문 콘텐츠 개수: {len(content)}")
            logger.info(f"댓글 개수: {len(comments)}")
            
            if content:
                logger.info("본문 첫 번째 요소:")
                pprint(content[0])
            else:
                logger.warning("⚠️ 본문 콘텐츠가 비어있음")
            
            if comments:
                logger.info("댓글 첫 번째 요소:")
                pprint(comments[0])
            else:
                logger.warning("⚠️ 댓글이 비어있음")
        
        # 3. 본문/댓글 통계
        logger.info("\n" + "="*50)
        logger.info("📊 본문/댓글 통계 분석")
        
        # 본문이 있는 게시글 수
        posts_with_content = collection.count_documents({
            "content": {"$exists": True, "$not": {"$size": 0}}
        })
        
        # 댓글이 있는 게시글 수
        posts_with_comments = collection.count_documents({
            "comments": {"$exists": True, "$not": {"$size": 0}}
        })
        
        logger.info(f"본문이 있는 게시글: {posts_with_content}/{total_count}개")
        logger.info(f"댓글이 있는 게시글: {posts_with_comments}/{total_count}개")
        
        client.close()
        
    except Exception as e:
        logger.error(f"💥 MongoDB 데이터 분석 실패: {e}")


def analyze_scraping_results():
    """스크래핑 원본 결과 분석"""
    try:
        logger.info("\n" + "="*50)
        logger.info("🔍 스크래핑 원본 데이터 분석")
        
        results_dir = "results"
        result_files = [f for f in os.listdir(results_dir) if f.endswith('_test_results.json')]
        if not result_files:
            logger.error("스크래핑 결과 파일이 없습니다.")
            return
        
        latest_file = sorted(result_files)[-1]
        file_path = os.path.join(results_dir, latest_file)
        
        logger.info(f"📁 분석 파일: {file_path}")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # FM코리아 데이터 분석
        if 'fmkorea' in data:
            fmkorea_data = data['fmkorea']
            board_posts = fmkorea_data.get('board_posts', [])
            detail_posts = fmkorea_data.get('detail_posts', [])
            
            logger.info(f"FM코리아 게시판 목록: {len(board_posts)}개")
            logger.info(f"FM코리아 상세 게시글: {len(detail_posts)}개")
            
            if detail_posts:
                sample_detail = detail_posts[0]
                logger.info(f"FM코리아 상세 샘플 - ID: {sample_detail.get('post_id')}")
                logger.info(f"본문 콘텐츠: {len(sample_detail.get('content', []))}개")
                logger.info(f"댓글: {len(sample_detail.get('comments', []))}개")
                
                if sample_detail.get('content'):
                    logger.info("본문 첫 번째 요소:")
                    pprint(sample_detail['content'][0])
        
        # 루리웹 데이터 분석
        if 'ruliweb' in data:
            ruliweb_data = data['ruliweb']
            board_posts = ruliweb_data.get('board_posts', [])
            detail_posts = ruliweb_data.get('detail_posts', [])
            
            logger.info(f"루리웹 게시판 목록: {len(board_posts)}개")
            logger.info(f"루리웹 상세 게시글: {len(detail_posts)}개")
            
            if detail_posts:
                sample_detail = detail_posts[0]
                logger.info(f"루리웹 상세 샘플 - ID: {sample_detail.get('post_id')}")
                logger.info(f"본문 콘텐츠: {len(sample_detail.get('content', []))}개")
                logger.info(f"댓글: {len(sample_detail.get('comments', []))}개")
                
                if sample_detail.get('content'):
                    logger.info("본문 첫 번째 요소:")
                    pprint(sample_detail['content'][0])
        
    except Exception as e:
        logger.error(f"💥 스크래핑 결과 분석 실패: {e}")


def main():
    """메인 실행 함수"""
    mongodb_uri = "mongodb+srv://nadle:miQXsXpzayvMQAzE@cluster0.bh7mhfi.mongodb.net/"
    
    logger.info("🚀 데이터 디버깅 분석 시작")
    
    # 1. MongoDB 저장된 데이터 분석
    analyze_mongodb_data(mongodb_uri)
    
    # 2. 스크래핑 원본 데이터 분석
    analyze_scraping_results()
    
    logger.info("✅ 데이터 디버깅 분석 완료")


if __name__ == "__main__":
    main() 
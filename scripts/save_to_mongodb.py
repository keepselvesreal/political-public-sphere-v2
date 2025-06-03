"""
MongoDB 직접 저장 스크립트

주요 기능:
- 스크래핑 결과 파일 로드 (line 20-40)
- CommunityPostManager로 MongoDB 저장 (line 41-80)
- 저장 결과 확인 및 통계 (line 81-120)

작성자: AI Assistant
작성일: 2025-01-28
목적: 스크래핑 데이터를 MongoDB에 직접 저장
"""

import json
import os
import sys
from datetime import datetime
from loguru import logger

# 프로젝트 루트를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scripts.community_post_utils import CommunityPostManager


def load_latest_scraping_results() -> dict:
    """최신 스크래핑 결과 파일 로드"""
    try:
        results_dir = "results"
        if not os.path.exists(results_dir):
            logger.error("results 디렉토리가 없습니다.")
            return {}
        
        # 최신 결과 파일 찾기
        result_files = [f for f in os.listdir(results_dir) if f.endswith('_test_results.json')]
        if not result_files:
            logger.error("스크래핑 결과 파일이 없습니다.")
            return {}
        
        latest_file = sorted(result_files)[-1]
        file_path = os.path.join(results_dir, latest_file)
        
        logger.info(f"📁 결과 파일 로드: {file_path}")
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        logger.info(f"✅ 결과 파일 로드 완료")
        return data
        
    except Exception as e:
        logger.error(f"💥 결과 파일 로드 실패: {e}")
        return {}


def save_scraped_data_to_mongodb(mongodb_uri: str) -> bool:
    """스크래핑 데이터를 MongoDB에 저장"""
    try:
        # 1. 스크래핑 결과 로드
        logger.info("1️⃣ 스크래핑 결과 로드")
        scraping_data = load_latest_scraping_results()
        
        if not scraping_data:
            logger.error("스크래핑 데이터가 없습니다.")
            return False
        
        # 2. CommunityPostManager 초기화
        logger.info("2️⃣ MongoDB 연결 초기화")
        manager = CommunityPostManager(mongodb_uri)
        
        # 3. 각 사이트별 데이터 저장
        total_saved = 0
        
        for site_name, site_data in scraping_data.items():
            if site_name in ['fmkorea', 'ruliweb']:
                logger.info(f"3️⃣ {site_name} 데이터 저장 시작")
                
                # 게시판 목록 데이터 처리
                board_posts = site_data.get('board_posts', [])
                detail_posts = site_data.get('detail_posts', [])
                
                logger.info(f"  - 게시판 목록: {len(board_posts)}개")
                logger.info(f"  - 상세 게시글: {len(detail_posts)}개")
                
                # 상세 게시글 데이터를 우선 저장
                saved_count = 0
                for detail_post in detail_posts:
                    try:
                        # 실험 데이터 형식으로 변환
                        experiment_data = {
                            'post_id': detail_post.get('post_id'),
                            'post_url': detail_post.get('post_url'),
                            'metadata': detail_post.get('metadata', {}),
                            'content': detail_post.get('content', []),
                            'comments': detail_post.get('comments', [])
                        }
                        
                        if manager.convert_and_save(experiment_data, site_name):
                            saved_count += 1
                            
                    except Exception as e:
                        logger.warning(f"⚠️ 게시글 저장 실패: {e}")
                        continue
                
                # 상세 데이터가 없는 게시판 목록 데이터도 저장
                for board_post in board_posts:
                    # 이미 상세 데이터로 저장된 게시글은 건너뛰기
                    post_id = board_post.get('post_id')
                    if any(dp.get('post_id') == post_id for dp in detail_posts):
                        continue
                    
                    try:
                        experiment_data = {
                            'post_id': board_post.get('post_id'),
                            'post_url': board_post.get('post_url'),
                            'metadata': board_post,  # 게시판 목록 데이터를 메타데이터로 사용
                            'content': [],
                            'comments': []
                        }
                        
                        if manager.convert_and_save(experiment_data, site_name):
                            saved_count += 1
                            
                    except Exception as e:
                        logger.warning(f"⚠️ 게시글 저장 실패: {e}")
                        continue
                
                total_saved += saved_count
                logger.info(f"✅ {site_name} 저장 완료: {saved_count}개")
        
        # 4. 저장 결과 확인
        logger.info("4️⃣ 저장 결과 확인")
        stats = manager.get_stats()
        logger.info(f"📊 총 저장된 게시글: {total_saved}개")
        logger.info(f"📊 MongoDB 통계: {stats}")
        
        manager.close()
        return total_saved > 0
        
    except Exception as e:
        logger.error(f"💥 MongoDB 저장 실패: {e}")
        return False


def main():
    """메인 실행 함수"""
    mongodb_uri = "mongodb+srv://nadle:miQXsXpzayvMQAzE@cluster0.bh7mhfi.mongodb.net/"
    
    logger.info("🚀 MongoDB 직접 저장 시작")
    
    success = save_scraped_data_to_mongodb(mongodb_uri)
    
    if success:
        logger.info("✅ MongoDB 저장 성공!")
        logger.info("🌐 이제 브라우저에서 확인할 수 있습니다:")
        logger.info("   - API 서버 시작: uvicorn api.community_posts_api:app --host 0.0.0.0 --port 8000")
        logger.info("   - 게시글 목록: http://localhost:8000/community-posts")
        logger.info("   - 통계: http://localhost:8000/stats")
    else:
        logger.error("❌ MongoDB 저장 실패")


if __name__ == "__main__":
    main() 
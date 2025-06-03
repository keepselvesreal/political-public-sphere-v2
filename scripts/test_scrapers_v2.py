"""
새로운 v2 스크래퍼 테스트 스크립트

주요 기능:
- FMKoreaScraper와 RuliwebScraper v2 테스트 (line 20-50)
- 각 커뮤니티 첫 페이지 게시판 목록 스크래핑 (line 52-100)
- 상위 게시글 상세 스크래핑 (line 102-150)
- JSON 결과 저장 및 분석 (line 152-200)

작성자: AI Assistant
작성일: 2025-01-28
목적: v2 스크래퍼 검증 및 데이터 구조 분석
"""

import asyncio
import json
import os
from datetime import datetime
from pathlib import Path
import sys
import pytz
import requests

# 프로젝트 루트를 Python 경로에 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from scraping.scrapers.fmkorea_scraper_v2 import FMKoreaScraper
from scraping.scrapers.ruliweb_scraper_v2 import RuliwebScraper
from loguru import logger

# 한국 시간대 설정
KST = pytz.timezone('Asia/Seoul')

# API 서버 URL
API_BASE_URL = "http://localhost:8000"

async def save_to_mongodb():
    """스크래핑 데이터를 MongoDB에 저장"""
    try:
        logger.info("🗄️ MongoDB에 데이터 저장 시작")
        
        response = requests.post(f"{API_BASE_URL}/community-posts/save")
        
        if response.status_code == 200:
            result = response.json()
            logger.info("✅ MongoDB 저장 성공")
            logger.info(f"   - 게시글: 저장 {result['posts']['saved']}개, 업데이트 {result['posts']['updated']}개")
            logger.info(f"   - 상세 게시글: 저장 {result['detailed_posts']['saved']}개, 업데이트 {result['detailed_posts']['updated']}개")
            return True
        else:
            logger.error(f"❌ MongoDB 저장 실패: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"❌ MongoDB 저장 중 오류: {e}")
        return False

async def test_api_connection():
    """API 서버 연결 테스트"""
    try:
        response = requests.get(f"{API_BASE_URL}/health")
        if response.status_code == 200:
            logger.info("✅ API 서버 연결 성공")
            return True
        else:
            logger.warning(f"⚠️ API 서버 응답 이상: {response.status_code}")
            return False
    except Exception as e:
        logger.warning(f"⚠️ API 서버 연결 실패: {e}")
        return False

async def test_fmkorea_scraper():
    """FM코리아 스크래퍼 v2 테스트"""
    logger.info("🧪 FM코리아 스크래퍼 v2 테스트 시작")
    
    # 테스트할 게시판 URL (정치/시사 게시판)
    board_url = "https://www.fmkorea.com/politics"
    
    try:
        async with FMKoreaScraper() as scraper:
            # 1. 게시판 목록 스크래핑
            logger.info("📋 FM코리아 게시판 목록 스크래핑 중...")
            board_posts = await scraper.scrape_board_list(board_url)
            
            if not board_posts:
                logger.warning("⚠️ FM코리아 게시판 목록이 비어있습니다.")
                # 디버깅을 위해 페이지 제목 확인
                try:
                    page_title = await scraper.page.title()
                    logger.info(f"🔍 현재 페이지 제목: {page_title}")
                    
                    # 페이지 HTML 일부 확인
                    body_text = await scraper.page.evaluate("() => document.body.innerText.substring(0, 200)")
                    logger.info(f"🔍 페이지 내용 일부: {body_text}")
                except:
                    pass
                
                return {"board_posts": [], "detailed_posts": []}
            
            logger.info(f"✅ FM코리아 게시판 목록 {len(board_posts)}개 추출 완료")
            
            # 2. 상위 3개 게시글 상세 스크래핑
            detailed_posts = []
            for i, post in enumerate(board_posts[:3]):
                try:
                    logger.info(f"📄 FM코리아 게시글 {i+1}/3 상세 스크래핑: {post.get('title', 'Unknown')[:30]}...")
                    
                    post_detail = await scraper.scrape_post_detail(post['post_url'])
                    if post_detail:
                        detailed_posts.append(post_detail)
                        logger.info(f"✅ FM코리아 게시글 {i+1} 상세 스크래핑 완료")
                    
                    # 요청 간격 (서버 부하 방지)
                    await asyncio.sleep(2)
                    
                except Exception as e:
                    logger.error(f"💥 FM코리아 게시글 {i+1} 상세 스크래핑 실패: {e}")
                    continue
            
            return {
                "board_posts": board_posts,
                "detailed_posts": detailed_posts
            }
            
    except Exception as e:
        logger.error(f"💥 FM코리아 스크래퍼 테스트 실패: {e}")
        return {"board_posts": [], "detailed_posts": []}


async def test_ruliweb_scraper():
    """루리웹 스크래퍼 v2 테스트"""
    logger.info("🧪 루리웹 스크래퍼 v2 테스트 시작")
    
    # 테스트할 게시판 URL (새로운 게시판)
    board_url = "https://bbs.ruliweb.com/community/board/300148"
    
    try:
        async with RuliwebScraper() as scraper:
            # 1. 게시판 목록 스크래핑
            logger.info("📋 루리웹 게시판 목록 스크래핑 중...")
            board_posts = await scraper.scrape_board_list(board_url)
            
            if not board_posts:
                logger.warning("⚠️ 루리웹 게시판 목록이 비어있습니다.")
                return {"board_posts": [], "detailed_posts": []}
            
            logger.info(f"✅ 루리웹 게시판 목록 {len(board_posts)}개 추출 완료")
            
            # 2. 상위 3개 게시글 상세 스크래핑
            detailed_posts = []
            for i, post in enumerate(board_posts[:3]):
                try:
                    logger.info(f"📄 루리웹 게시글 {i+1}/3 상세 스크래핑: {post.get('title', 'Unknown')[:30]}...")
                    
                    post_detail = await scraper.scrape_post_detail(post['post_url'])
                    if post_detail:
                        detailed_posts.append(post_detail)
                        logger.info(f"✅ 루리웹 게시글 {i+1} 상세 스크래핑 완료")
                    
                    # 요청 간격 (서버 부하 방지)
                    await asyncio.sleep(2)
                    
                except Exception as e:
                    logger.error(f"💥 루리웹 게시글 {i+1} 상세 스크래핑 실패: {e}")
                    continue
            
            return {
                "board_posts": board_posts,
                "detailed_posts": detailed_posts
            }
            
    except Exception as e:
        logger.error(f"💥 루리웹 스크래퍼 테스트 실패: {e}")
        return {"board_posts": [], "detailed_posts": []}


def save_results_to_json(results: dict, filename: str):
    """결과를 JSON 파일로 저장"""
    try:
        # 결과 디렉토리 생성
        results_dir = project_root / "results"
        results_dir.mkdir(exist_ok=True)
        
        # 타임스탬프 추가
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        full_filename = f"{timestamp}_{filename}"
        
        filepath = results_dir / full_filename
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2, default=str)
        
        logger.info(f"✅ 결과 저장 완료: {filepath}")
        return str(filepath)
        
    except Exception as e:
        logger.error(f"💥 결과 저장 실패: {e}")
        return None


def analyze_results(results: dict):
    """스크래핑 결과 분석 및 요약"""
    logger.info("📊 스크래핑 결과 분석 시작")
    
    analysis = {
        "summary": {},
        "data_structure": {},
        "issues": []
    }
    
    for site_name, site_data in results.items():
        if not site_data:
            continue
            
        board_posts = site_data.get("board_posts", [])
        detailed_posts = site_data.get("detailed_posts", [])
        
        # 기본 통계
        analysis["summary"][site_name] = {
            "board_posts_count": len(board_posts),
            "detailed_posts_count": len(detailed_posts),
            "success_rate": len(detailed_posts) / max(len(board_posts[:3]), 1) * 100
        }
        
        # 데이터 구조 분석
        if board_posts:
            sample_board_post = board_posts[0]
            analysis["data_structure"][f"{site_name}_board_post"] = list(sample_board_post.keys())
        
        if detailed_posts:
            sample_detailed_post = detailed_posts[0]
            analysis["data_structure"][f"{site_name}_detailed_post"] = {
                "top_level_keys": list(sample_detailed_post.keys()),
                "metadata_keys": list(sample_detailed_post.get("metadata", {}).keys()),
                "content_count": len(sample_detailed_post.get("content", [])),
                "comments_count": len(sample_detailed_post.get("comments", []))
            }
            
            # 콘텐츠 타입 분석
            content_types = {}
            for content in sample_detailed_post.get("content", []):
                content_type = content.get("type", "unknown")
                content_types[content_type] = content_types.get(content_type, 0) + 1
            
            analysis["data_structure"][f"{site_name}_content_types"] = content_types
    
    logger.info("✅ 스크래핑 결과 분석 완료")
    return analysis


async def main():
    """메인 실행 함수"""
    logger.info("🚀 v2 스크래퍼 테스트 시작")
    
    # API 서버 연결 테스트
    api_connected = await test_api_connection()
    
    results = {}
    
    # FM코리아 테스트
    logger.info("=" * 50)
    fmkorea_results = await test_fmkorea_scraper()
    results["fmkorea"] = fmkorea_results
    
    # 사이트 간 간격
    await asyncio.sleep(5)
    
    # 루리웹 테스트
    logger.info("=" * 50)
    ruliweb_results = await test_ruliweb_scraper()
    results["ruliweb"] = ruliweb_results
    
    # 결과 저장
    logger.info("=" * 50)
    json_path = save_results_to_json(results, "scraper_v2_test_results.json")
    
    # 결과 분석
    analysis = analyze_results(results)
    analysis_path = save_results_to_json(analysis, "scraper_v2_analysis.json")
    
    # MongoDB 저장 (API 서버가 연결된 경우)
    if api_connected:
        logger.info("=" * 50)
        mongodb_saved = await save_to_mongodb()
        if mongodb_saved:
            logger.info("✅ MongoDB 저장 완료 - 브라우저에서 확인 가능")
            logger.info(f"🌐 API 엔드포인트: {API_BASE_URL}/community-posts")
        else:
            logger.warning("⚠️ MongoDB 저장 실패 - 파일 기반으로만 확인 가능")
    else:
        logger.warning("⚠️ API 서버 미연결 - MongoDB 저장 건너뜀")
    
    # 요약 출력
    logger.info("=" * 50)
    logger.info("📊 테스트 결과 요약:")
    for site_name, summary in analysis.get("summary", {}).items():
        logger.info(f"  {site_name}:")
        logger.info(f"    - 게시판 목록: {summary['board_posts_count']}개")
        logger.info(f"    - 상세 게시글: {summary['detailed_posts_count']}개")
        logger.info(f"    - 성공률: {summary['success_rate']:.1f}%")
    
    logger.info(f"🎉 v2 스크래퍼 테스트 완료!")
    logger.info(f"📁 결과 파일: {json_path}")
    logger.info(f"📁 분석 파일: {analysis_path}")
    
    if api_connected:
        logger.info("🌐 브라우저에서 확인:")
        logger.info(f"   - 게시글 목록: {API_BASE_URL}/community-posts")
        logger.info(f"   - 통계: {API_BASE_URL}/stats")


if __name__ == "__main__":
    asyncio.run(main()) 
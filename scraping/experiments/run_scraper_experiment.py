#!/usr/bin/env python3
"""
스크래핑 실험 실행 스크립트 (v3 스크래퍼 활용)

주요 기능:
- fmkorea_scraper_v3.py와 ruliweb_scraper_v3.py 활용 (line 20-50)
- 병렬 스크래핑 실행 및 결과 통합 (line 52-100)
- 에러 처리 및 재시도 로직 강화 (line 102-150)
- API 전송 및 파일 저장 (line 152-200)

작성자: AI Assistant
작성일: 2025년 6월 4일 22:47 (KST)
목적: v3 스크래퍼를 활용한 안정적인 스크래핑 실험 실행
"""

import asyncio
import json
import os
import sys
import time
from datetime import datetime
from typing import List, Dict, Optional, Any
import pytz
from loguru import logger

# 프로젝트 루트 경로 추가
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)

# v3 스크래퍼 임포트
try:
    from fmkorea_scraper_v3 import scrape_fmkorea_politics_page
    from ruliweb_scraper_v3 import scrape_ruliweb_politics_page
    logger.info("✅ v3 스크래퍼 모듈 임포트 성공")
except ImportError as e:
    logger.error(f"❌ v3 스크래퍼 모듈 임포트 실패: {e}")
    sys.exit(1)

# 한국 시간대 설정
KST = pytz.timezone('Asia/Seoul')

class ScrapingExperimentRunner:
    """
    스크래핑 실험 실행 클래스 (v3 스크래퍼 활용)
    """
    
    def __init__(self, config: Optional[Dict] = None):
        self.config = config or self.get_default_config()
        self.results = []
        self.errors = []
        
        # 로깅 설정
        logger.remove()
        logger.add(
            sys.stdout,
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
            level="INFO"
        )
        
        # 파일 로깅 추가
        log_dir = os.path.join(project_root, "logs")
        os.makedirs(log_dir, exist_ok=True)
        
        timestamp = datetime.now(KST).strftime('%Y%m%d_%H%M%S')
        log_file = os.path.join(log_dir, f"scraping_experiment_{timestamp}.log")
        
        logger.add(
            log_file,
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            level="DEBUG"
        )
        
        logger.info(f"📝 로그 파일: {log_file}")
    
    def get_default_config(self) -> Dict:
        """기본 설정 반환"""
        return {
            'headless': True,
            'slow_mo': 1000,
            'wait_time': 2,
            'delay_between_requests': 3,
            'timeout': 45000,
            'post_limit': 10,
            'api_url': 'http://localhost:3000/api/scraping-data',
            'retry_count': 3,
            'retry_delay': 5,
            'parallel_execution': True,
            'save_individual_files': True,
            'save_combined_file': True
        }
    
    async def run_fmkorea_scraping(self) -> List[Dict]:
        """FM코리아 스크래핑 실행"""
        logger.info("🎮 FM코리아 스크래핑 시작")
        
        try:
            results = await scrape_fmkorea_politics_page(self.config)
            
            if results:
                logger.info(f"✅ FM코리아 스크래핑 성공: {len(results)}개 게시글")
                return results
            else:
                logger.warning("⚠️ FM코리아 스크래핑 결과 없음")
                return []
                
        except Exception as e:
            error_msg = f"FM코리아 스크래핑 실패: {e}"
            logger.error(f"❌ {error_msg}")
            self.errors.append({
                'site': 'fmkorea',
                'error': error_msg,
                'timestamp': datetime.now(KST).isoformat()
            })
            return []
    
    async def run_ruliweb_scraping(self) -> List[Dict]:
        """루리웹 스크래핑 실행"""
        logger.info("🎯 루리웹 스크래핑 시작")
        
        try:
            results = await scrape_ruliweb_politics_page(self.config)
            
            if results:
                logger.info(f"✅ 루리웹 스크래핑 성공: {len(results)}개 게시글")
                return results
            else:
                logger.warning("⚠️ 루리웹 스크래핑 결과 없음")
                return []
                
        except Exception as e:
            error_msg = f"루리웹 스크래핑 실패: {e}"
            logger.error(f"❌ {error_msg}")
            self.errors.append({
                'site': 'ruliweb',
                'error': error_msg,
                'timestamp': datetime.now(KST).isoformat()
            })
            return []
    
    async def run_parallel_scraping(self) -> Dict[str, List[Dict]]:
        """병렬 스크래핑 실행"""
        logger.info("🚀 병렬 스크래핑 실행 시작")
        
        if self.config.get('parallel_execution', True):
            # 병렬 실행
            tasks = [
                self.run_fmkorea_scraping(),
                self.run_ruliweb_scraping()
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            fmkorea_results = results[0] if not isinstance(results[0], Exception) else []
            ruliweb_results = results[1] if not isinstance(results[1], Exception) else []
            
            # 예외 처리
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    site = 'fmkorea' if i == 0 else 'ruliweb'
                    error_msg = f"{site} 병렬 실행 중 오류: {result}"
                    logger.error(f"❌ {error_msg}")
                    self.errors.append({
                        'site': site,
                        'error': error_msg,
                        'timestamp': datetime.now(KST).isoformat()
                    })
        else:
            # 순차 실행
            logger.info("🔄 순차 실행 모드")
            fmkorea_results = await self.run_fmkorea_scraping()
            
            # 사이트 간 지연
            await asyncio.sleep(self.config.get('delay_between_sites', 10))
            
            ruliweb_results = await self.run_ruliweb_scraping()
        
        return {
            'fmkorea': fmkorea_results,
            'ruliweb': ruliweb_results
        }
    
    def save_results(self, results: Dict[str, List[Dict]]) -> Dict[str, str]:
        """결과 저장"""
        logger.info("💾 결과 저장 시작")
        
        saved_files = {}
        timestamp = datetime.now(KST).strftime('%Y%m%d_%H%M%S')
        
        # 데이터 폴더 생성
        data_dir = os.path.join(project_root, "data")
        os.makedirs(data_dir, exist_ok=True)
        
        try:
            # 개별 파일 저장
            if self.config.get('save_individual_files', True):
                for site, site_results in results.items():
                    if site_results:
                        filename = f"{site}_politics_experiment_{timestamp}.json"
                        filepath = os.path.join(data_dir, filename)
                        
                        with open(filepath, 'w', encoding='utf-8') as f:
                            json.dump(site_results, f, ensure_ascii=False, indent=2)
                        
                        saved_files[site] = filepath
                        logger.info(f"✅ {site} 결과 저장: {filepath}")
            
            # 통합 파일 저장
            if self.config.get('save_combined_file', True):
                all_results = []
                for site_results in results.values():
                    all_results.extend(site_results)
                
                if all_results:
                    combined_filename = f"combined_politics_experiment_{timestamp}.json"
                    combined_filepath = os.path.join(data_dir, combined_filename)
                    
                    with open(combined_filepath, 'w', encoding='utf-8') as f:
                        json.dump(all_results, f, ensure_ascii=False, indent=2)
                    
                    saved_files['combined'] = combined_filepath
                    logger.info(f"✅ 통합 결과 저장: {combined_filepath}")
            
            return saved_files
            
        except Exception as e:
            logger.error(f"❌ 결과 저장 실패: {e}")
            return {}
    
    async def send_to_api(self, results: Dict[str, List[Dict]]) -> bool:
        """API로 결과 전송"""
        api_url = self.config.get('api_url')
        if not api_url:
            logger.info("⚠️ API URL이 설정되지 않음, API 전송 건너뜀")
            return False
        
        logger.info(f"🌐 API로 결과 전송: {api_url}")
        
        try:
            import requests
            
            # 모든 결과 통합
            all_results = []
            for site_results in results.values():
                all_results.extend(site_results)
            
            if not all_results:
                logger.warning("⚠️ 전송할 결과가 없음")
                return False
            
            response = requests.post(
                api_url, 
                json=all_results, 
                timeout=30,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                logger.info(f"✅ API 전송 성공: {len(all_results)}개 게시글")
                return True
            else:
                logger.error(f"❌ API 전송 실패: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"❌ API 전송 오류: {e}")
            return False
    
    def generate_summary(self, results: Dict[str, List[Dict]]) -> Dict:
        """실험 결과 요약 생성"""
        total_posts = sum(len(site_results) for site_results in results.values())
        
        summary = {
            'experiment_info': {
                'timestamp': datetime.now(KST).isoformat(),
                'config': self.config,
                'total_sites': len(results),
                'total_posts': total_posts,
                'errors_count': len(self.errors)
            },
            'site_results': {},
            'errors': self.errors
        }
        
        for site, site_results in results.items():
            summary['site_results'][site] = {
                'posts_count': len(site_results),
                'success': len(site_results) > 0,
                'sample_titles': [
                    post.get('metadata', {}).get('title', 'N/A')[:50] + '...'
                    for post in site_results[:3]
                ]
            }
        
        return summary
    
    async def run_experiment(self) -> Dict:
        """전체 실험 실행"""
        logger.info("🧪 스크래핑 실험 시작")
        start_time = time.time()
        
        try:
            # 병렬 스크래핑 실행
            results = await self.run_parallel_scraping()
            
            # 결과 저장
            saved_files = self.save_results(results)
            
            # API 전송
            api_success = await self.send_to_api(results)
            
            # 요약 생성
            summary = self.generate_summary(results)
            summary['saved_files'] = saved_files
            summary['api_success'] = api_success
            summary['execution_time'] = time.time() - start_time
            
            # 최종 결과 출력
            total_posts = sum(len(site_results) for site_results in results.values())
            logger.info(f"🎉 실험 완료!")
            logger.info(f"📊 총 {total_posts}개 게시글 수집")
            logger.info(f"⏱️ 실행 시간: {summary['execution_time']:.2f}초")
            logger.info(f"💾 저장된 파일: {len(saved_files)}개")
            logger.info(f"🌐 API 전송: {'성공' if api_success else '실패'}")
            
            if self.errors:
                logger.warning(f"⚠️ 오류 발생: {len(self.errors)}개")
                for error in self.errors:
                    logger.warning(f"  - {error['site']}: {error['error']}")
            
            return summary
            
        except Exception as e:
            logger.error(f"💥 실험 실행 실패: {e}")
            return {
                'success': False,
                'error': str(e),
                'execution_time': time.time() - start_time
            }


# 편의 함수
async def run_scraping_experiment(config: Optional[Dict] = None) -> Dict:
    """스크래핑 실험 실행 편의 함수"""
    runner = ScrapingExperimentRunner(config)
    return await runner.run_experiment()


# 메인 실행
async def main():
    """메인 실행 함수"""
    logger.info("🚀 스크래핑 실험 실행 스크립트 시작")
    
    # 설정
    config = {
        'headless': True,
        'slow_mo': 1000,
        'wait_time': 3,
        'delay_between_requests': 4,
        'timeout': 60000,
        'post_limit': 10,
        'api_url': 'http://localhost:3000/api/scraping-data',
        'retry_count': 3,
        'parallel_execution': True,
        'save_individual_files': True,
        'save_combined_file': True
    }
    
    # 실험 실행
    result = await run_scraping_experiment(config)
    
    # 결과 출력
    if result.get('success', True):
        logger.info("✅ 스크래핑 실험 성공적으로 완료")
    else:
        logger.error("❌ 스크래핑 실험 실패")
    
    return result


if __name__ == "__main__":
    asyncio.run(main()) 
"""
데이터베이스 초기화 스크립트

주요 기능:
- 기존 컬렉션 안전 삭제 (line 20-40)
- 백업 생성 옵션 (line 41-60)
- 삭제 확인 및 로깅 (line 61-80)

작성자: AI Assistant
작성일: 2025-01-28
목적: 새로운 스크래핑을 위한 DB 초기화
"""

import asyncio
import pymongo
from datetime import datetime
from typing import Dict, Any
from loguru import logger
import json
import os


class DatabaseCleaner:
    """데이터베이스 초기화 클래스"""
    
    def __init__(self, mongodb_uri: str):
        self.client = pymongo.MongoClient(mongodb_uri)
        self.db = self.client.political_public_sphere
        
    def backup_collection(self, collection_name: str, backup_dir: str = "backups") -> str:
        """컬렉션 백업 생성"""
        try:
            # 백업 디렉토리 생성
            os.makedirs(backup_dir, exist_ok=True)
            
            # 백업 파일명 생성
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"{collection_name}_backup_{timestamp}.json"
            backup_path = os.path.join(backup_dir, backup_filename)
            
            # 컬렉션 데이터 조회
            collection = self.db[collection_name]
            documents = list(collection.find({}))
            
            # JSON 파일로 저장
            with open(backup_path, 'w', encoding='utf-8') as f:
                json.dump(documents, f, ensure_ascii=False, indent=2, default=str)
            
            logger.info(f"백업 생성 완료: {backup_path} ({len(documents)}개 문서)")
            return backup_path
            
        except Exception as e:
            logger.error(f"백업 생성 실패: {e}")
            raise
    
    def get_collection_stats(self) -> Dict[str, int]:
        """컬렉션별 문서 수 조회"""
        try:
            stats = {}
            
            # 주요 컬렉션들 확인
            collections = ['fmkorea_posts', 'community_posts']
            
            for collection_name in collections:
                try:
                    count = self.db[collection_name].count_documents({})
                    stats[collection_name] = count
                    logger.info(f"{collection_name}: {count}개 문서")
                except Exception as e:
                    logger.warning(f"{collection_name} 조회 실패: {e}")
                    stats[collection_name] = 0
            
            return stats
            
        except Exception as e:
            logger.error(f"통계 조회 실패: {e}")
            raise
    
    def clear_collection(self, collection_name: str, create_backup: bool = True) -> Dict[str, Any]:
        """컬렉션 삭제"""
        try:
            collection = self.db[collection_name]
            
            # 삭제 전 문서 수 확인
            before_count = collection.count_documents({})
            
            if before_count == 0:
                logger.info(f"{collection_name}: 이미 비어있음")
                return {
                    'collection': collection_name,
                    'before_count': 0,
                    'deleted_count': 0,
                    'backup_path': None,
                    'success': True
                }
            
            # 백업 생성 (옵션)
            backup_path = None
            if create_backup:
                backup_path = self.backup_collection(collection_name)
            
            # 컬렉션 삭제
            result = collection.delete_many({})
            deleted_count = result.deleted_count
            
            # 삭제 후 확인
            after_count = collection.count_documents({})
            
            logger.info(f"{collection_name} 삭제 완료: {deleted_count}개 문서 삭제")
            
            return {
                'collection': collection_name,
                'before_count': before_count,
                'deleted_count': deleted_count,
                'after_count': after_count,
                'backup_path': backup_path,
                'success': after_count == 0
            }
            
        except Exception as e:
            logger.error(f"{collection_name} 삭제 실패: {e}")
            raise
    
    def clear_all_collections(self, create_backup: bool = True) -> Dict[str, Any]:
        """모든 관련 컬렉션 삭제"""
        try:
            logger.info("🗑️ 데이터베이스 초기화 시작")
            
            # 삭제 전 통계
            before_stats = self.get_collection_stats()
            
            results = {}
            total_deleted = 0
            
            # 각 컬렉션 삭제
            for collection_name in before_stats.keys():
                if before_stats[collection_name] > 0:
                    result = self.clear_collection(collection_name, create_backup)
                    results[collection_name] = result
                    total_deleted += result['deleted_count']
                else:
                    logger.info(f"{collection_name}: 이미 비어있음, 건너뜀")
            
            # 삭제 후 통계
            after_stats = self.get_collection_stats()
            
            summary = {
                'before_stats': before_stats,
                'after_stats': after_stats,
                'results': results,
                'total_deleted': total_deleted,
                'success': all(count == 0 for count in after_stats.values())
            }
            
            logger.info(f"데이터베이스 초기화 완료: 총 {total_deleted}개 문서 삭제")
            return summary
            
        except Exception as e:
            logger.error(f"데이터베이스 초기화 실패: {e}")
            raise
    
    def verify_empty_database(self) -> bool:
        """데이터베이스가 비어있는지 확인"""
        try:
            stats = self.get_collection_stats()
            is_empty = all(count == 0 for count in stats.values())
            
            if is_empty:
                logger.info("✅ 데이터베이스가 비어있음 확인")
            else:
                logger.warning("⚠️ 데이터베이스에 아직 데이터가 남아있음")
                for collection, count in stats.items():
                    if count > 0:
                        logger.warning(f"  - {collection}: {count}개 문서")
            
            return is_empty
            
        except Exception as e:
            logger.error(f"데이터베이스 확인 실패: {e}")
            return False
    
    def close(self):
        """연결 종료"""
        self.client.close()


async def main():
    """메인 실행 함수"""
    mongodb_uri = "mongodb+srv://nadle:miQXsXpzayvMQAzE@cluster0.bh7mhfi.mongodb.net/"
    
    cleaner = DatabaseCleaner(mongodb_uri)
    
    try:
        logger.info("🚀 데이터베이스 초기화 프로세스 시작")
        
        # 1. 현재 상태 확인
        logger.info("1️⃣ 현재 데이터베이스 상태 확인")
        current_stats = cleaner.get_collection_stats()
        
        total_documents = sum(current_stats.values())
        if total_documents == 0:
            logger.info("데이터베이스가 이미 비어있습니다.")
            return
        
        # 2. 사용자 확인
        logger.info(f"총 {total_documents}개 문서가 삭제됩니다:")
        for collection, count in current_stats.items():
            if count > 0:
                logger.info(f"  - {collection}: {count}개")
        
        user_input = input("\n정말로 모든 데이터를 삭제하시겠습니까? (백업 생성됨) (y/N): ")
        if user_input.lower() != 'y':
            logger.info("삭제 취소됨")
            return
        
        # 3. 데이터베이스 초기화 실행
        logger.info("2️⃣ 데이터베이스 초기화 실행")
        summary = cleaner.clear_all_collections(create_backup=True)
        
        # 4. 결과 확인
        logger.info("3️⃣ 초기화 결과 확인")
        is_empty = cleaner.verify_empty_database()
        
        if summary['success'] and is_empty:
            logger.info("✅ 데이터베이스 초기화 성공!")
            logger.info("이제 새로운 스크래핑을 진행할 수 있습니다.")
        else:
            logger.error("❌ 데이터베이스 초기화 실패")
            logger.error("일부 데이터가 남아있을 수 있습니다.")
        
    except Exception as e:
        logger.error(f"초기화 중 오류 발생: {e}")
        raise
    finally:
        cleaner.close()


if __name__ == "__main__":
    asyncio.run(main()) 
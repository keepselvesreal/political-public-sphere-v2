"""
루리웹 데이터 삭제 스크립트

목차:
- MongoDB 연결 및 루리웹 데이터 삭제 (라인 1-50)
- 삭제 결과 확인 (라인 51-100)

작성자: AI Assistant
작성일: 2025-01-28
목적: 기존 루리웹 데이터를 삭제하여 새로운 스크래핑 준비
"""

import pymongo
from loguru import logger

# MongoDB 연결 설정
MONGODB_URI = 'mongodb+srv://nadle:miQXsXpzayvMQAzE@cluster0.bh7mhfi.mongodb.net/political_public_sphere'
DATABASE_NAME = 'political_public_sphere'
COLLECTION_NAME = 'community_posts'

def delete_ruliweb_data():
    """루리웹 데이터 삭제"""
    try:
        # MongoDB 연결
        client = pymongo.MongoClient(MONGODB_URI)
        db = client[DATABASE_NAME]
        collection = db[COLLECTION_NAME]
        
        # 연결 테스트
        client.admin.command('ping')
        logger.info("✅ MongoDB 연결 성공")
        
        # 삭제 전 루리웹 데이터 개수 확인
        ruliweb_count_before = collection.count_documents({'site': 'ruliweb'})
        total_count_before = collection.count_documents({})
        
        logger.info(f"📊 삭제 전 데이터 현황:")
        logger.info(f"   - 전체 게시글: {total_count_before}개")
        logger.info(f"   - 루리웹 게시글: {ruliweb_count_before}개")
        
        if ruliweb_count_before == 0:
            logger.info("✅ 삭제할 루리웹 데이터가 없습니다.")
            return
        
        # 루리웹 데이터 삭제
        logger.info("🗑️ 루리웹 데이터 삭제 시작...")
        delete_result = collection.delete_many({'site': 'ruliweb'})
        
        # 삭제 후 데이터 개수 확인
        ruliweb_count_after = collection.count_documents({'site': 'ruliweb'})
        total_count_after = collection.count_documents({})
        
        logger.info(f"✅ 루리웹 데이터 삭제 완료:")
        logger.info(f"   - 삭제된 게시글: {delete_result.deleted_count}개")
        logger.info(f"   - 남은 전체 게시글: {total_count_after}개")
        logger.info(f"   - 남은 루리웹 게시글: {ruliweb_count_after}개")
        
        if ruliweb_count_after == 0:
            logger.info("🎉 모든 루리웹 데이터가 성공적으로 삭제되었습니다.")
        else:
            logger.warning(f"⚠️ {ruliweb_count_after}개의 루리웹 데이터가 남아있습니다.")
        
    except Exception as e:
        logger.error(f"💥 루리웹 데이터 삭제 실패: {e}")
        raise
    finally:
        # MongoDB 연결 종료
        if 'client' in locals():
            client.close()

if __name__ == "__main__":
    # 로그 설정
    logger.add("logs/delete_ruliweb_data.log", rotation="1 day", retention="7 days")
    
    delete_ruliweb_data() 
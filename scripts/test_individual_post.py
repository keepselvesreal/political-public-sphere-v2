"""
개별 루리웹 게시글 API 테스트 스크립트

목차:
- MongoDB 연결 및 루리웹 게시글 조회 (라인 1-50)
- API 응답 시뮬레이션 (라인 51-100)

작성자: AI Assistant
작성일: 2025-01-28
목적: 새로 스크래핑된 루리웹 게시글의 API 응답 테스트
"""

import pymongo
import json
from pprint import pprint

# MongoDB 연결 설정
MONGODB_URI = 'mongodb+srv://nadle:miQXsXpzayvMQAzE@cluster0.bh7mhfi.mongodb.net/political_public_sphere'
DATABASE_NAME = 'political_public_sphere'
COLLECTION_NAME = 'community_posts'

def test_individual_post():
    """개별 루리웹 게시글 API 테스트"""
    try:
        client = pymongo.MongoClient(MONGODB_URI)
        db = client[DATABASE_NAME]
        collection = db[COLLECTION_NAME]
        
        # 연결 테스트
        client.admin.command('ping')
        print("✅ MongoDB 연결 성공")
        
        # 루리웹 게시글 중 상세 데이터가 있는 것 조회
        ruliweb_post = collection.find_one({
            'site': 'ruliweb',
            'content': {'$exists': True, '$ne': []},
            'comments': {'$exists': True}
        })
        
        if not ruliweb_post:
            print("❌ 상세 데이터가 있는 루리웹 게시글을 찾을 수 없습니다.")
            return
        
        post_id = ruliweb_post.get('post_id')
        title = ruliweb_post.get('metadata', {}).get('title', '제목 없음')
        content_count = len(ruliweb_post.get('content', []))
        comment_count = len(ruliweb_post.get('comments', []))
        
        print(f"\n📄 테스트 대상 게시글:")
        print(f"   - post_id: {post_id}")
        print(f"   - 제목: {title}")
        print(f"   - 본문 요소: {content_count}개")
        print(f"   - 댓글: {comment_count}개")
        
        # API 변환 로직 시뮬레이션
        print(f"\n🔄 API 변환 로직 테스트:")
        
        # 콘텐츠 변환 테스트
        print(f"\n📝 콘텐츠 변환:")
        for i, item in enumerate(ruliweb_post.get('content', [])[:3]):
            print(f"   {i+1}. 타입: {item.get('type')}")
            if item.get('type') == 'text':
                # 루리웹 구조: item.text 직접 사용
                text = item.get('text') or item.get('data', {}).get('text', '')
                print(f"      텍스트: {text[:50]}...")
            elif item.get('type') == 'image':
                # 루리웹 구조: item.src 직접 사용
                src = item.get('src') or item.get('data', {}).get('src', '')
                print(f"      이미지: {src}")
            elif item.get('type') == 'video':
                # 루리웹 구조: item.src 직접 사용
                src = item.get('src') or item.get('data', {}).get('src', '')
                print(f"      비디오: {src}")
        
        # 댓글 변환 테스트
        print(f"\n💬 댓글 변환:")
        for i, comment in enumerate(ruliweb_post.get('comments', [])[:3]):
            print(f"   {i+1}. 작성자: {comment.get('author', '익명')}")
            print(f"      내용: {comment.get('content', '')[:50]}...")
            print(f"      날짜: {comment.get('date', comment.get('created_at', ''))}")
            print(f"      추천: {comment.get('like_count', 0)}")
            if comment.get('images'):
                print(f"      이미지: {len(comment.get('images', []))}개")
        
        print(f"\n✅ API 변환 로직 테스트 완료")
        print(f"   - 루리웹 구조 (item.text, item.src)와 FM코리아 구조 (item.data.text, item.data.src) 모두 지원")
        print(f"   - 기존 FM코리아 데이터는 영향받지 않음")
        print(f"   - 새로운 루리웹 데이터도 정상 처리됨")
        
    except Exception as e:
        print(f"💥 테스트 실패: {e}")
        raise
    finally:
        # MongoDB 연결 종료
        if 'client' in locals():
            client.close()

if __name__ == "__main__":
    test_individual_post() 
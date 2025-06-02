"""
루리웹 데이터 구조 확인 스크립트

목차:
- MongoDB 연결 및 데이터 조회 (라인 1-50)
- 데이터 구조 분석 (라인 51-100)

작성자: AI Assistant
작성일: 2025-01-28
목적: 루리웹 게시글의 본문과 댓글 데이터 구조 확인
"""

import pymongo
import json
from pprint import pprint

# MongoDB 연결 설정
MONGODB_URI = 'mongodb+srv://nadle:miQXsXpzayvMQAzE@cluster0.bh7mhfi.mongodb.net/political_public_sphere'
DATABASE_NAME = 'political_public_sphere'
COLLECTION_NAME = 'community_posts'

def check_ruliweb_data():
    """루리웹 데이터 구조 확인"""
    try:
        client = pymongo.MongoClient(MONGODB_URI)
        db = client[DATABASE_NAME]
        collection = db[COLLECTION_NAME]
        
        # 루리웹 게시글 하나 조회
        ruliweb_post = collection.find_one({'site': 'ruliweb'})
        
        if ruliweb_post:
            print('=== 루리웹 게시글 구조 ===')
            print(f'post_id: {ruliweb_post.get("post_id")}')
            print(f'title: {ruliweb_post.get("metadata", {}).get("title")}')
            print(f'content 개수: {len(ruliweb_post.get("content", []))}')
            print(f'comments 개수: {len(ruliweb_post.get("comments", []))}')
            print()
            
            print('=== metadata 구조 ===')
            metadata = ruliweb_post.get('metadata', {})
            for key, value in metadata.items():
                print(f'{key}: {value}')
            print()
            
            print('=== content 구조 ===')
            content_list = ruliweb_post.get('content', [])
            if content_list:
                for i, content in enumerate(content_list[:3]):
                    print(f'{i+1}. 전체 구조:')
                    pprint(content, width=100, depth=3)
                    print()
            else:
                print('content가 비어있습니다.')
            print()
            
            print('=== comments 구조 ===')
            comments_list = ruliweb_post.get('comments', [])
            if comments_list:
                for i, comment in enumerate(comments_list[:2]):
                    print(f'{i+1}. 전체 구조:')
                    pprint(comment, width=100, depth=3)
                    print()
            else:
                print('comments가 비어있습니다.')
            
            print('=== 전체 키 구조 ===')
            print(f'최상위 키들: {list(ruliweb_post.keys())}')
            
        else:
            print('루리웹 게시글을 찾을 수 없습니다.')
            
    except Exception as e:
        print(f'오류 발생: {e}')

if __name__ == "__main__":
    check_ruliweb_data() 
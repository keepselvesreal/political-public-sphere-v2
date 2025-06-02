"""
루리웹 API 테스트 스크립트

목차:
- MongoDB 연결 및 데이터 확인 (라인 1-50)
- API 응답 시뮬레이션 테스트 (라인 51-100)
- 데이터 변환 테스트 (라인 101-150)

작성자: AI Assistant
작성일: 2025-01-28
목적: 루리웹 데이터가 API를 통해 제대로 조회되는지 확인
"""

import pymongo
import json
from datetime import datetime
import pytz

# MongoDB 연결 설정
MONGODB_URI = 'mongodb+srv://nadle:miQXsXpzayvMQAzE@cluster0.bh7mhfi.mongodb.net/political_public_sphere'
DATABASE_NAME = 'political_public_sphere'
COLLECTION_NAME = 'community_posts'

# 한국 시간대 설정
KST = pytz.timezone('Asia/Seoul')

# 커뮤니티별 설정 (API와 동일)
COMMUNITY_CONFIG = {
    'fmkorea': {
        'name': 'FM코리아',
        'emoji': '🎮',
        'color': 'blue',
        'defaultAuthor': '익명'
    },
    'ruliweb': {
        'name': '루리웹',
        'emoji': '🎯',
        'color': 'purple',
        'defaultAuthor': '익명'
    },
    'clien': {
        'name': '클리앙',
        'emoji': '💻',
        'color': 'green',
        'defaultAuthor': '익명'
    },
    'dcinside': {
        'name': 'DC인사이드',
        'emoji': '🎨',
        'color': 'red',
        'defaultAuthor': '익명'
    },
    'instiz': {
        'name': '인스티즈',
        'emoji': '🌟',
        'color': 'orange',
        'defaultAuthor': '익명'
    }
}

def transform_community_post(post, topMetric=None):
    """API와 동일한 데이터 변환 함수"""
    config = COMMUNITY_CONFIG[post['site']]
    
    # 제목 추출 (metadata에서 우선, 없으면 content에서 추출)
    title = post.get('metadata', {}).get('title', '')
    
    if not title:
        # content에서 텍스트 추출
        text_content = ''
        if post.get('content'):
            for item in post['content']:
                if item.get('type') == 'text':
                    text_content += item.get('text', '') + ' '
        title = text_content[:100] or f"{config['name']} 게시글 {post['post_id']}"

    # 날짜 정보 추출
    date_string = post.get('metadata', {}).get('date') or post.get('scraped_at') or datetime.now().isoformat()
    
    # 메트릭 정보
    views = post.get('metadata', {}).get('view_count', 0)
    likes = post.get('metadata', {}).get('like_count', 0)
    dislikes = post.get('metadata', {}).get('dislike_count', 0)
    comments_count = len(post.get('comments', [])) or post.get('metadata', {}).get('comment_count', 0)

    # 새로운 메트릭 boolean 값 설정
    top_likes = topMetric == 'top_likes'
    top_comments = topMetric == 'top_comments'
    top_views = topMetric == 'top_views'

    return {
        '_id': str(post['_id']),
        'post_id': post['post_id'],
        'community': config['name'],
        'site': post['site'],
        'title': title,
        'author': post.get('metadata', {}).get('author') or config['defaultAuthor'],
        'created_at': date_string,
        'views': views,
        'likes': likes,
        'dislikes': dislikes,
        'comments_count': comments_count,
        'url': post.get('post_url', ''),
        'content': title[:200],
        'likes_per_view': views > 0 and likes / views or 0,
        'comments_per_view': views > 0 and comments_count / views or 0,
        'views_per_exposure_hour': 0,  # 계산 생략
        'top_likes': top_likes,
        'top_comments': top_comments,
        'top_views': top_views
    }

def test_mongodb_connection():
    """MongoDB 연결 및 루리웹 데이터 확인"""
    try:
        print("🔍 MongoDB 연결 테스트 시작...")
        
        client = pymongo.MongoClient(MONGODB_URI)
        db = client[DATABASE_NAME]
        collection = db[COLLECTION_NAME]
        
        # 연결 테스트
        client.admin.command('ping')
        print("✅ MongoDB 연결 성공")
        
        # 전체 데이터 개수 확인
        total_count = collection.count_documents({})
        print(f"📊 전체 게시글 수: {total_count}개")
        
        # 루리웹 데이터 개수 확인
        ruliweb_count = collection.count_documents({'site': 'ruliweb'})
        print(f"🎯 루리웹 게시글 수: {ruliweb_count}개")
        
        # 루리웹 샘플 데이터 조회
        ruliweb_posts = list(collection.find({'site': 'ruliweb'}).limit(5))
        
        if ruliweb_posts:
            print(f"\n📝 루리웹 샘플 데이터 ({len(ruliweb_posts)}개):")
            for i, post in enumerate(ruliweb_posts, 1):
                title = post.get('metadata', {}).get('title', '제목 없음')
                author = post.get('metadata', {}).get('author', '익명')
                views = post.get('metadata', {}).get('view_count', 0)
                likes = post.get('metadata', {}).get('like_count', 0)
                print(f"  {i}. {title[:50]}... (작성자: {author}, 조회: {views}, 추천: {likes})")
        else:
            print("⚠️ 루리웹 데이터가 없습니다.")
        
        return client, db, collection, ruliweb_posts
        
    except Exception as e:
        print(f"💥 MongoDB 연결 실패: {e}")
        return None, None, None, []

def test_api_transformation():
    """API 데이터 변환 테스트"""
    try:
        print("\n🔄 API 데이터 변환 테스트 시작...")
        
        client, db, collection, ruliweb_posts = test_mongodb_connection()
        
        if not ruliweb_posts:
            print("⚠️ 테스트할 루리웹 데이터가 없습니다.")
            return
        
        # 각 메트릭별로 변환 테스트
        metrics = ['top_likes', 'top_comments', 'top_views']
        
        for metric in metrics:
            print(f"\n📈 {metric} 메트릭 변환 테스트:")
            
            transformed_posts = []
            for post in ruliweb_posts[:3]:  # 처음 3개만 테스트
                transformed = transform_community_post(post, metric)
                transformed_posts.append(transformed)
            
            for i, transformed in enumerate(transformed_posts, 1):
                print(f"  {i}. {transformed['title'][:40]}...")
                print(f"     커뮤니티: {transformed['community']}")
                print(f"     작성자: {transformed['author']}")
                print(f"     조회수: {transformed['views']}")
                print(f"     추천수: {transformed['likes']}")
                print(f"     댓글수: {transformed['comments_count']}")
                print(f"     {metric}: {transformed[metric]}")
        
        print("\n✅ API 데이터 변환 테스트 완료")
        
    except Exception as e:
        print(f"💥 API 변환 테스트 실패: {e}")

def test_api_response_simulation():
    """API 응답 시뮬레이션 테스트"""
    try:
        print("\n🌐 API 응답 시뮬레이션 테스트 시작...")
        
        client, db, collection, _ = test_mongodb_connection()
        
        if not collection:
            print("⚠️ MongoDB 연결 실패로 테스트를 건너뜁니다.")
            return
        
        # 루리웹 데이터 조회 (API와 동일한 방식)
        filter_query = {'site': 'ruliweb'}
        sort_options = {'created_at': -1}  # 최신순
        limit = 10
        
        posts = list(collection.find(filter_query).sort([('created_at', -1)]).limit(limit))
        
        if posts:
            print(f"📋 조회된 루리웹 게시글: {len(posts)}개")
            
            # API 응답 형식으로 변환
            transformed_posts = [transform_community_post(post, 'top_likes') for post in posts]
            
            # 응답 데이터 구성 (API와 동일)
            response_data = {
                'success': True,
                'data': transformed_posts,
                'pagination': {
                    'total': len(posts),
                    'skip': 0,
                    'limit': limit,
                    'hasMore': False,
                    'currentPage': 1,
                    'totalPages': 1
                },
                'filters': {
                    'sortBy': 'created_at',
                    'order': 'desc',
                    'search': None,
                    'topMetric': 'top_likes'
                },
                'meta': {
                    'usedCollection': 'community_posts',
                    'dataSource': 'new_model'
                }
            }
            
            print(f"✅ API 응답 시뮬레이션 성공")
            print(f"📊 응답 데이터 요약:")
            print(f"  - 성공 여부: {response_data['success']}")
            print(f"  - 데이터 개수: {len(response_data['data'])}개")
            print(f"  - 사용된 컬렉션: {response_data['meta']['usedCollection']}")
            print(f"  - 데이터 소스: {response_data['meta']['dataSource']}")
            
            # 첫 번째 게시글 상세 정보
            if response_data['data']:
                first_post = response_data['data'][0]
                print(f"\n📝 첫 번째 게시글 정보:")
                print(f"  - 제목: {first_post['title']}")
                print(f"  - 커뮤니티: {first_post['community']}")
                print(f"  - 작성자: {first_post['author']}")
                print(f"  - 조회수: {first_post['views']}")
                print(f"  - 추천수: {first_post['likes']}")
                print(f"  - URL: {first_post['url']}")
        else:
            print("⚠️ 조회된 루리웹 게시글이 없습니다.")
        
    except Exception as e:
        print(f"💥 API 응답 시뮬레이션 실패: {e}")

def main():
    """메인 테스트 함수"""
    print("🧪 루리웹 API 테스트 시작")
    print("=" * 50)
    
    # 1. MongoDB 연결 테스트
    test_mongodb_connection()
    
    # 2. API 데이터 변환 테스트
    test_api_transformation()
    
    # 3. API 응답 시뮬레이션 테스트
    test_api_response_simulation()
    
    print("\n" + "=" * 50)
    print("🎉 루리웹 API 테스트 완료")

if __name__ == "__main__":
    main() 
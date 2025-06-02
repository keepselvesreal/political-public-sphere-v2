"""
CommunityPost 모델 유틸리티 함수들

주요 기능:
- SelectionCriteria: 게시글 선별 기준 enum (line 20-30)
- convert_to_community_post: 스크래퍼 결과를 CommunityPost 모델로 변환 (line 32-80)
- save_community_post: CommunityPost 데이터를 MongoDB에 저장 (line 82-120)
- get_community_collection_stats: 저장된 커뮤니티 게시글 통계 조회 (line 122-150)
- CommunityPostManager: 커뮤니티 게시글 관리 클래스 (line 152-220)

작성자: AI Assistant
작성일: 2025-01-28
목적: 다양한 커뮤니티 스크래퍼에서 공통으로 사용할 유틸리티 함수 제공
"""

import pymongo
from datetime import datetime
from typing import Dict, List, Any, Optional
from enum import Enum
from loguru import logger


class SelectionCriteria(Enum):
    """게시글 선별 기준 enum"""
    LIKES = "likes"
    COMMENTS = "comments"
    VIEWS = "views"


def convert_to_community_post(experiment_data: Dict[str, Any], site: str = 'fmkorea', 
                            selection_criteria: Optional[SelectionCriteria] = None) -> Dict[str, Any]:
    """
    스크래퍼 결과를 CommunityPost 모델로 변환
    
    Args:
        experiment_data: 스크래퍼에서 수집한 원본 데이터
        site: 커뮤니티 사이트 이름 (기본값: 'fmkorea')
        selection_criteria: 게시글 선별 기준 (추천수/댓글수/조회수)
    
    Returns:
        CommunityPost 모델 구조의 딕셔너리
    """
    try:
        now = datetime.now()
        
        community_post = {
            'post_id': experiment_data.get('post_id'),
            'post_url': experiment_data.get('post_url'),
            'site': site,
            'scraped_at': experiment_data.get('scraped_at', now.isoformat()),
            'selection_criteria': selection_criteria.value if selection_criteria else None,
            'metadata': {
                'title': experiment_data.get('metadata', {}).get('title', '제목 없음'),
                'author': experiment_data.get('metadata', {}).get('author', '익명'),
                'date': experiment_data.get('metadata', {}).get('date', now.isoformat()),
                'view_count': experiment_data.get('metadata', {}).get('view_count', 0),
                'like_count': experiment_data.get('metadata', {}).get('like_count', 0),
                'dislike_count': experiment_data.get('metadata', {}).get('dislike_count', 0),
                'comment_count': experiment_data.get('metadata', {}).get('comment_count', 0)
            },
            'content': experiment_data.get('content', []),
            'comments': experiment_data.get('comments', []),
            'created_at': now,
            'updated_at': now
        }
        
        return community_post
        
    except Exception as e:
        logger.error(f"💥 CommunityPost 변환 실패: {e}")
        return {}


def save_community_post(collection, post: Dict[str, Any], site: str = 'fmkorea') -> bool:
    """
    CommunityPost 데이터를 MongoDB에 저장
    
    Args:
        collection: MongoDB 컬렉션 객체
        post: 저장할 CommunityPost 데이터
        site: 커뮤니티 사이트 이름
    
    Returns:
        저장 성공 여부
    """
    try:
        # 중복 확인
        existing = collection.find_one({
            'site': site,
            'post_id': post['post_id']
        })
        
        if existing:
            logger.debug(f"이미 존재하는 게시글: {post['post_id']}")
            return False
        
        # 저장
        result = collection.insert_one(post)
        
        if result.inserted_id:
            selection_info = f" ({post.get('selection_criteria', 'N/A')} 기준)" if post.get('selection_criteria') else ""
            logger.info(f"✅ 게시글 저장 성공: {post['post_id']} - {post['metadata']['title'][:30]}...{selection_info}")
            return True
        else:
            logger.error(f"❌ 게시글 저장 실패: {post['post_id']}")
            return False
            
    except Exception as e:
        logger.error(f"💥 게시글 저장 중 오류: {e}")
        return False


def get_community_collection_stats(collection, site: str = 'fmkorea') -> Dict[str, Any]:
    """
    저장된 커뮤니티 게시글 통계 조회
    
    Args:
        collection: MongoDB 컬렉션 객체
        site: 커뮤니티 사이트 이름
    
    Returns:
        통계 정보 딕셔너리
    """
    try:
        total_count = collection.count_documents({'site': site})
        
        # 선별 기준별 통계
        criteria_stats = {}
        for criteria in SelectionCriteria:
            count = collection.count_documents({
                'site': site,
                'selection_criteria': criteria.value
            })
            criteria_stats[criteria.value] = count
        
        # 최근 저장된 게시글
        recent_posts = list(collection.find(
            {'site': site}, 
            {'post_id': 1, 'metadata.title': 1, 'selection_criteria': 1, 'created_at': 1}
        ).sort('created_at', -1).limit(5))
        
        return {
            'total_posts': total_count,
            'criteria_stats': criteria_stats,
            'recent_posts': recent_posts
        }
        
    except Exception as e:
        logger.error(f"💥 통계 조회 실패: {e}")
        return {'total_posts': 0, 'criteria_stats': {}, 'recent_posts': []}


class CommunityPostManager:
    """커뮤니티 게시글 관리 클래스"""
    
    def __init__(self, mongodb_uri: str, database_name: str = 'political_public_sphere', 
                 collection_name: str = 'community_posts'):
        """
        초기화
        
        Args:
            mongodb_uri: MongoDB 연결 URI
            database_name: 데이터베이스 이름
            collection_name: 컬렉션 이름
        """
        self.client = pymongo.MongoClient(mongodb_uri)
        self.db = self.client[database_name]
        self.collection = self.db[collection_name]
    
    def convert_and_save(self, experiment_data: Dict[str, Any], site: str = 'fmkorea',
                        selection_criteria: Optional[SelectionCriteria] = None) -> bool:
        """
        스크래퍼 데이터를 CommunityPost로 변환하고 저장
        
        Args:
            experiment_data: 스크래퍼에서 수집한 원본 데이터
            site: 커뮤니티 사이트 이름
            selection_criteria: 게시글 선별 기준
        
        Returns:
            저장 성공 여부
        """
        try:
            # 변환
            community_post = convert_to_community_post(experiment_data, site, selection_criteria)
            
            if not community_post:
                logger.error("CommunityPost 변환 실패")
                return False
            
            # 저장
            return save_community_post(self.collection, community_post, site)
            
        except Exception as e:
            logger.error(f"💥 변환 및 저장 실패: {e}")
            return False
    
    def save_selected_posts(self, selected_posts: Dict[str, List[Dict]], site: str = 'fmkorea') -> Dict[str, int]:
        """
        선별된 게시글들을 기준별로 저장
        
        Args:
            selected_posts: 기준별 선별된 게시글 딕셔너리
            site: 커뮤니티 사이트 이름
        
        Returns:
            기준별 저장 성공 개수
        """
        try:
            save_stats = {}
            
            for criteria_name, posts in selected_posts.items():
                saved_count = 0
                
                # enum 값으로 변환
                try:
                    criteria_enum = SelectionCriteria(criteria_name)
                except ValueError:
                    logger.warning(f"⚠️ 알 수 없는 선별 기준: {criteria_name}")
                    continue
                
                for post_data in posts:
                    # 각 게시글을 상세 스크래핑 후 저장하는 로직은 별도 구현 필요
                    # 여기서는 기본 정보만 저장
                    experiment_data = {
                        'post_id': post_data.get('post_id'),
                        'post_url': post_data.get('post_url'),
                        'metadata': {
                            'title': post_data.get('title', ''),
                            'author': post_data.get('author', ''),
                            'date': post_data.get('date', ''),
                            'view_count': post_data.get('view_count', 0),
                            'like_count': post_data.get('like_count', 0),
                            'comment_count': post_data.get('comment_count', 0)
                        },
                        'content': [],  # 상세 스크래핑 시 채워짐
                        'comments': []  # 상세 스크래핑 시 채워짐
                    }
                    
                    if self.convert_and_save(experiment_data, site, criteria_enum):
                        saved_count += 1
                
                save_stats[criteria_name] = saved_count
                logger.info(f"✅ {criteria_name} 기준 게시글 저장: {saved_count}/{len(posts)}개")
            
            return save_stats
            
        except Exception as e:
            logger.error(f"💥 선별된 게시글 저장 실패: {e}")
            return {}
    
    def get_stats(self, site: str = 'fmkorea') -> Dict[str, Any]:
        """
        통계 조회
        
        Args:
            site: 커뮤니티 사이트 이름
        
        Returns:
            통계 정보
        """
        return get_community_collection_stats(self.collection, site)
    
    def find_posts(self, site: str = 'fmkorea', limit: int = 10, 
                   sort_by: str = 'created_at', sort_order: int = -1,
                   selection_criteria: Optional[SelectionCriteria] = None) -> List[Dict[str, Any]]:
        """
        게시글 조회
        
        Args:
            site: 커뮤니티 사이트 이름
            limit: 조회할 게시글 수
            sort_by: 정렬 기준 필드
            sort_order: 정렬 순서 (1: 오름차순, -1: 내림차순)
            selection_criteria: 선별 기준 필터
        
        Returns:
            게시글 목록
        """
        try:
            query = {'site': site}
            
            if selection_criteria:
                query['selection_criteria'] = selection_criteria.value
            
            posts = list(self.collection.find(query).sort(sort_by, sort_order).limit(limit))
            
            return posts
            
        except Exception as e:
            logger.error(f"💥 게시글 조회 실패: {e}")
            return []
    
    def close(self):
        """연결 종료"""
        self.client.close() 
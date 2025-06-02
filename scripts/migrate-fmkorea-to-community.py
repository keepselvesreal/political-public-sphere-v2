"""
FM코리아 데이터를 일반적인 커뮤니티 포스트 구조로 마이그레이션

주요 기능:
- 기존 fmkorea_posts 컬렉션 데이터 읽기 (line 20-60)
- 새로운 community_posts 구조로 변환 (line 61-120)
- 안전한 마이그레이션 및 롤백 지원 (line 121-180)
- 새로운 메트릭 구조 지원 (line 181-220)

작성자: AI Assistant
작성일: 2025-01-28
목적: 점진적 모델 변환을 위한 데이터 마이그레이션
"""

import asyncio
import pymongo
from datetime import datetime
from typing import Dict, List, Any, Optional
from loguru import logger


class FmkoreaToCommunitMigrator:
    """FM코리아 데이터를 일반적인 커뮤니티 구조로 마이그레이션 (새로운 메트릭 구조 지원)"""
    
    def __init__(self, mongodb_uri: str):
        self.client = pymongo.MongoClient(mongodb_uri)
        self.db = self.client.political_public_sphere
        self.source_collection = self.db.fmkorea_posts
        self.target_collection = self.db.community_posts
        
    def transform_post_data(self, fmkorea_post: Dict[str, Any]) -> Dict[str, Any]:
        """FM코리아 게시글 데이터를 일반적인 커뮤니티 구조로 변환 (새로운 메트릭 구조)"""
        try:
            # 기본 필드 매핑
            community_post = {
                'post_id': fmkorea_post.get('post_id'),
                'post_url': fmkorea_post.get('post_url'),
                'site': 'fmkorea',  # 하드코딩 제거
                'scraped_at': fmkorea_post.get('scraped_at'),
                'created_at': fmkorea_post.get('scraped_at'),  # 기본값으로 scraped_at 사용
                'updated_at': datetime.now()
            }
            
            # 메타데이터 변환
            old_metadata = fmkorea_post.get('metadata', {})
            community_post['metadata'] = {
                'title': old_metadata.get('title'),
                'author': old_metadata.get('author'),
                'date': old_metadata.get('date'),
                'view_count': old_metadata.get('view_count'),
                'like_count': old_metadata.get('like_count'),
                'dislike_count': old_metadata.get('dislike_count'),
                'comment_count': old_metadata.get('comment_count')
            }
            
            # 콘텐츠 변환 (새로운 구조 지원)
            old_content = fmkorea_post.get('content', [])
            community_post['content'] = []
            
            for item in old_content:
                if isinstance(item, dict):
                    transformed_item = {
                        'type': item.get('type', 'text'),
                        'order': item.get('order', 0),
                        'data': item.get('data', {})
                    }
                    
                    # 기존 구조 호환성 유지
                    if 'content' in item and 'data' not in item:
                        transformed_item['data'] = {'text': item['content']}
                    elif 'src' in item and 'data' not in item:
                        transformed_item['data'] = {
                            'src': item['src'],
                            'alt': item.get('alt', ''),
                            'width': item.get('width', ''),
                            'height': item.get('height', '')
                        }
                    
                    community_post['content'].append(transformed_item)
            
            # 댓글 변환
            old_comments = fmkorea_post.get('comments', [])
            community_post['comments'] = []
            
            for comment in old_comments:
                if isinstance(comment, dict):
                    transformed_comment = {
                        'id': comment.get('id'),
                        'author': comment.get('author'),
                        'content': comment.get('content'),
                        'date': comment.get('date'),
                        'depth': comment.get('depth', 0),
                        'is_reply': comment.get('is_reply', False),
                        'parent_id': comment.get('parent_id'),
                        'like_count': comment.get('like_count'),
                        'dislike_count': comment.get('dislike_count'),
                        'is_best': comment.get('is_best', False),
                        'is_author': comment.get('is_author', False)
                    }
                    community_post['comments'].append(transformed_comment)
            
            return community_post
            
        except Exception as e:
            logger.error(f"데이터 변환 실패: {e}")
            logger.error(f"원본 데이터: {fmkorea_post}")
            raise
    
    def validate_transformed_data(self, original: Dict[str, Any], transformed: Dict[str, Any]) -> bool:
        """변환된 데이터의 유효성 검증 (새로운 메트릭 구조 고려)"""
        try:
            # 필수 필드 확인
            required_fields = ['post_id', 'post_url', 'site', 'scraped_at']
            for field in required_fields:
                if not transformed.get(field):
                    logger.error(f"필수 필드 누락: {field}")
                    return False
            
            # 데이터 일관성 확인
            if transformed['post_id'] != original.get('post_id'):
                logger.error("post_id 불일치")
                return False
            
            if transformed['site'] != 'fmkorea':
                logger.error("site 필드 오류")
                return False
            
            # 콘텐츠 개수 확인
            original_content_count = len(original.get('content', []))
            transformed_content_count = len(transformed.get('content', []))
            
            if original_content_count != transformed_content_count:
                logger.warning(f"콘텐츠 개수 불일치: {original_content_count} -> {transformed_content_count}")
            
            # 댓글 개수 확인
            original_comment_count = len(original.get('comments', []))
            transformed_comment_count = len(transformed.get('comments', []))
            
            if original_comment_count != transformed_comment_count:
                logger.warning(f"댓글 개수 불일치: {original_comment_count} -> {transformed_comment_count}")
            
            # 메트릭 데이터 검증 (새로운 구조)
            metadata = transformed.get('metadata', {})
            if metadata.get('view_count') is not None and metadata.get('view_count') < 0:
                logger.warning("조회수가 음수입니다")
            
            if metadata.get('like_count') is not None and metadata.get('like_count') < 0:
                logger.warning("추천수가 음수입니다")
            
            if metadata.get('comment_count') is not None and metadata.get('comment_count') < 0:
                logger.warning("댓글수가 음수입니다")
            
            return True
            
        except Exception as e:
            logger.error(f"데이터 검증 실패: {e}")
            return False
    
    def calculate_post_metrics(self, post: Dict[str, Any]) -> Dict[str, float]:
        """게시글의 메트릭 계산 (새로운 구조)"""
        try:
            metadata = post.get('metadata', {})
            views = metadata.get('view_count', 0)
            likes = metadata.get('like_count', 0)
            comments_count = len(post.get('comments', []))
            
            # 메트릭 계산
            likes_per_view = likes / views if views > 0 else 0
            comments_per_view = comments_count / views if views > 0 else 0
            
            # 시간당 조회수 계산
            created_at = post.get('created_at')
            if created_at:
                try:
                    if isinstance(created_at, str):
                        created_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    else:
                        created_date = created_at
                    
                    hours_from_creation = (datetime.now() - created_date).total_seconds() / 3600
                    views_per_exposure_hour = views / hours_from_creation if hours_from_creation > 0 else 0
                except:
                    views_per_exposure_hour = 0
            else:
                views_per_exposure_hour = 0
            
            return {
                'likes_per_view': likes_per_view,
                'comments_per_view': comments_per_view,
                'views_per_exposure_hour': views_per_exposure_hour
            }
            
        except Exception as e:
            logger.error(f"메트릭 계산 실패: {e}")
            return {
                'likes_per_view': 0,
                'comments_per_view': 0,
                'views_per_exposure_hour': 0
            }
    
    def migrate_posts(self, batch_size: int = 100, dry_run: bool = True) -> Dict[str, int]:
        """게시글 마이그레이션 실행 (새로운 메트릭 구조 지원)"""
        stats = {
            'total': 0,
            'success': 0,
            'failed': 0,
            'skipped': 0
        }
        
        try:
            # 전체 게시글 수 확인
            total_posts = self.source_collection.count_documents({})
            stats['total'] = total_posts
            
            logger.info(f"마이그레이션 시작: {total_posts}개 게시글")
            logger.info(f"Dry run 모드: {dry_run}")
            logger.info(f"새로운 메트릭 구조 지원: top_likes, top_comments, top_views")
            
            # 배치 단위로 처리
            skip = 0
            while skip < total_posts:
                posts = list(self.source_collection.find({}).skip(skip).limit(batch_size))
                
                for post in posts:
                    try:
                        # 이미 마이그레이션된 게시글인지 확인
                        existing = self.target_collection.find_one({
                            'site': 'fmkorea',
                            'post_id': post.get('post_id')
                        })
                        
                        if existing:
                            logger.debug(f"이미 마이그레이션됨: {post.get('post_id')}")
                            stats['skipped'] += 1
                            continue
                        
                        # 데이터 변환
                        transformed = self.transform_post_data(post)
                        
                        # 데이터 검증
                        if not self.validate_transformed_data(post, transformed):
                            logger.error(f"데이터 검증 실패: {post.get('post_id')}")
                            stats['failed'] += 1
                            continue
                        
                        # 메트릭 계산 및 로깅
                        metrics = self.calculate_post_metrics(transformed)
                        logger.debug(f"게시글 {post.get('post_id')} 메트릭: {metrics}")
                        
                        # 실제 마이그레이션 (dry_run이 아닌 경우)
                        if not dry_run:
                            self.target_collection.insert_one(transformed)
                        
                        stats['success'] += 1
                        logger.debug(f"마이그레이션 성공: {post.get('post_id')}")
                        
                    except Exception as e:
                        logger.error(f"게시글 마이그레이션 실패: {post.get('post_id', 'unknown')} - {e}")
                        stats['failed'] += 1
                
                skip += batch_size
                logger.info(f"진행률: {min(skip, total_posts)}/{total_posts} ({(min(skip, total_posts)/total_posts)*100:.1f}%)")
            
            logger.info("마이그레이션 완료")
            logger.info(f"통계: {stats}")
            
            return stats
            
        except Exception as e:
            logger.error(f"마이그레이션 실패: {e}")
            raise
    
    def rollback_migration(self) -> int:
        """마이그레이션 롤백 (FM코리아 데이터만 삭제)"""
        try:
            result = self.target_collection.delete_many({'site': 'fmkorea'})
            deleted_count = result.deleted_count
            
            logger.info(f"롤백 완료: {deleted_count}개 게시글 삭제")
            return deleted_count
            
        except Exception as e:
            logger.error(f"롤백 실패: {e}")
            raise
    
    def verify_migration(self) -> Dict[str, Any]:
        """마이그레이션 결과 검증"""
        try:
            source_count = self.source_collection.count_documents({})
            target_count = self.target_collection.count_documents({'site': 'fmkorea'})
            
            # 샘플 데이터 비교
            sample_source = self.source_collection.find_one({})
            sample_target = self.target_collection.find_one({'site': 'fmkorea'})
            
            verification = {
                'source_count': source_count,
                'target_count': target_count,
                'count_match': source_count == target_count,
                'sample_source_exists': sample_source is not None,
                'sample_target_exists': sample_target is not None,
                'migration_complete': source_count > 0 and target_count > 0 and source_count == target_count
            }
            
            logger.info(f"마이그레이션 검증 결과: {verification}")
            return verification
            
        except Exception as e:
            logger.error(f"마이그레이션 검증 실패: {e}")
            raise
    
    def close(self):
        """연결 종료"""
        self.client.close()


async def main():
    """메인 실행 함수"""
    mongodb_uri = "mongodb+srv://nadle:miQXsXpzayvMQAzE@cluster0.bh7mhfi.mongodb.net/"
    
    migrator = FmkoreaToCommunitMigrator(mongodb_uri)
    
    try:
        logger.info("🚀 FM코리아 -> 커뮤니티 포스트 마이그레이션 시작")
        
        # 1. Dry run으로 테스트
        logger.info("1️⃣ Dry run 테스트")
        dry_run_stats = migrator.migrate_posts(batch_size=10, dry_run=True)
        
        if dry_run_stats['failed'] > 0:
            logger.error(f"Dry run에서 {dry_run_stats['failed']}개 실패. 마이그레이션 중단.")
            return
        
        # 2. 실제 마이그레이션 실행 여부 확인
        user_input = input("실제 마이그레이션을 실행하시겠습니까? (y/N): ")
        if user_input.lower() != 'y':
            logger.info("마이그레이션 취소됨")
            return
        
        # 3. 실제 마이그레이션 실행
        logger.info("2️⃣ 실제 마이그레이션 실행")
        migration_stats = migrator.migrate_posts(batch_size=100, dry_run=False)
        
        # 4. 마이그레이션 검증
        logger.info("3️⃣ 마이그레이션 검증")
        verification = migrator.verify_migration()
        
        if verification['migration_complete']:
            logger.info("✅ 마이그레이션 성공!")
        else:
            logger.error("❌ 마이그레이션 검증 실패")
            
            # 롤백 여부 확인
            rollback_input = input("롤백을 실행하시겠습니까? (y/N): ")
            if rollback_input.lower() == 'y':
                migrator.rollback_migration()
        
    except Exception as e:
        logger.error(f"마이그레이션 중 오류 발생: {e}")
        raise
    finally:
        migrator.close()


if __name__ == "__main__":
    asyncio.run(main()) 
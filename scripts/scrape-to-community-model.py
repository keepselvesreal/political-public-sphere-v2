"""
CommunityPost 모델로 직접 스크래핑 및 저장

주요 기능:
- FM코리아 스크래핑 (line 20-60)
- CommunityPost 구조로 직접 저장 (line 61-120)
- 새로운 메트릭 구조 지원 (line 121-160)
- 실시간 진행 상황 표시 (line 161-200)

작성자: AI Assistant
작성일: 2025-01-28
목적: 새로운 모델 구조로 직접 스크래핑
"""

import asyncio
import aiohttp
import pymongo
from datetime import datetime
from typing import Dict, List, Any, Optional
from loguru import logger
from bs4 import BeautifulSoup
import re
import time
import random


class CommunityPostScraper:
    """CommunityPost 모델로 직접 스크래핑하는 클래스"""
    
    def __init__(self, mongodb_uri: str):
        self.client = pymongo.MongoClient(mongodb_uri)
        self.db = self.client.political_public_sphere
        self.collection = self.db.community_posts
        
        # 스크래핑 설정
        self.base_url = "https://www.fmkorea.com"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
    async def scrape_post_list(self, session: aiohttp.ClientSession, page: int = 1) -> List[Dict[str, Any]]:
        """게시글 목록 스크래핑"""
        try:
            # FM코리아 자유게시판 URL
            url = f"{self.base_url}/index.php?mid=best&page={page}"
            
            async with session.get(url, headers=self.headers) as response:
                if response.status != 200:
                    logger.error(f"페이지 {page} 요청 실패: {response.status}")
                    return []
                
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')
                
                posts = []
                
                # 게시글 목록 파싱
                post_elements = soup.select('.bd_lst_wrp .bd_lst')
                
                for element in post_elements:
                    try:
                        # 게시글 링크 추출
                        link_elem = element.select_one('.hx a')
                        if not link_elem:
                            continue
                            
                        post_url = link_elem.get('href')
                        if not post_url:
                            continue
                            
                        # 절대 URL로 변환
                        if post_url.startswith('/'):
                            post_url = self.base_url + post_url
                        
                        # post_id 추출
                        post_id_match = re.search(r'document_srl=(\d+)', post_url)
                        if not post_id_match:
                            continue
                        
                        post_id = post_id_match.group(1)
                        
                        # 제목 추출
                        title = link_elem.get_text(strip=True)
                        
                        # 작성자 추출
                        author_elem = element.select_one('.author')
                        author = author_elem.get_text(strip=True) if author_elem else '익명'
                        
                        # 통계 정보 추출
                        stats = self.extract_post_stats(element)
                        
                        post_data = {
                            'post_id': post_id,
                            'post_url': post_url,
                            'title': title,
                            'author': author,
                            'stats': stats
                        }
                        
                        posts.append(post_data)
                        
                    except Exception as e:
                        logger.warning(f"게시글 파싱 실패: {e}")
                        continue
                
                logger.info(f"페이지 {page}: {len(posts)}개 게시글 발견")
                return posts
                
        except Exception as e:
            logger.error(f"페이지 {page} 스크래핑 실패: {e}")
            return []
    
    def extract_post_stats(self, element) -> Dict[str, int]:
        """게시글 통계 정보 추출"""
        stats = {
            'view_count': 0,
            'like_count': 0,
            'dislike_count': 0,
            'comment_count': 0
        }
        
        try:
            # 조회수 추출
            view_elem = element.select_one('.view')
            if view_elem:
                view_text = view_elem.get_text(strip=True)
                view_match = re.search(r'(\d+)', view_text)
                if view_match:
                    stats['view_count'] = int(view_match.group(1))
            
            # 추천수 추출
            like_elem = element.select_one('.vote_up')
            if like_elem:
                like_text = like_elem.get_text(strip=True)
                like_match = re.search(r'(\d+)', like_text)
                if like_match:
                    stats['like_count'] = int(like_match.group(1))
            
            # 댓글수 추출
            comment_elem = element.select_one('.comment')
            if comment_elem:
                comment_text = comment_elem.get_text(strip=True)
                comment_match = re.search(r'(\d+)', comment_text)
                if comment_match:
                    stats['comment_count'] = int(comment_match.group(1))
                    
        except Exception as e:
            logger.warning(f"통계 추출 실패: {e}")
        
        return stats
    
    async def scrape_post_detail(self, session: aiohttp.ClientSession, post_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """게시글 상세 내용 스크래핑"""
        try:
            async with session.get(post_data['post_url'], headers=self.headers) as response:
                if response.status != 200:
                    logger.error(f"게시글 {post_data['post_id']} 요청 실패: {response.status}")
                    return None
                
                html = await response.text()
                soup = BeautifulSoup(html, 'html.parser')
                
                # 게시글 내용 추출
                content = self.extract_post_content(soup)
                
                # 댓글 추출
                comments = self.extract_comments(soup)
                
                # CommunityPost 구조로 변환
                community_post = self.convert_to_community_post(post_data, content, comments)
                
                return community_post
                
        except Exception as e:
            logger.error(f"게시글 {post_data['post_id']} 상세 스크래핑 실패: {e}")
            return None
    
    def extract_post_content(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """게시글 내용 추출"""
        content = []
        
        try:
            # 게시글 본문 영역 찾기
            content_area = soup.select_one('.rd_body')
            if not content_area:
                return content
            
            order = 0
            
            # 텍스트 내용 추출
            text_content = content_area.get_text(strip=True)
            if text_content:
                content.append({
                    'type': 'text',
                    'order': order,
                    'data': {'text': text_content}
                })
                order += 1
            
            # 이미지 추출
            images = content_area.select('img')
            for img in images:
                src = img.get('src')
                if src:
                    content.append({
                        'type': 'image',
                        'order': order,
                        'data': {
                            'src': src,
                            'alt': img.get('alt', ''),
                            'width': img.get('width', ''),
                            'height': img.get('height', '')
                        }
                    })
                    order += 1
                    
        except Exception as e:
            logger.warning(f"내용 추출 실패: {e}")
        
        return content
    
    def extract_comments(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """댓글 추출"""
        comments = []
        
        try:
            # 댓글 영역 찾기
            comment_elements = soup.select('.cmt_lst .cmt')
            
            for idx, element in enumerate(comment_elements):
                try:
                    # 작성자 추출
                    author_elem = element.select_one('.author')
                    author = author_elem.get_text(strip=True) if author_elem else '익명'
                    
                    # 댓글 내용 추출
                    content_elem = element.select_one('.cmt_content')
                    content = content_elem.get_text(strip=True) if content_elem else ''
                    
                    # 날짜 추출
                    date_elem = element.select_one('.date')
                    date = date_elem.get_text(strip=True) if date_elem else ''
                    
                    comment = {
                        'id': str(idx + 1),
                        'author': author,
                        'content': content,
                        'date': date,
                        'depth': 0,
                        'is_reply': False,
                        'parent_id': None,
                        'like_count': 0,
                        'dislike_count': 0,
                        'is_best': False,
                        'is_author': False
                    }
                    
                    comments.append(comment)
                    
                except Exception as e:
                    logger.warning(f"댓글 {idx} 추출 실패: {e}")
                    continue
                    
        except Exception as e:
            logger.warning(f"댓글 추출 실패: {e}")
        
        return comments
    
    def convert_to_community_post(self, post_data: Dict[str, Any], content: List[Dict[str, Any]], comments: List[Dict[str, Any]]) -> Dict[str, Any]:
        """CommunityPost 구조로 변환"""
        now = datetime.now()
        
        community_post = {
            'post_id': post_data['post_id'],
            'post_url': post_data['post_url'],
            'site': 'fmkorea',
            'scraped_at': now,
            'metadata': {
                'title': post_data['title'],
                'author': post_data['author'],
                'date': now.isoformat(),
                'view_count': post_data['stats']['view_count'],
                'like_count': post_data['stats']['like_count'],
                'dislike_count': post_data['stats']['dislike_count'],
                'comment_count': len(comments)
            },
            'content': content,
            'comments': comments,
            'created_at': now,
            'updated_at': now
        }
        
        return community_post
    
    async def save_post(self, post: Dict[str, Any]) -> bool:
        """게시글 저장"""
        try:
            # 중복 확인
            existing = self.collection.find_one({
                'site': 'fmkorea',
                'post_id': post['post_id']
            })
            
            if existing:
                logger.debug(f"이미 존재하는 게시글: {post['post_id']}")
                return False
            
            # 저장
            result = self.collection.insert_one(post)
            
            if result.inserted_id:
                logger.debug(f"게시글 저장 성공: {post['post_id']}")
                return True
            else:
                logger.error(f"게시글 저장 실패: {post['post_id']}")
                return False
                
        except Exception as e:
            logger.error(f"게시글 저장 중 오류: {e}")
            return False
    
    async def scrape_and_save(self, max_pages: int = 5, delay: float = 1.0) -> Dict[str, int]:
        """스크래핑 및 저장 실행"""
        stats = {
            'total_found': 0,
            'total_scraped': 0,
            'total_saved': 0,
            'errors': 0
        }
        
        try:
            logger.info(f"🚀 CommunityPost 모델로 스크래핑 시작 (최대 {max_pages}페이지)")
            
            async with aiohttp.ClientSession() as session:
                for page in range(1, max_pages + 1):
                    try:
                        # 게시글 목록 스크래핑
                        posts = await self.scrape_post_list(session, page)
                        stats['total_found'] += len(posts)
                        
                        # 각 게시글 상세 스크래핑
                        for post_data in posts:
                            try:
                                # 상세 내용 스크래핑
                                community_post = await self.scrape_post_detail(session, post_data)
                                
                                if community_post:
                                    stats['total_scraped'] += 1
                                    
                                    # 저장
                                    if await self.save_post(community_post):
                                        stats['total_saved'] += 1
                                        logger.info(f"저장 완료: {community_post['post_id']} - {community_post['metadata']['title'][:50]}...")
                                
                                # 딜레이
                                await asyncio.sleep(delay)
                                
                            except Exception as e:
                                logger.error(f"게시글 처리 실패: {e}")
                                stats['errors'] += 1
                        
                        logger.info(f"페이지 {page} 완료: {len(posts)}개 발견, {stats['total_saved']}개 저장됨")
                        
                        # 페이지 간 딜레이
                        await asyncio.sleep(delay * 2)
                        
                    except Exception as e:
                        logger.error(f"페이지 {page} 처리 실패: {e}")
                        stats['errors'] += 1
            
            logger.info(f"스크래핑 완료: {stats}")
            return stats
            
        except Exception as e:
            logger.error(f"스크래핑 중 오류: {e}")
            raise
    
    def get_collection_stats(self) -> Dict[str, int]:
        """저장된 데이터 통계"""
        try:
            total_count = self.collection.count_documents({'site': 'fmkorea'})
            
            # 최근 저장된 게시글
            recent_posts = list(self.collection.find(
                {'site': 'fmkorea'}, 
                {'post_id': 1, 'metadata.title': 1, 'created_at': 1}
            ).sort('created_at', -1).limit(5))
            
            return {
                'total_posts': total_count,
                'recent_posts': recent_posts
            }
            
        except Exception as e:
            logger.error(f"통계 조회 실패: {e}")
            return {'total_posts': 0, 'recent_posts': []}
    
    def close(self):
        """연결 종료"""
        self.client.close()


async def main():
    """메인 실행 함수"""
    mongodb_uri = "mongodb+srv://nadle:miQXsXpzayvMQAzE@cluster0.bh7mhfi.mongodb.net/"
    
    scraper = CommunityPostScraper(mongodb_uri)
    
    try:
        logger.info("🚀 CommunityPost 모델 스크래핑 프로세스 시작")
        
        # 1. 현재 상태 확인
        logger.info("1️⃣ 현재 데이터베이스 상태 확인")
        current_stats = scraper.get_collection_stats()
        logger.info(f"현재 저장된 게시글: {current_stats['total_posts']}개")
        
        # 2. 스크래핑 설정 확인
        max_pages = 3  # 테스트용으로 3페이지만
        delay = 1.5    # 서버 부하 방지
        
        logger.info(f"스크래핑 설정: 최대 {max_pages}페이지, 딜레이 {delay}초")
        
        user_input = input(f"\n스크래핑을 시작하시겠습니까? (y/N): ")
        if user_input.lower() != 'y':
            logger.info("스크래핑 취소됨")
            return
        
        # 3. 스크래핑 실행
        logger.info("2️⃣ 스크래핑 실행")
        scraping_stats = await scraper.scrape_and_save(max_pages=max_pages, delay=delay)
        
        # 4. 결과 확인
        logger.info("3️⃣ 스크래핑 결과 확인")
        final_stats = scraper.get_collection_stats()
        
        logger.info("✅ 스크래핑 완료!")
        logger.info(f"스크래핑 통계: {scraping_stats}")
        logger.info(f"최종 저장된 게시글: {final_stats['total_posts']}개")
        
        if final_stats['recent_posts']:
            logger.info("최근 저장된 게시글:")
            for post in final_stats['recent_posts']:
                logger.info(f"  - {post['post_id']}: {post['metadata']['title'][:50]}...")
        
    except Exception as e:
        logger.error(f"스크래핑 중 오류 발생: {e}")
        raise
    finally:
        scraper.close()


if __name__ == "__main__":
    asyncio.run(main()) 
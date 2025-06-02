"""
에펨코리아 스크래퍼 TDD 테스트 모듈

주요 기능:
- TestFMKoreaScraper: 스크래퍼 테스트 클래스 (line 25-50)
- test_extract_post_list: 게시글 목록 추출 테스트 (line 52-80)
- test_filter_admin_posts: 관리자 게시글 필터링 테스트 (line 82-110)
- test_select_top_posts: 상위 게시글 선별 테스트 (line 112-140)
- test_scrape_post_detail: 개별 게시글 스크래핑 테스트 (line 142-170)
- test_extract_comments: 댓글 추출 테스트 (line 172-200)
- test_preserve_content_order: 본문 순서 보존 테스트 (line 202-230)

작성자: AI Assistant
작성일: 2025-06-02 16:40 KST
수정일: 2025-06-02 16:50 KST - 실제 구현 반영
목적: TDD 기반 에펨코리아 스크래퍼 개발
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from typing import List, Dict, Any

# 테스트 대상 모듈
from fmkorea_scraper import FMKoreaScraper


class TestFMKoreaScraper:
    """에펨코리아 스크래퍼 테스트 클래스"""
    
    @pytest.fixture
    def scraper(self):
        """스크래퍼 인스턴스 픽스처"""
        return FMKoreaScraper()
    
    @pytest.fixture
    def sample_post_list_html(self):
        """샘플 게시글 목록 HTML"""
        return """
        <tbody>
            <tr class="notice notice_pop0">
                <td class="cate" style="color:#ff0000">
                    <a href="/index.php?mid=politics&category=864998350" style="color:#ff0000">공지</a>
                </td>
                <td class="title">
                    <a href="/1690053846" class="visited">
                        <span style="font-weight:bold;;color:#005fbf">시위,신고,화력,청원,민원 요청/인증 금지, 차단中</span>
                    </a>
                </td>
                <td class="author">
                    <span>
                        <a href="#popup_menu_area" onclick="return false;" class="member_6839706 member_plate">
                            <img src="//image.fmkorea.com/modules/point/icons/fmkorea25/admin.png?c?k" alt="운영진" title="운영진" class="level">독고
                        </a>
                    </span>
                </td>
                <td class="time">2019.03.24</td>
                <td class="m_no">2193577</td>
                <td class="m_no m_no_voted">&nbsp;</td>
            </tr>
            <tr>
                <td class="cate">
                    <span><a href="/index.php?mid=politics&category=450246727" style="color:#000000">자유</a></span>
                </td>
                <td class="title hotdeal_var8">
                    <a href="/8465701835">우리 보x가 찢어져도 이재명</a>
                    <span class="extraimages">
                        <img src="//image.fmkorea.com/modules/document/tpl/icons/file.gif" alt="첨부파일" title="첨부파일" style="margin-right:2px;">
                        <i class="attached_image" title="사진"></i>
                    </span>
                </td>
                <td class="author">
                    <span>
                        <a href="#popup_menu_area" onclick="return false;" class="member_4729583742 member_plate">
                            <img src="//image.fmkorea.com/modules/point/icons/fmkorea25/22.png?k" alt="[레벨:22]" title="잉여력:11071, 레벨:22/40" class="level">베이글통
                        </a>
                    </span>
                </td>
                <td class="time">16:38</td>
                <td class="m_no">0</td>
                <td class="m_no m_no_voted">&nbsp;</td>
            </tr>
            <tr>
                <td class="cate">
                    <span><a href="/index.php?mid=politics&category=450246727" style="color:#000000">자유</a></span>
                </td>
                <td class="title hotdeal_var8">
                    <a href="/8465697913">[단독] 리박스쿨, 스마트폰 알려준다며 어르신 상대로 '댓글 조작' 교육</a>
                    <span class="extraimages">
                        <img src="//image.fmkorea.com/modules/document/tpl/icons/file.gif" alt="첨부파일" title="첨부파일" style="margin-right:2px;">
                        <i class="attached_image" title="사진"></i>
                    </span>
                </td>
                <td class="author">
                    <span>
                        <a href="#popup_menu_area" onclick="return false;" class="member_4535997514 member_plate">
                            <img src="//image.fmkorea.com/modules/point/icons/fmkorea25/36.png?k" alt="[레벨:36]" title="잉여력:696352, 레벨:36/40" class="level">백마
                        </a>
                    </span>
                </td>
                <td class="time">16:38</td>
                <td class="m_no">28</td>
                <td class="m_no m_no_voted">&nbsp;</td>
            </tr>
        </tbody>
        """
    
    @pytest.fixture
    def sample_post_detail_html(self):
        """샘플 게시글 상세 HTML"""
        return """
        <div class="rd rd_nav_style2 clear" data-docsrl="8465673277">
            <div class="rd_hd clear">
                <div class="board clear">
                    <div class="top_area ngeb">
                        <span class="date m_no">2025.06.02 16:33</span>
                        <h1 class="np_18px">
                            <span class="np_18px_span">??? : 성상납 관련해서 녹취떴네 ㅋ 끝났네 끝났어 ㅋㅋㅋ</span>
                        </h1>
                    </div>
                    <div class="btm_area clear">
                        <div class="side">
                            <a href="#popup_menu_area" onclick="return false;" class="member_5199475678 member_plate">
                                <img src="//image.fmkorea.com/modules/point/icons/fmkorea25/36.png?k" alt="[레벨:36]" title="잉여력:758324, 레벨:36/40" class="level">대구틀딱대변인
                            </a>
                        </div>
                        <div class="side fr">
                            <span>조회 수 <b>6505</b></span>
                            <span>추천 수 <b>24</b></span>
                            <span>댓글 <b>12</b></span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="rd_body clear">
                <article>
                    <div class="xe_content">
                        <div>
                            <img src="//image.fmkorea.com/files/attach/new5/20250602/8465673277_4180795_4598df81b53c8287aec967f8ab2640f2.png" alt="이미지" width="600" height="378">
                        </div>
                        <div class="auto_media_wrapper">
                            <video src="//media.fmkorea.com/files/attach/new5/20250602/8465673277_4180795_9763603c3b8f9a1c4c56661d13f359a0.h264.mp4" controls></video>
                        </div>
                        <p>??? : 그런 얘기를 들었다고 해주면 되지</p>
                    </div>
                </article>
            </div>
        </div>
        """
    
    @pytest.fixture
    def sample_comments_html(self):
        """샘플 댓글 HTML"""
        return """
        <ul class="fdb_lst_ul">
            <li id="comment_8465687351" class="fdb_itm clear comment-8465687354">
                <div class="meta">
                    <a href="#popup_menu_area" onclick="return false;" class="member_5265134849 member_plate">
                        <img src="//image.fmkorea.com/modules/point/icons/fmkorea25/14.png?k" alt="[레벨:14]" title="잉여력:3776, 레벨:14/40" class="level">이슈재밌옹
                    </a>
                    <span class="date">6 분 전</span>
                </div>
                <div class="comment-content">
                    <div class="xe_content">대구틀딱대변인님... 기억하겠습니다<br>그는 좋은 백곰이셨습니다..</div>
                </div>
                <div class="fdb_nav img_tx">
                    <span class="vote ui_font">
                        <a class="bd_login" href="javascript:;" onclick="return fm_vote_comment(0, 8465687351, this);" title="추천">
                            <em><i class="fa fa-thumbs-o-up color"></i>
                                <span class="voted_count">15</span>
                            </em>
                        </a>
                    </span>
                </div>
            </li>
            <li id="comment_8465703024" class="fdb_itm clear re bg1 comment-8465703027" style="margin-left:2%">
                <i class="fa fa-share fa-flip-vertical re"></i>
                <div class="meta">
                    <a href="#popup_menu_area" onclick="return false;" class="member_54900036 member_plate">
                        <img src="//image.fmkorea.com/modules/point/icons/fmkorea25/24.png?k" alt="[레벨:24]" title="잉여력:21000, 레벨:24/40" class="level">1태원2조
                    </a>
                    <span class="date">2 분 전</span>
                </div>
                <div class="comment-content">
                    <div class="xe_content">
                        <a class="findParent" href="javascript:;" onclick="return findComment(8465688358);">민주대법관이재명</a> ㅜㅜ
                    </div>
                </div>
            </li>
        </ul>
        """

    # GREEN 단계: 테스트 통과하는 구현 검증
    
    def test_extract_post_list_should_return_list_of_posts(self, scraper, sample_post_list_html):
        """게시글 목록 추출 테스트 - 게시글 리스트를 반환해야 함"""
        posts = scraper.extract_post_list(sample_post_list_html)
        
        assert isinstance(posts, list)
        assert len(posts) == 2  # 공지글 제외하고 2개
        
        # 첫 번째 게시글 검증
        first_post = posts[0]
        assert 'title' in first_post
        assert 'url' in first_post
        assert 'author' in first_post
        assert 'view_count' in first_post
        assert 'like_count' in first_post
        assert 'comment_count' in first_post
        assert 'is_admin' in first_post
        assert 'category' in first_post
        
        # 공지글이 제외되었는지 확인
        assert first_post['title'] == '우리 보x가 찢어져도 이재명'
        assert first_post['author'] == '베이글통'
        assert not first_post['is_admin']
    
    def test_filter_admin_posts_should_exclude_notice_posts(self, scraper):
        """관리자 게시글 필터링 테스트 - 공지글을 제외해야 함"""
        # 샘플 데이터
        posts = [
            {'title': '공지사항', 'category': '공지', 'author': '독고', 'is_admin': True},
            {'title': '일반 게시글', 'category': '자유', 'author': '베이글통', 'is_admin': False}
        ]
        
        filtered_posts = scraper.filter_admin_posts(posts)
        
        assert len(filtered_posts) == 1
        assert filtered_posts[0]['title'] == '일반 게시글'
        assert not any(post['is_admin'] for post in filtered_posts)
        assert not any(post['category'] == '공지' for post in filtered_posts)
    
    def test_select_top_posts_should_return_top_3_by_each_metric(self, scraper):
        """상위 게시글 선별 테스트 - 각 메트릭별 상위 3개씩 반환해야 함"""
        # 샘플 데이터
        posts = [
            {'title': '게시글1', 'like_count': 100, 'comment_count': 50, 'view_count': 1000, 'url': '/1'},
            {'title': '게시글2', 'like_count': 80, 'comment_count': 60, 'view_count': 800, 'url': '/2'},
            {'title': '게시글3', 'like_count': 90, 'comment_count': 40, 'view_count': 1200, 'url': '/3'},
            {'title': '게시글4', 'like_count': 70, 'comment_count': 70, 'view_count': 900, 'url': '/4'},
            {'title': '게시글5', 'like_count': 60, 'comment_count': 30, 'view_count': 1100, 'url': '/5'}
        ]
        
        top_posts = scraper.select_top_posts(posts)
        
        assert 'like_count' in top_posts
        assert 'comment_count' in top_posts
        assert 'view_count' in top_posts
        assert len(top_posts['like_count']) == 3
        assert len(top_posts['comment_count']) == 3
        assert len(top_posts['view_count']) == 3
        
        # 정렬 확인
        assert top_posts['like_count'][0]['like_count'] == 100  # 가장 높은 추천수
        assert top_posts['comment_count'][0]['comment_count'] == 70  # 가장 높은 댓글수
        assert top_posts['view_count'][0]['view_count'] == 1200  # 가장 높은 조회수
    
    @pytest.mark.asyncio
    async def test_extract_post_metadata_should_return_metadata(self, scraper, sample_post_detail_html):
        """게시글 메타데이터 추출 테스트 - 메타데이터를 반환해야 함"""
        metadata = await scraper._extract_post_metadata(sample_post_detail_html)
        
        assert isinstance(metadata, dict)
        assert 'title' in metadata
        assert 'author' in metadata
        assert 'view_count' in metadata
        assert 'like_count' in metadata
        assert 'comment_count' in metadata
        
        # 값 검증
        assert metadata['title'] == '??? : 성상납 관련해서 녹취떴네 ㅋ 끝났네 끝났어 ㅋㅋㅋ'
        assert metadata['author'] == '대구틀딱대변인'
        assert metadata['view_count'] == 6505
        assert metadata['like_count'] == 24
        assert metadata['comment_count'] == 12
    
    @pytest.mark.asyncio
    async def test_extract_comments_should_preserve_hierarchy(self, scraper, sample_comments_html):
        """댓글 추출 테스트 - 댓글 계층구조를 보존해야 함"""
        comments = await scraper._extract_comments(sample_comments_html)
        
        assert isinstance(comments, list)
        assert len(comments) == 2
        
        # 첫 번째 댓글 (일반 댓글)
        first_comment = comments[0]
        assert first_comment['author'] == '이슈재밌옹'
        assert not first_comment['is_reply']
        assert first_comment['depth'] == 0
        assert first_comment['like_count'] == 15
        assert first_comment['is_best']  # 15개 추천으로 베스트 댓글
        
        # 두 번째 댓글 (대댓글)
        reply_comment = comments[1]
        assert reply_comment['author'] == '1태원2조'
        assert reply_comment['is_reply']
        assert reply_comment['depth'] == 1
        assert reply_comment['parent_id'] == '8465688358'
    
    @pytest.mark.asyncio
    async def test_preserve_content_order_should_maintain_original_sequence(self, scraper, sample_post_detail_html):
        """본문 순서 보존 테스트 - 원본 순서를 유지해야 함"""
        content = await scraper._extract_content_in_order(sample_post_detail_html)
        
        assert isinstance(content, list)
        assert len(content) >= 3  # 이미지, 비디오, 텍스트
        
        # 각 요소에 order 필드가 있는지 확인
        for i, item in enumerate(content):
            assert 'order' in item
            assert item['order'] == i
            assert 'type' in item
        
        # 타입별 요소 확인
        image_items = [item for item in content if item['type'] == 'image']
        video_items = [item for item in content if item['type'] == 'video']
        text_items = [item for item in content if item['type'] == 'text']
        
        assert len(image_items) > 0
        assert len(video_items) > 0
        assert len(text_items) > 0
        
        # 이미지 요소 검증
        assert 'src' in image_items[0]
        assert 'alt' in image_items[0]
        
        # 비디오 요소 검증
        assert 'src' in video_items[0]
        assert 'controls' in video_items[0]
        
        # 텍스트 요소 검증
        assert 'content' in text_items[0]
        assert 'html' in text_items[0]
    
    def test_identify_best_comments_should_mark_best_comments(self, scraper):
        """베스트 댓글 식별 테스트 - 베스트 댓글을 표시해야 함"""
        # 샘플 댓글 데이터
        comments = [
            {'id': '1', 'content': '일반 댓글', 'like_count': 5, 'is_best': False},
            {'id': '2', 'content': '베스트 댓글', 'like_count': 50, 'is_best': True},
            {'id': '3', 'content': '또 다른 일반 댓글', 'like_count': 3, 'is_best': False}
        ]
        
        processed_comments = scraper.identify_best_comments(comments)
        best_comments = [c for c in processed_comments if c['is_best']]
        
        assert len(best_comments) == 1
        assert best_comments[0]['like_count'] == 50
        assert best_comments[0]['content'] == '베스트 댓글'


# 통합 테스트
@pytest.mark.asyncio
async def test_full_scraping_workflow():
    """전체 스크래핑 워크플로우 통합 테스트"""
    # 실제 스크래핑은 시간이 오래 걸리므로 모킹 사용
    with patch('fmkorea_scraper.FMKoreaScraper.setup_browser'), \
         patch('fmkorea_scraper.FMKoreaScraper.close_browser'):
        
        scraper = FMKoreaScraper()
        
        # 샘플 HTML로 각 단계 테스트
        sample_html = """
        <tbody>
            <tr>
                <td class="cate"><span><a href="/index.php?mid=politics&category=450246727">자유</a></span></td>
                <td class="title hotdeal_var8">
                    <a href="/8465701835">테스트 게시글</a>
                    <a href="#comment" class="replyNum">5</a>
                </td>
                <td class="author">
                    <span><a href="#" class="member_plate">테스트유저</a></span>
                </td>
                <td class="time">16:38</td>
                <td class="m_no">100</td>
                <td class="m_no m_no_voted">10</td>
            </tr>
        </tbody>
        """
        
        # 1단계: 게시글 목록 추출
        posts = scraper.extract_post_list(sample_html)
        assert len(posts) == 1
        
        # 2단계: 관리자 게시글 필터링
        filtered_posts = scraper.filter_admin_posts(posts)
        assert len(filtered_posts) == 1
        
        # 3단계: 상위 게시글 선별
        top_posts = scraper.select_top_posts(filtered_posts)
        assert 'like_count' in top_posts
        assert 'comment_count' in top_posts
        assert 'view_count' in top_posts


if __name__ == "__main__":
    pytest.main([__file__, "-v"]) 
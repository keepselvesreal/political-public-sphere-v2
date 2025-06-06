import pytest
import asyncio
import json
import os
from unittest.mock import Mock, AsyncMock, patch
from fmkorea_scraper import FMKoreaScraper

class TestFMKoreaScraper:
    
    @pytest.fixture
    def scraper(self):
        """스크래퍼 인스턴스 생성"""
        return FMKoreaScraper()
    
    @pytest.fixture
    def sample_html(self):
        """테스트용 HTML 샘플"""
        return '''
        <div class="rd rd_nav_style2 clear" data-docsrl="8485393463">
            <div class="rd_hd clear">
                <div class="board clear">
                    <div class="top_area ngeb">
                        <span class="date m_no">2025.06.06 15:27</span>
                        <h1 class="np_18px">
                            <span class="np_18px_span">결국 800만달러 송금했다 아님??</span>
                        </h1>
                    </div>
                    <div class="btm_area clear">
                        <div class="side">
                            <a href="#popup_menu_area" class="member_4348938623 member_plate">
                                <img src="//image.fmkorea.com/modules/point/icons/fmkorea25/26.png?i" alt="[레벨:26]" class="level">밸리언트
                            </a>
                        </div>
                        <div class="side fr">
                            <span>조회 수 <b>156</b></span>
                            <span>추천 수 <b>4</b></span>
                            <span>댓글 <b>5</b></span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="rd_body clear">
                <article>
                    <div class="document_8485393463_4348938623 xe_content">
                        <p><a class="highslide" href="//image.fmkorea.com/files/attach/new5/20250606/8485393463_4180795_f67eb809a668058146cf0dd450eb25b9.png">
                            <img src="//image.fmkorea.com/files/attach/new5/20250606/8485393463_4180795_f67eb809a668058146cf0dd450eb25b9.png" alt="image.png" width="1151" height="692">
                        </a></p>
                        <p>왜 주변이나 저짝갤 얘기해보면 사법부랑 검찰을 계속 탓하는거냐</p>
                    </div>
                </article>
            </div>
        </div>
        <div class="fdb_lst_wrp">
            <ul class="fdb_lst_ul">
                <li id="comment_8485411698" class="fdb_itm clear">
                    <div class="meta">
                        <a href="#popup_menu_area" class="member_4168660689 member_plate">으아악1</a>
                        <span class="date">2 분 전</span>
                    </div>
                    <div class="comment-content">
                        <div class="comment_8485411698_4168660689 xe_content">그래서 뭐 어쩌라고</div>
                    </div>
                    <div class="fdb_nav img_tx">
                        <span class="vote ui_font">
                            <a href="javascript:;" title="추천">
                                <span class="voted_count"></span>
                            </a>
                            <a href="javascript:;" title="비추천">
                                <span class="blamed_count"></span>
                            </a>
                        </span>
                    </div>
                </li>
                <li id="comment_8485413822" class="fdb_itm clear re bg1" style="margin-left:2%">
                    <div class="meta">
                        <a href="#popup_menu_area" class="member_4348938623 member_plate">밸리언트</a>
                        <span class="date">2 분 전</span>
                    </div>
                    <div class="comment-content document_writer">
                        <div class="comment_8485413822_4348938623 xe_content">
                            <a class="findParent" href="javascript:;">으아악1</a> 논리가 이해가 안됨 왜 판결에 대해서 받아들일 생각을 안하는지
                        </div>
                    </div>
                </li>
            </ul>
        </div>
        '''
    
    def test_parse_post_id(self, scraper):
        """게시글 ID 추출 테스트"""
        url = "https://www.fmkorea.com/8485393463"
        post_id = scraper.parse_post_id(url)
        assert post_id == "8485393463"
    
    @pytest.mark.asyncio
    async def test_extract_metadata(self, scraper, sample_html):
        """메타데이터 추출 테스트"""
        with patch('playwright.async_api.Page') as mock_page:
            mock_page.content.return_value = sample_html
            mock_page.query_selector.side_effect = self._mock_query_selector
            
            metadata = await scraper.extract_metadata(mock_page)
            
            assert metadata['title'] == "결국 800만달러 송금했다 아님??"
            assert metadata['author'] == "밸리언트"
            assert metadata['date'] == "2025.06.06 15:27"
            assert metadata['view_count'] == 156
            assert metadata['up_count'] == 4
            assert metadata['comment_count'] == 5
    
    @pytest.mark.asyncio
    async def test_extract_content(self, scraper, sample_html):
        """본문 콘텐츠 추출 테스트"""
        with patch('playwright.async_api.Page') as mock_page:
            mock_page.content.return_value = sample_html
            mock_page.query_selector_all.return_value = self._mock_content_elements()
            
            content = await scraper.extract_content(mock_page)
            
            assert len(content) >= 2  # 이미지와 텍스트
            assert any(item['type'] == 'image' for item in content)
            assert any(item['type'] == 'text' for item in content)
    
    @pytest.mark.asyncio
    async def test_extract_comments(self, scraper, sample_html):
        """댓글 추출 테스트"""
        with patch('playwright.async_api.Page') as mock_page:
            mock_page.content.return_value = sample_html
            mock_page.query_selector_all.return_value = self._mock_comment_elements()
            
            comments = await scraper.extract_comments(mock_page)
            
            assert len(comments) == 2
            assert comments[0]['comment_id'] == "8485411698"
            assert comments[0]['author'] == "으아악1"
            assert comments[0]['level'] == 0
            assert comments[1]['level'] == 1  # 대댓글
            assert comments[1]['parent_comment_id'] == "8485411698"
    
    @pytest.mark.asyncio
    async def test_scrape_post_integration(self, scraper):
        """전체 스크래핑 통합 테스트"""
        test_url = "https://www.fmkorea.com/8485393463"
        
        with patch('playwright.async_api.async_playwright') as mock_playwright:
            mock_browser = AsyncMock()
            mock_page = AsyncMock()
            mock_context = AsyncMock()
            
            mock_playwright.return_value.__aenter__.return_value.chromium.launch.return_value = mock_browser
            mock_browser.new_context.return_value = mock_context
            mock_context.new_page.return_value = mock_page
            
            # Mock page responses
            mock_page.goto = AsyncMock()
            mock_page.wait_for_load_state = AsyncMock()
            mock_page.content.return_value = self._get_full_sample_html()
            
            result = await scraper.scrape_post(test_url)
            
            assert result['post_id'] == "8485393463"
            assert 'metadata' in result
            assert 'content' in result
            assert 'comments' in result
            assert 'scraped_at' in result
    
    def test_validate_data_schema(self, scraper):
        """데이터 스키마 검증 테스트"""
        sample_data = {
            "post_id": "8485393463",
            "metadata": {
                "title": "테스트 제목",
                "author": "테스트 작성자",
                "date": "2025.06.06 15:27",
                "view_count": 156,
                "up_count": 4,
                "down_count": 0,
                "comment_count": 5
            },
            "content": [
                {
                    "type": "text",
                    "order": 1,
                    "data": {"text": "테스트 텍스트"}
                }
            ],
            "comments": [
                {
                    "comment_id": "123",
                    "content": "테스트 댓글",
                    "author": "댓글 작성자",
                    "date": "2025.06.06 15:30",
                    "media": [],
                    "level": 0,
                    "is_reply": False,
                    "parent_comment_id": "",
                    "up_count": 0,
                    "down_count": 0
                }
            ]
        }
        
        is_valid = scraper.validate_data(sample_data)
        assert is_valid == True
    
    def test_save_to_json(self, scraper, tmp_path):
        """JSON 파일 저장 테스트"""
        test_data = {"test": "data"}
        file_path = tmp_path / "test.json"
        
        scraper.save_to_json(test_data, str(file_path))
        
        assert file_path.exists()
        with open(file_path, 'r', encoding='utf-8') as f:
            loaded_data = json.load(f)
        assert loaded_data == test_data
    
    # Helper methods for mocking
    def _mock_query_selector(self, selector):
        """쿼리 셀렉터 모킹"""
        mock_element = Mock()
        if 'np_18px_span' in selector:
            mock_element.text_content.return_value = "결국 800만달러 송금했다 아님??"
        elif 'member_plate' in selector:
            mock_element.text_content.return_value = "밸리언트"
        elif 'date' in selector:
            mock_element.text_content.return_value = "2025.06.06 15:27"
        elif '조회 수' in selector:
            mock_element.text_content.return_value = "156"
        elif '추천 수' in selector:
            mock_element.text_content.return_value = "4"
        elif '댓글' in selector:
            mock_element.text_content.return_value = "5"
        return mock_element
    
    def _mock_content_elements(self):
        """본문 요소 모킹"""
        elements = []
        
        # 이미지 요소
        img_element = Mock()
        img_element.tag_name = "img"
        img_element.get_attribute.side_effect = lambda attr: {
            'src': '//image.fmkorea.com/files/attach/new5/20250606/8485393463_4180795_f67eb809a668058146cf0dd450eb25b9.png',
            'alt': 'image.png',
            'width': '1151',
            'height': '692'
        }.get(attr)
        elements.append(img_element)
        
        # 텍스트 요소
        text_element = Mock()
        text_element.tag_name = "p"
        text_element.text_content.return_value = "왜 주변이나 저짝갤 얘기해보면 사법부랑 검찰을 계속 탓하는거냐"
        elements.append(text_element)
        
        return elements
    
    def _mock_comment_elements(self):
        """댓글 요소 모킹"""
        elements = []
        
        # 첫 번째 댓글
        comment1 = Mock()
        comment1.get_attribute.return_value = "comment_8485411698"
        comment1.query_selector.side_effect = lambda sel: self._mock_comment_selector(sel, "으아악1", "그래서 뭐 어쩌라고", "2 분 전")
        elements.append(comment1)
        
        # 두 번째 댓글 (대댓글)
        comment2 = Mock()
        comment2.get_attribute.return_value = "comment_8485413822"
        comment2.query_selector.side_effect = lambda sel: self._mock_comment_selector(sel, "밸리언트", "논리가 이해가 안됨", "2 분 전")
        elements.append(comment2)
        
        return elements
    
    def _mock_comment_selector(self, selector, author, content, date):
        """댓글 셀렉터 모킹"""
        mock_element = Mock()
        if 'member_plate' in selector:
            mock_element.text_content.return_value = author
        elif 'xe_content' in selector:
            mock_element.text_content.return_value = content
        elif 'date' in selector:
            mock_element.text_content.return_value = date
        return mock_element
    
    def _get_full_sample_html(self):
        """전체 샘플 HTML 반환"""
        return '''
        <div class="rd rd_nav_style2 clear" data-docsrl="8485393463">
            <div class="rd_hd clear">
                <div class="board clear">
                    <div class="top_area ngeb">
                        <span class="date m_no">2025.06.06 15:27</span>
                        <h1 class="np_18px">
                            <span class="np_18px_span">결국 800만달러 송금했다 아님??</span>
                        </h1>
                    </div>
                    <div class="btm_area clear">
                        <div class="side">
                            <a href="#popup_menu_area" class="member_4348938623 member_plate">밸리언트</a>
                        </div>
                        <div class="side fr">
                            <span>조회 수 <b>156</b></span>
                            <span>추천 수 <b>4</b></span>
                            <span>댓글 <b>5</b></span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="rd_body clear">
                <article>
                    <div class="document_8485393463_4348938623 xe_content">
                        <p><img src="//image.fmkorea.com/files/attach/new5/20250606/8485393463_4180795_f67eb809a668058146cf0dd450eb25b9.png" alt="image.png" width="1151" height="692"></p>
                        <p>왜 주변이나 저짝갤 얘기해보면 사법부랑 검찰을 계속 탓하는거냐</p>
                    </div>
                </article>
            </div>
        </div>
        ''' 
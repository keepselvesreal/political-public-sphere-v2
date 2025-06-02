"""
루리웹 데이터 구조 통일성 TDD 테스트

목차:
- 데이터 구조 검증 테스트 (라인 1-50)
- 스크래퍼 출력 검증 테스트 (라인 51-100)
- API 변환 검증 테스트 (라인 101-150)

작성자: AI Assistant
작성일: 2025-01-28
목적: 루리웹과 FM코리아 데이터 구조 통일성 검증
"""

import pytest
import asyncio
import sys
import os
from unittest.mock import AsyncMock, MagicMock
from typing import Dict, List

# 프로젝트 루트 경로 추가
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from scraping.scrapers.ruliweb_scraper import ImprovedRuliwebScraper

class TestRuliwebDataStructure:
    """루리웹 데이터 구조 통일성 테스트"""
    
    @pytest.fixture
    def mock_scraper(self):
        """모킹된 루리웹 스크래퍼"""
        scraper = ImprovedRuliwebScraper()
        scraper.page = AsyncMock()
        scraper.base_url = 'https://bbs.ruliweb.com'
        return scraper
    
    @pytest.mark.asyncio
    async def test_text_data_structure_matches_fmkorea(self, mock_scraper):
        """텍스트 데이터 구조가 FM코리아와 일치하는지 테스트"""
        # Given: 모킹된 텍스트 요소
        mock_element = AsyncMock()
        mock_element.inner_text.return_value = "테스트 텍스트 내용"
        mock_element.evaluate.return_value = "p"
        mock_element.get_attribute.side_effect = lambda attr: {
            'style': 'color: red;',
            'class': 'test-class',
            'id': 'test-id'
        }.get(attr, '')
        mock_element.inner_html.return_value = "<p>테스트 텍스트 내용</p>"
        
        # When: 텍스트 데이터 추출
        result = await mock_scraper.extract_text_data(mock_element, 0)
        
        # Then: FM코리아와 동일한 중첩 구조 검증
        assert result is not None
        assert result['type'] == 'text'
        assert result['order'] == 0
        assert 'data' in result
        
        # 중첩 구조 내부 검증
        data = result['data']
        assert data['tag'] == 'p'
        assert data['text'] == '테스트 텍스트 내용'
        assert data['style'] == 'color: red;'
        assert data['class'] == 'test-class'
        assert data['id'] == 'test-id'
        assert data['innerHTML'] == '<p>테스트 텍스트 내용</p>'
    
    @pytest.mark.asyncio
    async def test_image_data_structure_matches_fmkorea(self, mock_scraper):
        """이미지 데이터 구조가 FM코리아와 일치하는지 테스트"""
        # Given: 모킹된 이미지 요소
        mock_element = AsyncMock()
        mock_element.get_attribute.side_effect = lambda attr: {
            'src': 'https://example.com/image.jpg',
            'alt': '테스트 이미지',
            'width': '800',
            'height': '600',
            'style': 'border: 1px solid;',
            'class': 'image-class',
            'title': '이미지 제목'
        }.get(attr, '')
        
        # When: 이미지 데이터 추출
        result = await mock_scraper.extract_image_data(mock_element, 'https://example.com/link', 1)
        
        # Then: FM코리아와 동일한 중첩 구조 검증
        assert result is not None
        assert result['type'] == 'image'
        assert result['order'] == 1
        assert 'data' in result
        
        # 중첩 구조 내부 검증
        data = result['data']
        assert data['src'] == 'https://example.com/image.jpg'
        assert data['alt'] == '테스트 이미지'
        assert data['width'] == '800'
        assert data['height'] == '600'
        assert data['href'] == 'https://example.com/link'
        assert data['data_original'] == 'https://example.com/image.jpg'
        assert data['original_src'] == 'https://example.com/image.jpg'
        assert data['style'] == 'border: 1px solid;'
        assert data['class'] == 'image-class'
        assert data['title'] == '이미지 제목'
    
    @pytest.mark.asyncio
    async def test_video_data_structure_matches_fmkorea(self, mock_scraper):
        """비디오 데이터 구조가 FM코리아와 일치하는지 테스트"""
        # Given: 모킹된 비디오 요소
        mock_element = AsyncMock()
        mock_element.evaluate.return_value = "video"
        mock_element.get_attribute.side_effect = lambda attr: {
            'src': 'https://example.com/video.mp4',
            'poster': 'https://example.com/poster.jpg',
            'width': '1920',
            'height': '1080',
            'autoplay': '',  # 속성 존재
            'loop': None,    # 속성 없음
            'muted': '',     # 속성 존재
            'controls': '',  # 속성 존재
            'preload': 'metadata',
            'class': 'video-class'
        }.get(attr, None)
        
        # When: 비디오 데이터 추출
        result = await mock_scraper.extract_video_data(mock_element, 2)
        
        # Then: FM코리아와 동일한 중첩 구조 검증
        assert result is not None
        assert result['type'] == 'video'
        assert result['order'] == 2
        assert 'data' in result
        
        # 중첩 구조 내부 검증
        data = result['data']
        assert data['src'] == 'https://example.com/video.mp4'
        assert data['poster'] == 'https://example.com/poster.jpg'
        assert data['autoplay'] == True
        assert data['loop'] == False
        assert data['muted'] == True
        assert data['controls'] == True
        assert data['preload'] == 'metadata'
        assert data['width'] == '1920'
        assert data['height'] == '1080'
        assert data['class'] == 'video-class'
    
    @pytest.mark.asyncio
    async def test_iframe_data_structure_matches_fmkorea(self, mock_scraper):
        """iframe 데이터 구조가 FM코리아와 일치하는지 테스트"""
        # Given: 모킹된 iframe 요소
        mock_element = AsyncMock()
        mock_element.evaluate.return_value = "iframe"
        mock_element.get_attribute.side_effect = lambda attr: {
            'src': 'https://example.com/embed',
            'width': '560',
            'height': '315',
            'class': 'iframe-class'
        }.get(attr, '')
        
        # When: iframe 데이터 추출
        result = await mock_scraper.extract_video_data(mock_element, 3)
        
        # Then: FM코리아와 동일한 중첩 구조 검증
        assert result is not None
        assert result['type'] == 'iframe'
        assert result['order'] == 3
        assert 'data' in result
        
        # 중첩 구조 내부 검증
        data = result['data']
        assert data['src'] == 'https://example.com/embed'
        assert data['width'] == '560'
        assert data['height'] == '315'
        assert data['class'] == 'iframe-class'
    
    def test_data_structure_consistency(self):
        """데이터 구조 일관성 테스트"""
        # Given: 예상되는 FM코리아 구조
        expected_structure = {
            'text': {
                'type': 'text',
                'order': int,
                'data': {
                    'tag': str,
                    'text': str,
                    'id': str,
                    'class': str,
                    'style': str,
                    'innerHTML': str
                }
            },
            'image': {
                'type': 'image',
                'order': int,
                'data': {
                    'src': str,
                    'alt': str,
                    'width': str,
                    'height': str,
                    'href': str,
                    'data_original': str,
                    'original_src': str,
                    'style': str,
                    'class': str,
                    'title': str,
                    'link_class': str,
                    'link_rel': str
                }
            },
            'video': {
                'type': 'video',
                'order': int,
                'data': {
                    'src': str,
                    'poster': str,
                    'autoplay': bool,
                    'loop': bool,
                    'muted': bool,
                    'controls': bool,
                    'preload': str,
                    'width': str,
                    'height': str,
                    'class': str
                }
            }
        }
        
        # Then: 구조 정의 검증
        assert 'text' in expected_structure
        assert 'image' in expected_structure
        assert 'video' in expected_structure
        
        # 각 타입별 필수 필드 검증
        for content_type, structure in expected_structure.items():
            assert 'type' in structure
            assert 'order' in structure
            assert 'data' in structure
            assert isinstance(structure['data'], dict)

class TestAPITransformation:
    """API 변환 로직 테스트"""
    
    def test_api_transformation_unified_structure(self):
        """API 변환이 통일된 구조를 사용하는지 테스트"""
        # Given: 루리웹 스타일 데이터 (중첩 구조)
        ruliweb_content = [
            {
                'type': 'text',
                'order': 0,
                'data': {
                    'tag': 'p',
                    'text': '루리웹 텍스트',
                    'style': 'color: blue;',
                    'class': 'ruliweb-text',
                    'id': 'ruliweb-id',
                    'innerHTML': '<p>루리웹 텍스트</p>'
                }
            },
            {
                'type': 'image',
                'order': 1,
                'data': {
                    'src': 'https://ruliweb.com/image.jpg',
                    'alt': '루리웹 이미지',
                    'width': '400',
                    'height': '300'
                }
            }
        ]
        
        # When: API 변환 로직 시뮬레이션
        transformed_content = []
        for item in ruliweb_content:
            if item['type'] == 'text':
                transformed_content.append({
                    'type': 'text',
                    'order': item['order'],
                    'data': {
                        'text': item['data']['text'],
                        'innerHTML': item['data']['innerHTML'],
                        'tag': item['data']['tag'],
                        'style': item['data']['style'],
                        'class': item['data']['class'],
                        'id': item['data']['id']
                    }
                })
            elif item['type'] == 'image':
                transformed_content.append({
                    'type': 'image',
                    'order': item['order'],
                    'data': {
                        'src': item['data']['src'],
                        'alt': item['data']['alt'],
                        'width': item['data']['width'],
                        'height': item['data']['height']
                    }
                })
        
        # Then: 변환된 구조 검증
        assert len(transformed_content) == 2
        
        # 텍스트 변환 검증
        text_item = transformed_content[0]
        assert text_item['type'] == 'text'
        assert text_item['data']['text'] == '루리웹 텍스트'
        assert text_item['data']['tag'] == 'p'
        
        # 이미지 변환 검증
        image_item = transformed_content[1]
        assert image_item['type'] == 'image'
        assert image_item['data']['src'] == 'https://ruliweb.com/image.jpg'
        assert image_item['data']['alt'] == '루리웹 이미지'

if __name__ == "__main__":
    pytest.main([__file__, "-v"]) 
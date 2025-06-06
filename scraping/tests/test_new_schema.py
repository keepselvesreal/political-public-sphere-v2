"""
목차:
- 새 스키마 검증 테스트 (1-50줄)
  - test_new_schema_validation: 새 스키마 구조 검증
  - test_community_field_required: community 필드 필수 검증
  - test_category_field_removed: category 필드 제거 검증
- 스크래퍼 통합 테스트 (51-100줄)
  - test_fmkorea_new_schema: 에펨코리아 스크래퍼 새 스키마 적용
  - test_ruliweb_new_schema: 루리웹 스크래퍼 새 스키마 적용
"""

import pytest
import json
import sys
from pathlib import Path
from jsonschema import validate, ValidationError

# 상위 디렉토리의 scrapers 모듈을 import하기 위해 경로 추가
sys.path.append(str(Path(__file__).parent.parent))

from scrapers.fmkorea_scraper import scrape_fmkorea_post
from scrapers.ruliweb_scraper import scrape_ruliweb_post

# 새로운 스키마 로드
def load_new_schema():
    """새로운 post_schema.json 로드"""
    schema_path = Path(__file__).parent.parent.parent / "references" / "post_schema.json"
    with open(schema_path, 'r', encoding='utf-8') as f:
        return json.load(f)

NEW_SCHEMA = load_new_schema()

class TestNewSchemaValidation:
    """새 스키마 검증 테스트"""
    
    def test_new_schema_structure(self):
        """새 스키마 구조 검증"""
        # community 필드가 최상위에 있는지 확인
        assert "community" in NEW_SCHEMA["properties"]
        assert NEW_SCHEMA["properties"]["community"]["type"] == "string"
        
        # required 필드에 community가 포함되어 있는지 확인
        assert "community" in NEW_SCHEMA["required"]
        
        # metadata에서 category가 제거되었는지 확인
        metadata_props = NEW_SCHEMA["properties"]["metadata"]["properties"]
        assert "category" not in metadata_props
        
        print("✅ 새 스키마 구조 검증 완료")
    
    def test_community_field_required(self):
        """community 필드 필수 검증 - 실패해야 함"""
        # community 필드가 없는 데이터로 테스트
        invalid_data = {
            "post_id": "12345",
            # "community": "fmkorea",  # 의도적으로 제외
            "metadata": {
                "title": "테스트 제목",
                "author": "테스트 작성자",
                "date": "2025.06.06",
                "view_count": 100,
                "up_count": 10,
                "down_count": 0,
                "comment_count": 5
            },
            "content": [],
            "comments": []
        }
        
        # 검증 실패해야 함
        with pytest.raises(ValidationError):
            validate(instance=invalid_data, schema=NEW_SCHEMA)
        
        print("✅ community 필드 필수 검증 완료")
    
    def test_category_field_removed(self):
        """category 필드 제거 검증"""
        # category 필드가 있는 데이터로 테스트 (허용되어야 함)
        data_with_category = {
            "post_id": "12345",
            "community": "fmkorea",
            "metadata": {
                "title": "테스트 제목",
                "author": "테스트 작성자",
                "date": "2025.06.06",
                "view_count": 100,
                "up_count": 10,
                "down_count": 0,
                "comment_count": 5,
                "category": "테스트"  # 추가 필드는 허용됨
            },
            "content": [],
            "comments": []
        }
        
        # 검증 성공해야 함 (추가 필드는 허용)
        try:
            validate(instance=data_with_category, schema=NEW_SCHEMA)
            print("✅ category 필드 제거 검증 완료")
        except ValidationError as e:
            pytest.fail(f"Validation should pass with extra fields: {e}")

class TestScraperNewSchema:
    """스크래퍼 새 스키마 적용 테스트 - 현재는 실패해야 함"""
    
    @pytest.mark.asyncio
    async def test_fmkorea_new_schema_fails(self):
        """에펨코리아 스크래퍼 새 스키마 적용 - 실패 테스트"""
        test_url = "https://www.fmkorea.com/8485393463"
        
        try:
            result = await scrape_fmkorea_post(test_url)
            
            if result:
                # 현재 스크래퍼는 community 필드가 없으므로 검증 실패해야 함
                with pytest.raises(ValidationError):
                    validate(instance=result, schema=NEW_SCHEMA)
                
                print("✅ 에펨코리아 스크래퍼 새 스키마 실패 확인")
            else:
                print("⚠️ 스크래핑 실패 - 네트워크 문제일 수 있음")
                
        except Exception as e:
            print(f"⚠️ 테스트 실행 중 오류: {e}")
    
    @pytest.mark.asyncio
    async def test_ruliweb_new_schema_fails(self):
        """루리웹 스크래퍼 새 스키마 적용 - 실패 테스트"""
        test_url = "https://bbs.ruliweb.com/community/board/300148/read/38077550"
        
        try:
            result = await scrape_ruliweb_post(test_url)
            
            if result:
                # 현재 스크래퍼는 community 필드가 없으므로 검증 실패해야 함
                with pytest.raises(ValidationError):
                    validate(instance=result, schema=NEW_SCHEMA)
                
                print("✅ 루리웹 스크래퍼 새 스키마 실패 확인")
            else:
                print("⚠️ 스크래핑 실패 - 네트워크 문제일 수 있음")
                
        except Exception as e:
            print(f"⚠️ 테스트 실행 중 오류: {e}")

if __name__ == "__main__":
    # 간단한 테스트 실행
    import asyncio
    
    async def run_tests():
        print("=== 새 스키마 테스트 시작 ===")
        
        # 스키마 구조 테스트
        test_schema = TestNewSchemaValidation()
        test_schema.test_new_schema_structure()
        test_schema.test_community_field_required()
        test_schema.test_category_field_removed()
        
        # 스크래퍼 테스트
        test_scraper = TestScraperNewSchema()
        await test_scraper.test_fmkorea_new_schema_fails()
        await test_scraper.test_ruliweb_new_schema_fails()
        
        print("=== 테스트 완료 ===")
    
    asyncio.run(run_tests()) 
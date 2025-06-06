"""
목차:
- Green 단계 검증 테스트 (1-80줄)
  - test_schema_updated: 스키마 업데이트 확인
  - test_community_field_added: community 필드 추가 확인
  - test_data_structure: 데이터 구조 검증
"""

import json
import sys
from pathlib import Path
from jsonschema import validate, ValidationError

# 상위 디렉토리의 scrapers 모듈을 import하기 위해 경로 추가
sys.path.append(str(Path(__file__).parent.parent))

from scrapers.fmkorea_scraper import POST_SCHEMA as FMKOREA_SCHEMA
from scrapers.ruliweb_scraper import POST_SCHEMA as RULIWEB_SCHEMA

# 새로운 스키마 로드
def load_new_schema():
    """새로운 post_schema.json 로드"""
    schema_path = Path(__file__).parent.parent.parent / "references" / "post_schema.json"
    with open(schema_path, 'r', encoding='utf-8') as f:
        return json.load(f)

NEW_SCHEMA = load_new_schema()

def test_schema_updated():
    """스크래퍼 스키마가 새 스키마와 일치하는지 확인"""
    print("=== 스키마 업데이트 확인 ===")
    
    # 에펨코리아 스크래퍼 스키마 확인
    assert "community" in FMKOREA_SCHEMA["properties"], "에펨코리아 스키마에 community 필드가 없음"
    assert "community" in FMKOREA_SCHEMA["required"], "에펨코리아 스키마 required에 community가 없음"
    
    # 루리웹 스크래퍼 스키마 확인
    assert "community" in RULIWEB_SCHEMA["properties"], "루리웹 스키마에 community 필드가 없음"
    assert "community" in RULIWEB_SCHEMA["required"], "루리웹 스키마 required에 community가 없음"
    
    print("✅ 스크래퍼 스키마 업데이트 완료")

def test_community_field_added():
    """community 필드가 올바르게 추가되었는지 확인"""
    print("=== community 필드 추가 확인 ===")
    
    # 새 스키마 기반 테스트 데이터
    test_data = {
        "post_id": "12345",
        "community": "fmkorea",
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
    
    # 에펨코리아 스키마로 검증
    try:
        validate(instance=test_data, schema=FMKOREA_SCHEMA)
        print("✅ 에펨코리아 스키마 검증 통과")
    except ValidationError as e:
        print(f"❌ 에펨코리아 스키마 검증 실패: {e}")
        raise
    
    # 루리웹 스키마로 검증
    test_data["community"] = "ruliweb"
    try:
        validate(instance=test_data, schema=RULIWEB_SCHEMA)
        print("✅ 루리웹 스키마 검증 통과")
    except ValidationError as e:
        print(f"❌ 루리웹 스키마 검증 실패: {e}")
        raise
    
    # 새 스키마로 검증
    try:
        validate(instance=test_data, schema=NEW_SCHEMA)
        print("✅ 새 스키마 검증 통과")
    except ValidationError as e:
        print(f"❌ 새 스키마 검증 실패: {e}")
        raise

def test_data_structure():
    """데이터 구조가 올바른지 확인"""
    print("=== 데이터 구조 검증 ===")
    
    # community 필드 없는 데이터는 실패해야 함
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
    try:
        validate(instance=invalid_data, schema=NEW_SCHEMA)
        print("❌ community 필드 없는 데이터가 검증을 통과함 (문제)")
        raise AssertionError("community 필드 없는 데이터가 검증을 통과함")
    except ValidationError:
        print("✅ community 필드 없는 데이터 검증 실패 (정상)")

if __name__ == "__main__":
    print("=== Green 단계 검증 시작 ===")
    
    try:
        test_schema_updated()
        test_community_field_added()
        test_data_structure()
        
        print("\n🎉 Green 단계 검증 완료! 모든 테스트 통과")
        print("✅ 스크래퍼가 새 스키마를 올바르게 지원합니다.")
        
    except Exception as e:
        print(f"\n❌ Green 단계 검증 실패: {e}")
        raise
    
    print("=== Green 단계 검증 완료 ===") 
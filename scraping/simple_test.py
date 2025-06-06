"""
간단한 스크래퍼 테스트
기본 기능만 확인
"""

import asyncio
from scrapers.fmkorea_scraper import extract_post_id as fmkorea_extract_post_id, extract_number
from scrapers.ruliweb_scraper import extract_post_id as ruliweb_extract_post_id


def test_basic_functions():
    """기본 함수들 테스트"""
    print("=== 기본 함수 테스트 ===")
    
    # 에펨코리아 게시글 ID 추출 테스트
    fmkorea_url = "https://www.fmkorea.com/8485393463"
    fmkorea_id = fmkorea_extract_post_id(fmkorea_url)
    print(f"에펨코리아 게시글 ID: {fmkorea_id}")
    assert fmkorea_id == "8485393463", f"Expected 8485393463, got {fmkorea_id}"
    
    # 루리웹 게시글 ID 추출 테스트
    ruliweb_url = "https://bbs.ruliweb.com/community/board/300148/read/38077550"
    ruliweb_id = ruliweb_extract_post_id(ruliweb_url)
    print(f"루리웹 게시글 ID: {ruliweb_id}")
    assert ruliweb_id == "38077550", f"Expected 38077550, got {ruliweb_id}"
    
    # 숫자 추출 테스트
    test_cases = [
        ("123", 123),
        ("1,234", 1234),
        ("조회 1,506", 1506),
        ("추천 41", 41),
        ("", 0),
        ("텍스트만", 0)
    ]
    
    for text, expected in test_cases:
        result = extract_number(text)
        print(f"'{text}' -> {result}")
        assert result == expected, f"Expected {expected}, got {result}"
    
    print("✅ 모든 기본 함수 테스트 통과!")


def test_data_structure():
    """데이터 구조 테스트"""
    print("\n=== 데이터 구조 테스트 ===")
    
    # 샘플 데이터 구조 확인
    sample_post = {
        "post_id": "12345",
        "metadata": {
            "title": "테스트 제목",
            "author": "테스트 작성자",
            "date": "2025.06.06",
            "view_count": 100,
            "up_count": 10,
            "down_count": 0,
            "comment_count": 5,
            "category": "테스트"
        },
        "content": [
            {
                "type": "text",
                "order": 0,
                "data": {
                    "text": "테스트 텍스트"
                }
            }
        ],
        "comments": [
            {
                "comment_id": "123",
                "content": "테스트 댓글",
                "author": "댓글 작성자",
                "date": "2025.06.06",
                "media": [],
                "level": 0,
                "is_reply": False,
                "parent_comment_id": "",
                "up_count": 1,
                "down_count": 0
            }
        ]
    }
    
    # 구조 검증
    required_fields = ["post_id", "metadata", "content", "comments"]
    for field in required_fields:
        assert field in sample_post, f"Missing field: {field}"
    
    metadata_fields = ["title", "author", "date", "view_count", "up_count", "down_count", "comment_count"]
    for field in metadata_fields:
        assert field in sample_post["metadata"], f"Missing metadata field: {field}"
    
    if sample_post["comments"]:
        comment_fields = ["comment_id", "content", "author", "date", "media", "level", "is_reply", "parent_comment_id", "up_count", "down_count"]
        for field in comment_fields:
            assert field in sample_post["comments"][0], f"Missing comment field: {field}"
    
    print("✅ 데이터 구조 테스트 통과!")


def main():
    """메인 테스트 함수"""
    print("스크래퍼 간단 테스트 시작\n")
    
    try:
        test_basic_functions()
        test_data_structure()
        print("\n🎉 모든 테스트 통과!")
        
    except Exception as e:
        print(f"\n❌ 테스트 실패: {e}")
        return False
    
    return True


if __name__ == "__main__":
    success = main()
    if success:
        print("\n스크래퍼 기본 기능이 정상적으로 작동합니다.")
        print("실제 웹사이트 스크래핑은 네트워크 상황에 따라 다를 수 있습니다.")
    else:
        print("\n스크래퍼에 문제가 있습니다.") 
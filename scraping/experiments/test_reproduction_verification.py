#!/usr/bin/env python3
"""
스크래핑 데이터 재현 여부 검증 테스트 (TDD)

주요 기능:
- 스크래핑된 데이터의 완성도 검증
- 메타데이터 필수 필드 존재 여부 확인
- 댓글 데이터 구조 검증
- 콘텐츠 데이터 유효성 검증

작성자: AI Assistant
작성일: 2025년 6월 4일 20:20 (KST)
"""

import json
import os
import sys
from typing import Dict, List, Any
from datetime import datetime

def load_latest_scraping_data() -> List[Dict]:
    """최신 스크래핑 데이터 로드"""
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    
    if not os.path.exists(data_dir):
        print(f"❌ 데이터 디렉토리가 존재하지 않습니다: {data_dir}")
        return []
    
    # JSON 파일 목록 조회 (최신순)
    json_files = [f for f in os.listdir(data_dir) if f.endswith('.json')]
    if not json_files:
        print(f"❌ JSON 파일이 없습니다: {data_dir}")
        return []
    
    # 최신 파일 선택
    json_files.sort(reverse=True)
    latest_file = json_files[0]
    file_path = os.path.join(data_dir, latest_file)
    
    print(f"📁 최신 데이터 파일 로드: {latest_file}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data if isinstance(data, list) else [data]
    except Exception as e:
        print(f"❌ 파일 로드 오류: {e}")
        return []

def test_metadata_completeness(posts: List[Dict]) -> bool:
    """메타데이터 완성도 테스트"""
    print("\n🧪 테스트 1: 메타데이터 완성도 검증")
    
    required_fields = ['title', 'author', 'view_count', 'up_count', 'comment_count']
    passed = 0
    failed = 0
    
    for i, post in enumerate(posts, 1):
        metadata = post.get('metadata', {})
        post_title = metadata.get('title', f'게시글 #{i}')[:30] + "..."
        
        missing_fields = []
        for field in required_fields:
            if field not in metadata or not metadata[field]:
                if field in ['view_count', 'up_count', 'comment_count'] and metadata.get(field) == 0:
                    continue  # 0은 유효한 값
                missing_fields.append(field)
        
        if missing_fields:
            print(f"  ❌ 게시글 {i} ({post_title}): 누락된 필드 {missing_fields}")
            failed += 1
        else:
            print(f"  ✅ 게시글 {i} ({post_title}): 모든 필수 필드 존재")
            passed += 1
    
    success_rate = (passed / len(posts)) * 100 if posts else 0
    print(f"\n📊 메타데이터 완성도: {passed}/{len(posts)} ({success_rate:.1f}%)")
    return success_rate >= 80  # 80% 이상 성공 시 통과

def test_content_structure(posts: List[Dict]) -> bool:
    """콘텐츠 구조 테스트"""
    print("\n🧪 테스트 2: 콘텐츠 구조 검증")
    
    passed = 0
    failed = 0
    
    for i, post in enumerate(posts, 1):
        content = post.get('content', [])
        post_title = post.get('metadata', {}).get('title', f'게시글 #{i}')[:30] + "..."
        
        if not isinstance(content, list):
            print(f"  ❌ 게시글 {i} ({post_title}): 콘텐츠가 배열이 아님")
            failed += 1
            continue
        
        if len(content) == 0:
            print(f"  ⚠️ 게시글 {i} ({post_title}): 콘텐츠가 비어있음")
            failed += 1
            continue
        
        # 콘텐츠 요소 구조 검증
        valid_content = True
        for j, item in enumerate(content):
            if not isinstance(item, dict) or 'type' not in item or 'data' not in item:
                print(f"  ❌ 게시글 {i} ({post_title}): 콘텐츠 {j+1} 구조 오류")
                valid_content = False
                break
        
        if valid_content:
            print(f"  ✅ 게시글 {i} ({post_title}): 콘텐츠 구조 정상 ({len(content)}개 요소)")
            passed += 1
        else:
            failed += 1
    
    success_rate = (passed / len(posts)) * 100 if posts else 0
    print(f"\n📊 콘텐츠 구조 정확도: {passed}/{len(posts)} ({success_rate:.1f}%)")
    return success_rate >= 70  # 70% 이상 성공 시 통과

def test_comments_structure(posts: List[Dict]) -> bool:
    """댓글 구조 테스트"""
    print("\n🧪 테스트 3: 댓글 구조 검증")
    
    passed = 0
    failed = 0
    total_comments = 0
    valid_comments = 0
    
    for i, post in enumerate(posts, 1):
        comments = post.get('comments', [])
        post_title = post.get('metadata', {}).get('title', f'게시글 #{i}')[:30] + "..."
        
        if not isinstance(comments, list):
            print(f"  ❌ 게시글 {i} ({post_title}): 댓글이 배열이 아님")
            failed += 1
            continue
        
        total_comments += len(comments)
        post_valid_comments = 0
        
        for j, comment in enumerate(comments):
            if not isinstance(comment, dict):
                continue
            
            # 필수 필드 확인
            required_comment_fields = ['author', 'content', 'up_count', 'down_count']
            has_all_fields = all(field in comment for field in required_comment_fields)
            
            if has_all_fields:
                post_valid_comments += 1
                valid_comments += 1
        
        if len(comments) > 0:
            comment_success_rate = (post_valid_comments / len(comments)) * 100
            if comment_success_rate >= 80:
                print(f"  ✅ 게시글 {i} ({post_title}): 댓글 구조 정상 ({post_valid_comments}/{len(comments)})")
                passed += 1
            else:
                print(f"  ❌ 게시글 {i} ({post_title}): 댓글 구조 불완전 ({post_valid_comments}/{len(comments)})")
                failed += 1
        else:
            print(f"  ⚠️ 게시글 {i} ({post_title}): 댓글 없음")
            passed += 1  # 댓글이 없는 것은 정상
    
    success_rate = (passed / len(posts)) * 100 if posts else 0
    overall_comment_rate = (valid_comments / total_comments) * 100 if total_comments > 0 else 0
    
    print(f"\n📊 댓글 구조 정확도: {passed}/{len(posts)} 게시글 ({success_rate:.1f}%)")
    print(f"📊 전체 댓글 유효성: {valid_comments}/{total_comments} 댓글 ({overall_comment_rate:.1f}%)")
    
    return success_rate >= 70 and overall_comment_rate >= 60

def test_data_richness(posts: List[Dict]) -> bool:
    """데이터 풍부성 테스트"""
    print("\n🧪 테스트 4: 데이터 풍부성 검증")
    
    total_score = 0
    max_score = len(posts) * 5  # 게시글당 최대 5점
    
    for i, post in enumerate(posts, 1):
        metadata = post.get('metadata', {})
        content = post.get('content', [])
        comments = post.get('comments', [])
        post_title = metadata.get('title', f'게시글 #{i}')[:30] + "..."
        
        score = 0
        details = []
        
        # 1. 제목이 의미있는가?
        if metadata.get('title') and len(metadata['title']) > 5:
            score += 1
            details.append("제목 ✓")
        
        # 2. 메타데이터가 풍부한가?
        if metadata.get('view_count', 0) > 0 and metadata.get('up_count', 0) >= 0:
            score += 1
            details.append("메타데이터 ✓")
        
        # 3. 콘텐츠가 있는가?
        if len(content) > 0:
            score += 1
            details.append("콘텐츠 ✓")
        
        # 4. 댓글이 있는가?
        if len(comments) > 0:
            score += 1
            details.append("댓글 ✓")
        
        # 5. 댓글에 추천/비추천 정보가 있는가?
        if comments and any(c.get('up_count', 0) > 0 or c.get('down_count', 0) > 0 for c in comments):
            score += 1
            details.append("댓글 반응 ✓")
        
        total_score += score
        print(f"  📊 게시글 {i} ({post_title}): {score}/5점 - {', '.join(details)}")
    
    richness_rate = (total_score / max_score) * 100 if max_score > 0 else 0
    print(f"\n📊 데이터 풍부성: {total_score}/{max_score} ({richness_rate:.1f}%)")
    
    return richness_rate >= 60  # 60% 이상 시 통과

def run_all_tests() -> bool:
    """모든 테스트 실행"""
    print("🚀 스크래핑 데이터 재현 여부 검증 시작")
    print("=" * 60)
    
    # 데이터 로드
    posts = load_latest_scraping_data()
    if not posts:
        print("❌ 테스트 실패: 데이터를 로드할 수 없습니다.")
        return False
    
    print(f"📊 총 {len(posts)}개 게시글 데이터 로드됨")
    
    # 테스트 실행
    tests = [
        ("메타데이터 완성도", test_metadata_completeness),
        ("콘텐츠 구조", test_content_structure),
        ("댓글 구조", test_comments_structure),
        ("데이터 풍부성", test_data_richness)
    ]
    
    passed_tests = 0
    total_tests = len(tests)
    
    for test_name, test_func in tests:
        try:
            result = test_func(posts)
            if result:
                print(f"\n✅ {test_name} 테스트 통과")
                passed_tests += 1
            else:
                print(f"\n❌ {test_name} 테스트 실패")
        except Exception as e:
            print(f"\n💥 {test_name} 테스트 오류: {e}")
    
    # 최종 결과
    print("\n" + "=" * 60)
    print("🏁 최종 테스트 결과")
    print("=" * 60)
    
    success_rate = (passed_tests / total_tests) * 100
    print(f"📊 통과한 테스트: {passed_tests}/{total_tests} ({success_rate:.1f}%)")
    
    if success_rate >= 75:
        print("🎉 재현 품질 우수: 브라우저에서 확인 가능한 수준입니다!")
        return True
    elif success_rate >= 50:
        print("⚠️ 재현 품질 보통: 일부 개선이 필요하지만 기본적인 재현은 가능합니다.")
        return True
    else:
        print("❌ 재현 품질 부족: 추가 개선이 필요합니다.")
        return False

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1) 
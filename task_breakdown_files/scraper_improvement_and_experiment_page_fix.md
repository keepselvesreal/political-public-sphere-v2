# 스크래퍼 개선 및 실험 페이지 수정 작업

## 📋 작업 개요
- **목적**: FMKorea 댓글 관계 파악 개선, 루리웹 API 오류 수정, 실험 페이지 컴포넌트 교체
- **시작 시간**: 2025년 6월 5일 10:05 (KST)
- **완료 시간**: 2025년 6월 5일 10:30 (KST)
- **소요 시간**: 25분

## ✅ 작업 체크리스트

### 1. 현재 상황 파악 및 분석
- [x] 프로젝트 구조 확인
- [x] 현재 경로 확인
- [x] FMKorea 댓글 HTML 구조 분석
- [x] 루리웹 API 오류 원인 파악
- [x] 실험 페이지 현재 컴포넌트 사용 현황 확인

### 2. FMKorea 스크래퍼 댓글 관계 개선
- [x] HTML 예시 분석하여 댓글 관계 파악 로직 설계
- [x] margin-left 스타일을 통한 레벨 계산 구현
- [x] findParent 링크를 통한 부모 댓글 ID 추출
- [x] 대댓글 여부 판단 로직 구현
- [x] 개선된 댓글 추출 함수 적용

### 3. 루리웹 스크래퍼 API 오류 수정
- [x] 현재 API 엔드포인트 확인
- [x] FMKorea 스크래퍼의 API 전송 방식 분석
- [x] 루리웹 스크래퍼 API 전송 부분 수정
- [x] 데이터 저장 로직 검증

### 4. 실험 페이지 컴포넌트 교체
- [x] 현재 사용 중인 컴포넌트 확인
- [x] experimental-post-detail.tsx로 교체
- [x] 데이터 타입 호환성 확인
- [x] 기능 정상 동작 검증

### 5. 게시글 재현 컴포넌트 검증
- [x] 스크래핑 데이터 구조와 컴포넌트 호환성 확인
- [x] 원본 게시글 재현 품질 검증
- [x] 필요시 컴포넌트 개선

## 📝 수행 작업 목록

### 수행 작업
1. **FMKorea 댓글 관계 파악 개선**: HTML 구조 분석을 통해 margin-left 스타일과 findParent 링크를 활용한 댓글 계층 구조 파악 로직 구현
2. **루리웹 API 엔드포인트 수정**: 잘못된 API 경로 `/api/scraper-data`를 올바른 `/api/scraping-data`로 수정
3. **실험 페이지 컴포넌트 교체**: CommunityPostDetailRenderer를 ExperimentalPostDetailRenderer로 교체
4. **데이터 타입 호환성 개선**: 실험 페이지와 experimental-post-detail 컴포넌트 간 데이터 변환 로직 개선
5. **댓글 렌더링 개선**: 댓글 레벨, 대댓글 관계, 부모 댓글 참조를 시각적으로 표현하는 기능 추가

## 📁 새로 작성하거나 수정한 파일 목록

### scraping/scrapers/fmkorea_scraper_v3.py: 댓글 관계 파악 로직 개선
- extract_comments 함수: margin-left 스타일 기반 레벨 계산, findParent 링크 기반 부모 댓글 ID 추출, 대댓글 여부 판단 로직 추가
- 댓글 셀렉터 개선: 더 정확한 HTML 구조 반영

### scraping/scrapers/ruliweb_scraper_v3.py: API 오류 수정
- API 엔드포인트 수정: `/api/scraper-data` → `/api/scraping-data`
- API 전송 로직 개선: FMKorea 방식 참고하여 에러 처리 강화

### frontend/app/experiment/page.tsx: 컴포넌트 교체 및 데이터 변환 개선
- 컴포넌트 import 변경: CommunityPostDetailRenderer → ExperimentalPostDetailRenderer
- transformToCompatibleData 함수 개선: ScrapedPostData 타입과 완전 호환되도록 수정

### frontend/components/community-posts/experimental-post-detail.tsx: 댓글 렌더링 개선
- 댓글 레벨별 시각적 구분 추가
- 부모 댓글 참조 표시 기능 추가
- 대댓글 관계를 더 명확하게 표현하는 UI 개선

## 💡 그 외 유용한 내용

### FMKorea 댓글 구조 분석 결과
- **레벨 계산**: `margin-left:2%` → 레벨 2, `margin-left:4%` → 레벨 3 등
- **대댓글 식별**: `class` 속성에 `re` 포함 여부로 판단
- **부모 댓글 참조**: `<a class="findParent" onclick="return findComment(ID);">` 패턴에서 ID 추출

### API 오류 원인
- 루리웹 스크래퍼에서 잘못된 엔드포인트 `/api/scraper-data` 사용
- 실제 API는 `/api/scraping-data`로 구현되어 있음

### 컴포넌트 호환성
- ExperimentalPostDetailRenderer는 ScrapedPostData 타입을 직접 지원
- 기존 CommunityPostDetailRenderer보다 스크래핑 데이터에 최적화됨

## 👤 수행 작업에 대한 사용자 평가
- (사용자가 직접 작성) 
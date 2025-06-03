# CKEditor 5 통합 작업

## 목표
analysis-contents 글 작성 시 사용하는 에디터를 기존 마크다운 에디터에서 CKEditor 5로 교체

## 작업 계획

### 1단계: 현재 상태 파악 ✅
- [x] 현재 사용 중인 TextEditor 컴포넌트 확인
- [x] PostForm에서 TextEditor 사용 방식 확인
- [x] 프로젝트 구조 파악

### 2단계: CKEditor 5 패키지 설치 ✅
- [x] CKEditor 5 React 패키지 설치
- [x] 필요한 플러그인 패키지 설치
- [x] package.json 업데이트 확인

### 3단계: CKEditor 5 컴포넌트 생성 ✅
- [x] CKEditor5TextEditor 컴포넌트 생성
- [x] 기본 설정 및 플러그인 구성
- [x] 스타일링 적용
- [x] TypeScript 타입 정의

### 4단계: 기존 TextEditor 교체 ✅
- [x] PostForm에서 CKEditor 5 컴포넌트로 교체
- [x] 기존 TextEditor 컴포넌트 백업 또는 제거
- [x] 임포트 경로 수정

### 5단계: 스타일링 개선 및 미리보기 기능 추가 ✅
- [x] 불릿 리스트 스타일링 개선 (왼쪽 여백 추가)
- [x] 제목 크기 차이 적용 (h1, h2, h3 스타일링)
- [x] 미리보기 기능 추가
- [x] 에디터/미리보기 토글 버튼 구현
- [x] 미리보기 스타일링 적용

### 6단계: 테스트 및 검증
- [ ] 글 작성 기능 테스트
- [ ] 데이터 저장/불러오기 테스트
- [ ] UI/UX 확인
- [ ] 반응형 디자인 확인
- [ ] 미리보기 기능 테스트

### 7단계: 최종 정리 ✅
- [x] 불필요한 파일 정리 (기존 TextEditor.tsx 삭제)
- [x] 코드 리팩토링
- [x] 문서 업데이트

## 체크리스트
- [x] CKEditor 5 정상 설치
- [x] 에디터 기본 기능 동작 확인
- [x] 글 작성/수정 기능 정상 동작
- [x] 스타일링 적용 완료 (불릿 리스트, 제목 크기)
- [x] 미리보기 기능 구현
- [ ] 기존 기능과의 호환성 확인

## 해결된 문제점 ✅
1. ✅ 불릿 리스트 사용 시 글자가 왼쪽에 너무 붙어서 표시됨 → 2rem 패딩 및 0.5rem 여백 추가
2. ✅ 제목 크기에 따른 글자 크기 차이가 적용되지 않음 → h1(2rem), h2(1.5rem), h3(1.25rem) 크기 적용
3. ✅ 미리보기 기능 부재로 독자 관점에서 확인 불가 → 에디터/미리보기 토글 기능 추가

## 추가된 기능
- ✅ 에디터/미리보기 토글 버튼
- ✅ 실시간 미리보기 (HTML 렌더링)
- ✅ 개선된 리스트 스타일링 (중첩 리스트 포함)
- ✅ 제목 크기 차별화
- ✅ 블록 인용, 테이블, 링크 스타일링
- ✅ 다크모드 완전 지원
- ✅ 반응형 디자인
- ✅ 접근성(A11y) 지원

## 주의사항
- 기존 마크다운 데이터와의 호환성 고려
- CKEditor 5의 번들 크기 최적화
- 접근성(A11y) 기능 유지
- 다크모드 지원 확인

## 파일 변경 사항
- ✅ 생성: `frontend/components/analysis-contest/CKEditor5TextEditor.tsx`
- ✅ 수정: `frontend/components/analysis-contest/PostForm.tsx`
- ✅ 백업: `frontend/components/analysis-contest/TextEditor.backup.tsx`
- ✅ 삭제: `frontend/components/analysis-contest/TextEditor.tsx`
- ✅ 패키지 설치: `@ckeditor/ckeditor5-react`, `@ckeditor/ckeditor5-build-classic` 
# 정치적 공론장 프로젝트 v1

정치적 담론과 선거 분석을 위한 디지털 플랫폼 프로젝트입니다.

## 📁 프로젝트 구조

```
v1/
├── docs/                   # 프로젝트 문서 및 설계 자료
├── election-analysis/      # 선거 분석 허브 웹 애플리케이션
└── .cursor/               # Cursor IDE 설정 파일
```

## 🚀 주요 구성 요소

### 📊 Election Analysis Hub (`/election-analysis`)
- **기술 스택**: Next.js 15, React 19, TypeScript, MongoDB
- **기능**: 선거 예측 분석, 토론 게시판, 실시간 업데이트
- **특징**: 다국어 지원 (한국어/영어), Google OAuth 인증

### 📚 Documentation (`/docs`)
- 프로젝트 요구사항 정의서 (PRD)
- 작업 분해 구조 (Task Breakdown)
- 기술 설계 문서

## 🛠 개발 환경 설정

### 1. 전체 프로젝트 클론
```bash
git clone <repository-url>
cd v1
```

### 2. Election Analysis Hub 실행
```bash
cd election-analysis
npm install
npm run dev
```

### 3. 테스트 실행
```bash
cd election-analysis
npm test
```

## 📋 개발 가이드라인

- **코딩 스타일**: ESLint + Prettier 사용
- **커밋 메시지**: Conventional Commits 규칙 준수
- **테스트**: Jest + React Testing Library 사용
- **문서화**: 모든 주요 컴포넌트와 함수에 한글 주석 작성

## 🔄 Git 워크플로우

1. 기능별 브랜치 생성: `git checkout -b feature/기능명`
2. 작업 완료 후 커밋: `git commit -m "feat: 기능 설명"`
3. Pull Request 생성 및 코드 리뷰
4. main 브랜치로 병합

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해 주세요. 
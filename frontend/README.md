# 선거 분석 허브 (Election Analysis Hub)

정치적 공론장을 위한 선거 분석 및 토론 플랫폼입니다.

## 🚀 기능

- **선거 예측 분석**: 다양한 데이터를 기반으로 한 선거 결과 예측
- **토론 게시판**: 정치적 이슈에 대한 건전한 토론 공간
- **실시간 업데이트**: 선거 관련 최신 정보 제공
- **다국어 지원**: 한국어/영어 지원
- **사용자 인증**: Google OAuth를 통한 안전한 로그인

## 🛠 기술 스택

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Authentication**: NextAuth.js
- **Testing**: Jest, React Testing Library
- **Internationalization**: next-i18next

## 📦 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 환경 변수 설정
`.env.local` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# MongoDB 연결 설정
MONGODB_URI=mongodb://localhost:27017/election-analysis

# NextAuth.js 설정
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Google OAuth 설정
GOOGLE_ID=your-google-client-id
GOOGLE_SECRET=your-google-client-secret

# 기타 설정
NODE_ENV=development
```

### 3. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 🧪 테스트

```bash
# 테스트 실행
npm test

# 테스트 커버리지 확인
npm test -- --coverage
```

## 📁 프로젝트 구조

```
election-analysis/
├── app/                    # Next.js App Router
│   ├── api/               # API 라우트
│   ├── post/              # 게시글 페이지
│   ├── write/             # 글 작성 페이지
│   ├── globals.css        # 전역 스타일
│   ├── layout.tsx         # 루트 레이아웃
│   └── page.tsx           # 홈 페이지
├── components/            # 재사용 가능한 컴포넌트
├── hooks/                 # 커스텀 훅
├── lib/                   # 유틸리티 및 설정
│   ├── models/           # MongoDB 모델
│   ├── auth.ts           # NextAuth 설정
│   ├── mongoose.ts       # MongoDB 연결
│   └── utils.ts          # 유틸리티 함수
├── locales/              # 다국어 번역 파일
│   ├── en/               # 영어
│   └── ko/               # 한국어
├── public/               # 정적 파일
└── tests/                # 테스트 파일
```

## 🔧 개발 가이드

### 코드 스타일
- ESLint와 Prettier를 사용하여 코드 품질을 관리합니다.
- 모든 컴포넌트는 TypeScript로 작성됩니다.
- 파일 상단에 목차 주석을 포함해야 합니다.

### 커밋 메시지 규칙
```
<타입>: <제목>

- 구체적인 변경 사항 1
- 구체적인 변경 사항 2
```

타입: feat, fix, refactor, test, docs, chore

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 🤝 기여하기

1. 이 저장소를 포크합니다.
2. 새로운 기능 브랜치를 생성합니다. (`git checkout -b feature/AmazingFeature`)
3. 변경 사항을 커밋합니다. (`git commit -m 'feat: Add some AmazingFeature'`)
4. 브랜치에 푸시합니다. (`git push origin feature/AmazingFeature`)
5. Pull Request를 생성합니다.

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해 주세요. 
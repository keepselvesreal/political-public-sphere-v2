다음은 기존 `Project Setup` 항목에 TDD(Test-Driven Development)를 위한 설정을 자연스럽게 통합한 내용입니다:

---

#### 1. Project Setup

* **Tasks**:

  * Initialize Next.js with TypeScript: `npx create-next-app@latest --ts election-analysis`.
  * Install dependencies:
    `npm install tailwindcss postcss autoprefixer react-quill mongoose swr next-auth@beta next-i18next react-infinite-scroll-component react-hot-toast`
  * Configure Tailwind CSS: Run `npx tailwindcss init -p`, update `tailwind.config.js` and `/app/globals.css`.
  * Set up MongoDB connection in `/lib/mongoose.ts`:

    ```ts
    import mongoose from 'mongoose';
    export async function connectDB() {
      if (mongoose.connection.readyState >= 1) return;
      await mongoose.connect(process.env.MONGODB_URI!, { useNewUrlParser: true, useUnifiedTopology: true });
    }
    ```
  * Configure NextAuth.js in `/lib/auth.ts` for Google login.
  * Set up i18n with `next-i18next`: Create `/locales/ko/common.json` and `/locales/en/common.json`.
  * Configure ESLint and Prettier: Create `.eslintrc.json` and `.prettierrc`.
  * Create project structure: `/app/api`, `/components`, `/lib/models`, `/tests`, `/public`.

* **TDD Configuration**:

  * Install testing dependencies:
    `npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event ts-jest jest-environment-jsdom @types/jest`
  * Create Jest config file `jest.config.ts`:

    ```ts
    export default {
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
      },
      testPathIgnorePatterns: ['/node_modules/', '/.next/'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
      },
    };
    ```
  * Create `jest.setup.ts`:

    ```ts
    import '@testing-library/jest-dom/extend-expect';
    ```
  * Add test script to `package.json`:

    ```json
    "scripts": {
      "test": "jest"
    }
    ```
  * Organize tests under `/tests` directory, colocated with related modules when appropriate.

#### 2. Database and API Development
- **Tasks**:
  - Define MongoDB schemas:
    - `/lib/models/Post.ts`: Fields (title, winner, gap, votes, keywords, content, authorId, createdAt, likes, views), indexes (`createdAt`, `likes`, `views`).
    - `/lib/models/Comment.ts`: Fields (postId, content, authorId, createdAt).
    - `/lib/models/Vote.ts`: Fields (postId, userId, type), unique index on `postId` and `userId`.
  - Implement posts API:
    - `/app/api/posts/route.ts`: GET (fetch with `skip`, `limit=10`, sort), POST (create with validation).
    - `/app/api/posts/[id]/route.ts`: GET (fetch, increment views), PUT (update, author only), DELETE (delete, author only).
  - Implement vote API: `/app/api/vote/[postId]/route.ts` (POST, check duplicates).
  - Implement comments API: `/app/api/comments/[postId]/route.ts` (GET, POST for authenticated users).
  - Add error handling: Return `{ error: string, status: number }` for all API failures.

#### 3. Frontend - Post Listing Page
- **Tasks**:
  - Create `/app/page.tsx`:
    - Implement infinite scroll with `react-infinite-scroll-component` and `useSWRInfinite`:
      ```ts
      import useSWRInfinite from 'swr/infinite';
      const fetcher = (url: string) => fetch(url).then((res) => res.json());
      const getKey = (pageIndex: number, previousPageData: any) => {
        if (previousPageData && !previousPageData.length) return null;
        return `/api/posts?skip=${pageIndex * 10}&limit=10&sort=${sort}`;
      };
      ```
    - Display 9 posts (desktop, 3×3 grid), 10 posts (mobile, 1-column).
  - Create `/components/PostCard.tsx`:
    - Display mandatory fields (title, winner, gap, votes, keywords).
    - Use `React.memo` and Tailwind CSS (`grid grid-cols-1 md:grid-cols-3 gap-4`).
    - Add ARIA: `aria-label="Post preview: {title}"`.
  - Create `/components/SortFilter.tsx`: Dropdown for sorting (createdAt, likes, views, comments).
  - Create `/components/InfiniteScrollWrapper.tsx`: Wrap `<InfiniteScroll>` with loading spinner and `react-hot-toast` for errors.
  - Add A11y: ARIA labels, keyboard navigation for cards and filters.
  - Add i18n: Translate labels (e.g., "Sort by", "Load more") using `next-i18next`.

#### 4. Frontend - Post Detail Page
- **Tasks**:
  - Create `/app/post/[id]/page.tsx`:
    - Use `getServerSideProps` for SSR, fetch post data.
    - Render content with `react-quill` (read-only).
    - Include `<CommentSection />` and like/dislike buttons.
  - Create `/components/CommentSection.tsx`:
    - Fetch comments with `useSWR`.
    - Add comment form (authenticated users only).
    - Use Tailwind CSS for styling.
  - Implement like/dislike:
    - POST to `/api/vote/[postId]`, check authentication with `useSession`.
  - Add A11y: ARIA labels for buttons (e.g., `aria-label="Like post"`), keyboard support.
  - Add i18n: Translate button labels and comment placeholders.

#### 4-1. Comment System API Integration
**추가 날짜: 2025년 06월 02일 11시 06분 (KST)**
- **Tasks**:
  - **API 구현**:
    - `/app/api/comments/[postId]/route.ts` 완전 구현:
      - GET: 특정 게시글의 댓글 목록 조회 (페이지네이션 지원)
      - POST: 새 댓글 작성 (인증된 사용자만, 유효성 검사 포함)
    - 댓글 데이터 구조: `{ _id, postId, content, authorId, authorName, createdAt }`
    - 에러 처리: 인증 실패, 유효성 검사 실패, 서버 오류 등
  - **프론트엔드 통합**:
    - `CommentSection.tsx` 수정:
      - Mock 데이터 제거하고 실제 API 연동
      - `useSWR`로 댓글 목록 실시간 조회
      - 댓글 작성 후 자동 새로고침 (`mutate` 사용)
      - 로딩 상태 및 에러 상태 처리
    - 댓글 작성 폼:
      - 인증 상태 확인 (`useSession`)
      - 작성 후 폼 초기화
      - 성공/실패 토스트 메시지
  - **데이터베이스 연동**:
    - Comment 모델 스키마 확인 및 필요시 수정
    - MongoDB 연결 및 CRUD 작업 구현
    - 인덱스 최적화 (postId, createdAt)
  - **사용자 경험 개선**:
    - 댓글 작성 중 로딩 스피너
    - 실시간 댓글 개수 업데이트
    - 댓글 작성 시간 표시 (상대 시간)
    - 빈 댓글 목록 상태 메시지

#### 4-2. Comment Voting and Deletion System
**추가 날짜**: 2025년 06월 02일 11시 35분 (KST)

### 목표
- 댓글에 좋아요/비추천 투표 기능 구현
- 댓글 작성자가 본인 댓글을 삭제할 수 있는 기능 구현
- 중첩 댓글 구조를 고려한 스마트 삭제 로직 구현

### 세부 작업
1. **CommentVote 모델 설계**
   - 사용자별 댓글 투표 데이터 관리
   - 중복 투표 방지 로직
   - 투표 토글 기능 (좋아요 ↔ 비추천 ↔ 취소)

2. **투표 API 구현**
   - POST /api/comments/[commentId]/vote: 투표 처리
   - GET /api/comments/[commentId]/vote: 투표 현황 조회
   - 자신의 댓글 투표 방지

3. **댓글 삭제 API 구현**
   - DELETE /api/comments/[commentId]: 댓글 삭제
   - 스마트 삭제: 자식 댓글이 있으면 내용만 삭제, 없으면 완전 삭제
   - 작성자 권한 검증

4. **프론트엔드 UI 개선**
   - 좋아요/비추천 버튼 추가
   - 투표 상태 시각적 표시 (활성화된 버튼 하이라이트)
   - 삭제 버튼 (본인 댓글에만 표시)
   - 삭제된 댓글 스타일링

5. **TDD 테스트 확장**
   - 투표 기능 테스트
   - 삭제 기능 테스트
   - 권한 검증 테스트

### 기술적 고려사항
- 투표 데이터 일관성 보장
- 삭제된 댓글의 중첩 구조 유지
- 실시간 UI 업데이트 (SWR 활용)
- 사용자 경험 최적화 (로딩 상태, 에러 처리)

#### 5. Frontend - Post Creation Page
- **Tasks**:
  - Create `/app/write/page.tsx`:
    - Redirect unauthenticated users to login using `useSession`.
    - Include `<PostForm />` and `<TextEditor />`.
  - Create `/components/PostForm.tsx`:
    - Use `react-hook-form` for validation.
    - Validate mandatory fields: title (100 chars), winner, gap, votes (sum 100%), keywords (max 5).
  - Create `/components/TextEditor.tsx`:
    - Use `react-quill` for rich text editing.
  - Submit form to `/api/posts` via POST.
  - Add feedback: `react-hot-toast` for success/error messages.
  - Add A11y: ARIA labels for form fields (e.g., `aria-label="Post title"`).
  - Add i18n: Translate form labels and placeholders.

#### 6. Authentication and Authorization
- **Tasks**:
  - Configure NextAuth.js in `/lib/auth.ts` for Google login.
  - Protect `/app/write/page.tsx` and APIs (`/api/vote`, `/api/comments`, `/api/posts` POST/PUT/DELETE) with authentication.
  - Restrict post edits/deletes to authors in `/api/posts/[id]`.
  - Prevent duplicate votes in `/api/vote/[postId]` using unique index.

#### 7. Performance Optimization
- **Tasks**:
  - Optimize MongoDB:
    - Use `lean()` in queries: `Post.find().skip(skip).limit(10).lean()`.
    - Ensure indexes: `PostSchema.index({ createdAt: -1, likes: -1, views: -1 })`.
  - Optimize infinite scroll:
    - Set `limit=10` for `/api/posts`.
    - Cache with `useSWRInfinite`.
  - Optimize frontend:
    - Apply `React.memo` to `<PostCard />`.
    - Use `next/image` for images with lazy loading.
  - Add `compression` middleware to `/app/api`.

#### 8. Testing and CI/CD
- **Tasks**:
  - Write Jest unit tests for `/components/PostCard.tsx`.
  - Write Playwright E2E tests for listing and writing flows in `/tests/e2e`.
  - Create `.github/workflows/ci.yml` for tests and Vercel deployment.

#### 9. Deployment and Monitoring
- **Tasks**:
  - Deploy to Vercel: `vercel --prod`, set `MONGODB_URI`, `GOOGLE_ID`, `GOOGLE_SECRET`.
  - Add Google Analytics to `/app/layout.tsx`.
  - Set up Sentry in `/lib/sentry.ts` for error monitoring.

#### 10. Atlas 에펨코리아 데이터 활용 및 게시글 재현
**추가 날짜**: 2025년 01월 28일 15시 30분 (KST)

### 목표
- MongoDB Atlas에 저장된 에펨코리아 스크래핑 데이터를 활용하여 실제 커뮤니티 게시글을 재현
- 기존 Mock 데이터를 실제 데이터로 대체하여 현실적인 사용자 경험 제공
- 스크래핑 데이터의 구조를 분석하여 최적화된 데이터 모델 설계

### 세부 작업

#### 10-1. 데이터 구조 분석 및 모델 설계
- **Tasks**:
  - **스크래핑 데이터 분석**:
    - Atlas에 저장된 에펨코리아 데이터 스키마 분석
    - 필드 구조 파악: `post_id`, `title`, `author`, `created_at`, `views`, `likes`, `dislikes`, `comments_count`, `url`, `category`, `content` 등
    - 데이터 품질 검증 및 누락 필드 확인
  - **CommunityPost 모델 정의**:
    - `/lib/models/CommunityPost.ts` 생성
    - 스크래핑 데이터 구조에 맞는 스키마 설계
    - 인덱스 최적화: `created_at`, `likes`, `views`, `community`, `category`
    - 검색 최적화를 위한 텍스트 인덱스 추가

#### 10-2. API 엔드포인트 구현
- **Tasks**:
  - **커뮤니티 게시글 목록 API**:
    - `/app/api/community-posts/route.ts` 구현
    - GET: 페이지네이션, 정렬, 필터링 지원
    - 쿼리 파라미터: `skip`, `limit`, `sortBy`, `order`, `category`, `community`
    - 응답 형식: `{ success: boolean, data: CommunityPost[], total: number }`
  - **개별 게시글 조회 API**:
    - `/app/api/community-posts/[id]/route.ts` 구현
    - GET: 게시글 상세 정보 조회 및 조회수 증가
    - 404 처리 및 에러 핸들링
  - **검색 API**:
    - `/app/api/community-posts/search/route.ts` 구현
    - 제목, 내용, 작성자 기반 텍스트 검색
    - MongoDB 텍스트 인덱스 활용

#### 10-3. 프론트엔드 통합
- **Tasks**:
  - **게시글 목록 페이지 업데이트**:
    - `/app/community-posts/page.tsx` 수정
    - Mock 데이터 제거하고 실제 API 연동
    - 무한 스크롤 구현 (`useSWRInfinite` 활용)
    - 정렬 및 필터링 기능 추가
  - **게시글 상세 페이지 개선**:
    - `/app/community-posts/posts/[id]/page.tsx` 수정
    - 실제 데이터 기반 렌더링
    - 원본 게시글 링크 제공
    - 메타데이터 표시 개선 (조회수, 추천수, 댓글수)
  - **검색 기능 구현**:
    - 검색 컴포넌트 추가
    - 실시간 검색 결과 표시
    - 검색 히스토리 및 인기 검색어

#### 10-4. 데이터 마이그레이션 및 최적화
- **Tasks**:
  - **데이터 정제 스크립트**:
    - 중복 데이터 제거
    - 누락된 필드 보완
    - 데이터 타입 정규화
  - **성능 최적화**:
    - 적절한 인덱스 생성
    - 쿼리 성능 모니터링
    - 캐싱 전략 수립
  - **데이터 백업 및 복구**:
    - 정기적인 데이터 백업 설정
    - 데이터 무결성 검증

#### 10-5. 사용자 경험 개선
- **Tasks**:
  - **로딩 상태 최적화**:
    - 스켈레톤 UI 구현
    - 점진적 로딩 (Progressive Loading)
    - 에러 상태 처리 개선
  - **반응형 디자인**:
    - 모바일 최적화
    - 터치 인터페이스 지원
    - 다크 모드 지원
  - **접근성 개선**:
    - ARIA 라벨 추가
    - 키보드 네비게이션 지원
    - 스크린 리더 호환성

#### 10-6. 모니터링 및 분석
- **Tasks**:
  - **사용자 행동 분석**:
    - 게시글 조회 패턴 분석
    - 인기 카테고리 및 키워드 추적
    - 사용자 참여도 메트릭
  - **성능 모니터링**:
    - API 응답 시간 측정
    - 데이터베이스 쿼리 성능 분석
    - 에러 로그 수집 및 분석
  - **A/B 테스트**:
    - UI/UX 개선 실험
    - 기능별 사용률 비교
    - 사용자 피드백 수집

### 기술적 고려사항
- **데이터 일관성**: 스크래핑 데이터의 품질 관리 및 정규화
- **확장성**: 대용량 데이터 처리를 위한 아키텍처 설계
- **보안**: 사용자 데이터 보호 및 API 보안 강화
- **성능**: 효율적인 쿼리 및 캐싱 전략
- **유지보수성**: 코드 품질 및 문서화

### TDD 테스트 전략
- **단위 테스트**: API 엔드포인트 및 데이터 모델 테스트
- **통합 테스트**: 프론트엔드-백엔드 연동 테스트
- **E2E 테스트**: 사용자 시나리오 기반 테스트
- **성능 테스트**: 대용량 데이터 처리 성능 검증

---

### Notes for AI IDE
- **Data Integration**: Atlas 데이터 구조에 맞는 API 및 컴포넌트 생성
- **Performance**: 대용량 데이터 처리를 위한 최적화된 쿼리 및 인덱싱
- **User Experience**: 실제 데이터 기반의 현실적인 UI/UX 구현
- **Testing**: 실제 데이터를 활용한 테스트 케이스 작성
- **Prompt Example**: "Generate a CommunityPost API endpoint that fetches paginated data from MongoDB Atlas with sorting and filtering capabilities."
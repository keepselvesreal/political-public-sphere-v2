PRD: Election Prediction Analysis Webpage
Overview

Purpose: Users can write, view, and interact with election prediction analysis posts, with structured previews, sorting, infinite scrolling, and user authentication.
Tech Stack: Next.js (SSR), Tailwind CSS, MongoDB (Mongoose), React-Quill (text editor), NextAuth.js (authentication), react-infinite-scroll-component (infinite scroll), next-i18next (i18n), react-hot-toast (feedback).
Rendering: Server-Side Rendering (SSR) for SEO and performance.
UI: Desktop (3-column grid, 9 posts initially), Mobile (1-column vertical, 10 posts initially). Infinite scroll loads 10 posts per page.
Features:
Post listing with sorting (createdAt, likes, views, comments).
Post details with like/dislike (authenticated users only) and comments.
Post creation with mandatory fields (title, winner, vote gap, candidate votes, keywords) and rich text editor.
Authentication, accessibility (A11y), and i18n (Korean default, English support).




Project Structure
Designed for modularity, scalability, and maintainability, following industry best practices:
/v1
├── /.cursor                    // 작업 중 커서 정보 (에디터 관련 설정 등)
├── /docs                      // 프로젝트 문서 및 참고 자료
├── /election-analysis
│   ├── /app
│   │   ├── /api
│   │   │   ├── auth/[...nextauth]
│   │   │   │   └── route.ts         // NextAuth.js 인증 API
│   │   │   ├── posts
│   │   │   │   ├── route.ts         // 목록 조회, 작성 (GET, POST)
│   │   │   │   └── [id]
│   │   │   │       └── route.ts     // 상세 조회, 수정, 삭제 (GET, PUT, DELETE)
│   │   │   ├── vote
│   │   │   │   └── [postId]
│   │   │   │       └── route.ts     // 추천/비추천 (POST)
│   │   │   └── comments
│   │   │       └── [postId]
│   │   │           └── route.ts     // 댓글 조회, 작성 (GET, POST)
│   │   ├── /components
│   │   │   ├── common
│   │   │   │   ├── Header.tsx       // 공통 헤더 (내비게이션, 인증 상태)
│   │   │   │   ├── Footer.tsx       // 공통 푸터
│   │   │   │   └── ErrorBoundary.tsx // 에러 핸들링
│   │   │   ├── PostCard.tsx         // 분석글 미리보기 카드
│   │   │   ├── SortFilter.tsx       // 정렬 필터 드롭다운
│   │   │   ├── TextEditor.tsx       // React-Quill 텍스트 에디터
│   │   │   ├── PostForm.tsx         // 글 작성 폼
│   │   │   ├── CommentSection.tsx   // 댓글 목록 및 입력 폼
│   │   │   └── InfiniteScrollWrapper.tsx // 무한 스크롤 래퍼
│   │   ├── /lib
│   │   │   ├── mongoose.ts          // MongoDB 연결
│   │   │   ├── auth.ts              // NextAuth.js 설정
│   │   │   └── models
│   │   │       ├── Post.ts          // Post 스키마
│   │   │       ├── Comment.ts       // Comment 스키마
│   │   │       └── Vote.ts          // Vote 스키마
│   │   ├── /locales
│   │   │   ├── en
│   │   │   │   └── common.json      // 영어 번역
│   │   │   └── ko
│   │   │       └── common.json      // 한국어 번역
│   │   ├── layout.tsx               // 전역 레이아웃 (SEO, A11y)
│   │   ├── page.tsx                 // 분석글 목록 페이지
│   │   ├── post
│   │   │   └── [id]
│   │   │       └── page.tsx         // 분석글 상세 페이지
│   │   ├── write
│   │   │   └── page.tsx             // 글 작성 페이지
│   │   └── globals.css              // Tailwind CSS 스타일
│   ├── /public                      // 정적 파일 (아이콘, 이미지)
│   ├── /tests
│   │   ├── PostCard.test.tsx        // 단위 테스트
│   │   └── e2e                      // E2E 테스트 (Playwright)
│   ├── package.json
│   ├── next.config.mjs
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── .eslintrc.json
│   ├── .prettierrc
│   ├── .github/workflows/ci.yml     // CI/CD 파이프라인
│   └── README.md



Work Breakdown and Tasks
1. Project Setup
Objective: Initialize Next.js project with dependencies, MongoDB connection, and i18n setup for maintainability.

Tasks:
Run npx create-next-app@latest --ts to initialize Next.js project.
Install dependencies: npm install tailwindcss postcss autoprefixer react-quill mongoose swr next-auth@beta next-i18next react-infinite-scroll-component react-hot-toast.
Configure Tailwind CSS: npx tailwindcss init -p, update tailwind.config.js for custom styles.
Set up MongoDB connection in /lib/mongoose.ts:import mongoose from 'mongoose';
export async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
  await mongoose.connect(process.env.MONGODB_URI!, { useNewUrlParser: true, useUnifiedTopology: true });
}


Configure NextAuth.js in /lib/auth.ts for Google/Email login.
Set up i18n with next-i18next: Create /locales/ko/common.json and /locales/en/common.json for Korean/English translations.
Configure ESLint and Prettier: Create .eslintrc.json and .prettierrc.
Set up project structure as outlined above.




2. Database and API Development
Objective: Define MongoDB schemas and implement API endpoints for posts, votes, and comments.

Tasks:
Create /lib/models/Post.ts:import mongoose from 'mongoose';
const PostSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 100 }, // 정권 심판 문구
  winner: { type: String, required: true }, // 예측 당선자
  gap: { type: Number, required: true }, // 득표율 격차
  votes: { type: Map, of: Number, required: true }, // 후보별 득표율
  keywords: { type: [String], required: true, validate: { validator: (v: string[]) => v.length <= 5 } }, // 키워드 (최대 5개)
  content: { type: String, required: true }, // 본문 HTML
  authorId: { type: String, required: true }, // 작성자 ID
  createdAt: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
});
PostSchema.index({ createdAt: -1, likes: -1, views: -1 });
export default mongoose.models.Post || mongoose.model('Post', PostSchema);


Create /lib/models/Comment.ts:import mongoose from 'mongoose';
const CommentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  content: { type: String, required: true },
  authorId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
export default mongoose.models.Comment || mongoose.model('Comment', CommentSchema);


Create /lib/models/Vote.ts:import mongoose from 'mongoose';
const VoteSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  userId: { type: String, required: true },
  type: { type: String, enum: ['like', 'dislike'], required: true },
});
VoteSchema.index({ postId: 1, userId: 1 }, { unique: true });
export default mongoose.models.Vote || mongoose.model('Vote', VoteSchema);


Implement /app/api/posts/route.ts:
GET: Fetch posts with pagination (skip, limit=10), sorting (createdAt, likes, views).
POST: Create new post, validate mandatory fields.


Implement /app/api/posts/[id]/route.ts:
GET: Fetch post details, increment views.
PUT: Update post (author only).
DELETE: Delete post (author only).


Implement /app/api/vote/[postId]/route.ts:
POST: Add like/dislike, prevent duplicate votes.


Implement /app/api/comments/[postId]/route.ts:
GET: Fetch comments for a post.
POST: Create new comment (authenticated users).


Add error handling: Return { error: string, status: number } for all API failures.




3. Frontend - Post Listing Page
Objective: Implement infinite scroll post listing with sorting and responsive design.

Tasks:
Create /app/page.tsx:
Use react-infinite-scroll-component for infinite scroll.
Fetch posts with useSWRInfinite:import useSWRInfinite from 'swr/infinite';
const fetcher = (url: string) => fetch(url).then((res) => res.json());
const getKey = (pageIndex: number, previousPageData: any) => {
  if (previousPageData && !previousPageData.length) return null;
  return `/api/posts?skip=${pageIndex * 10}&limit=10&sort=${sort}`;
};


Display 9 posts (3×3) on desktop, 10 posts on mobile initially.


Create /components/PostCard.tsx:
Display mandatory fields (title, winner, gap, votes, keywords).
Use React.memo for performance.
Tailwind CSS: grid grid-cols-1 md:grid-cols-3 gap-4.
Add ARIA: aria-label="Post preview: {title}".


Create /components/SortFilter.tsx:
Dropdown for sorting (createdAt, likes, views, comments).
Use useState for sort state, trigger useSWRInfinite refetch.


Create /components/InfiniteScrollWrapper.tsx:
Wrap <InfiniteScroll> with loading spinner and error handling (react-hot-toast).


Add A11y: Ensure keyboard navigation, ARIA roles for cards and filters.
Add i18n: Translate labels (e.g., "Sort by", "Load more") using next-i18next.




4. Frontend - Post Detail Page
Objective: Display post content, enable like/dislike and comments for authenticated users.

Tasks:
Create /app/post/[id]/page.tsx:
Fetch post data with getServerSideProps for SSR.
Render content using react-quill (read-only mode).
Include <CommentSection /> and like/dislike buttons.


Create /components/CommentSection.tsx:
Fetch comments with useSWR.
Add comment form (authenticated users only).
Use Tailwind CSS for styling.


Implement like/dislike:
POST to /api/vote/[postId], check authentication with NextAuth.js.
Prevent duplicate votes via /lib/models/Vote.ts unique index.


Add A11y: ARIA labels for buttons (e.g., aria-label="Like post"), keyboard support.
Add i18n: Translate button labels and comment placeholders.




5. Frontend - Post Creation Page
Objective: Enable authenticated users to write posts with mandatory fields and rich text editor.

Tasks:
Create /app/write/page.tsx:
Redirect unauthenticated users to login.
Include <PostForm /> and <TextEditor />.


Create /components/PostForm.tsx:
Use react-hook-form for form validation.
Mandatory fields:
Title (100 chars max).
Winner (text).
Vote gap (number, %).
Candidate votes (4 candidates, sum to 100%).
Keywords (max 5, comma-separated).


Validate sum of votes: votes.reduce((sum, v) => sum + v, 0) === 100.


Create /components/TextEditor.tsx:
Use react-quill for rich text editing.
Store HTML output in form data.


Submit form to /api/posts via POST request.
Add user feedback: react-hot-toast for success/error messages.
Add A11y: ARIA labels for form fields (e.g., aria-label="Post title").
Add i18n: Translate form labels and placeholders.




6. Authentication and Authorization
Objective: Secure post creation, voting, and commenting with user authentication.

Tasks:
Configure /lib/auth.ts with NextAuth.js:import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
export default NextAuth({
  providers: [GoogleProvider({ clientId: process.env.GOOGLE_ID!, clientSecret: process.env.GOOGLE_SECRET! })],
  callbacks: { jwt: async ({ token, user }) => { if (user) token.id = user.id; return token; } },
});


Create /app/api/auth/[...nextauth]/route.ts for auth routes.
Protect APIs:
/api/posts (POST, PUT, DELETE): Check session.user.id.
/api/vote/[postId] and /api/comments/[postId]: Require authentication.


Add client-side auth: Use useSession from next-auth/react in components.
Add A11y: ARIA labels for login/logout buttons.




7. Performance Optimization
Objective: Optimize infinite scroll, MongoDB queries, and frontend rendering.

Tasks:
MongoDB optimization:
Add indexes in /lib/models/Post.ts: PostSchema.index({ createdAt: -1, likes: -1, views: -1 }).
Use lean() in queries: Post.find().skip(skip).limit(10).lean().


Infinite scroll:
Load 10 posts per page in /api/posts?skip={number}&limit=10.
Use useSWRInfinite with cache key: /api/posts?skip={pageIndex * 10}&limit=10.


Frontend optimization:
Apply React.memo to <PostCard />.
Use next/image for static images.
Implement lazy loading for images in <PostCard />.


API optimization:
Add compression middleware to /app/api.
Cache frequent queries with Redis (optional, via mongoose-redis-cache).


Initial render:
Desktop: Display 9 posts (3×3 grid).
Mobile: Display 10 posts (1-column).
Use Tailwind: grid grid-cols-1 md:grid-cols-3 gap-4.






8. Accessibility (A11y) and Internationalization (i18n)
Objective: Ensure accessibility and support Korean/English languages.

Tasks:
A11y:
Add ARIA attributes: aria-label for buttons, cards, and form fields.
Ensure keyboard navigation: <SortFilter />, <PostCard />, comment form.
Test with screen readers (e.g., NVDA).


i18n:
Configure next-i18next in /app/_app.tsx.
Add translations in /locales/ko/common.json and /locales/en/common.json:// ko/common.json
{
  "sortBy": "정렬 기준",
  "loadMore": "더 보기",
  "writePost": "작성하기"
}




Test A11y: Use axe-core for automated accessibility testing.




9. Testing and CI/CD
Objective: Ensure code quality and automate deployment.

Tasks:
Create unit tests in /tests/PostCard.test.tsx using Jest.
Set up E2E tests in /tests/e2e using Playwright.
Configure CI/CD in .github/workflows/ci.yml:
Run tests on push/pull request.
Deploy to Vercel on merge to main.


Add environment variables: MONGODB_URI, GOOGLE_ID, GOOGLE_SECRET in .env.local.




10. Deployment and Monitoring
Objective: Deploy to production and monitor performance/errors.

Tasks:
Deploy to Vercel: vercel --prod.
Add Google Analytics in /app/layout.tsx for usage tracking.
Set up Sentry in /lib/sentry.ts for error monitoring.
Configure environment variables in Vercel dashboard.




Notes for AI IDE

Code Generation: Generate modular components (e.g., <PostCard />, <TextEditor />) and API routes with error handling.
Validation: Ensure mandatory fields (title, winner, gap, votes, keywords) are validated in <PostForm />.
Performance: Prioritize lean() for MongoDB queries and React.memo for components.
A11y/i18n: Include ARIA attributes and translation keys in all UI components.
Testing: Generate Jest tests for components and Playwright tests for E2E flows.

PRD: Election Prediction Analysis Webpage
Overview

Purpose: Users can write, view, and interact with election prediction analysis posts, with structured previews, sorting, infinite scrolling, and user authentication.
Tech Stack: Next.js (SSR), Tailwind CSS, MongoDB (Mongoose), React-Quill (text editor), NextAuth.js (authentication), react-infinite-scroll-component (infinite scroll), next-i18next (i18n), react-hot-toast (feedback).
Rendering: Server-Side Rendering (SSR) for SEO and performance.
UI: Desktop (3-column grid, 9 posts initially), Mobile (1-column vertical, 10 posts initially). Infinite scroll loads 10 posts per page.
Features:
Post listing with sorting (createdAt, likes, views, comments).
Post details with like/dislike (authenticated users only) and comments.
Post creation with mandatory fields (title, winner, vote gap, candidate votes, keywords) and rich text editor.
Authentication, accessibility (A11y), and i18n (Korean default, English support).




Project Structure
Designed for modularity, scalability, and maintainability, following industry best practices:
/election-analysis
├── /app
│   ├── /api
│   │   ├── auth/[...nextauth]
│   │   │   └── route.ts         // NextAuth.js 인증 API
│   │   ├── posts
│   │   │   ├── route.ts         // 목록 조회, 작성 (GET, POST)
│   │   │   └── [id]
│   │   │       └── route.ts     // 상세 조회, 수정, 삭제 (GET, PUT, DELETE)
│   │   ├── vote
│   │   │   └── [postId]
│   │   │       └── route.ts     // 추천/비추천 (POST)
│   │   └── comments
│   │       └── [postId]
│   │           └── route.ts     // 댓글 조회, 작성 (GET, POST)
│   ├── /components
│   │   ├── common
│   │   │   ├── Header.tsx       // 공통 헤더 (내비게이션, 인증 상태)
│   │   │   ├── Footer.tsx       // 공통 푸터
│   │   │   └── ErrorBoundary.tsx // 에러 핸들링
│   │   ├── PostCard.tsx         // 분석글 미리보기 카드
│   │   ├── SortFilter.tsx       // 정렬 필터 드롭다운
│   │   ├── TextEditor.tsx       // React-Quill 텍스트 에디터
│   │   ├── PostForm.tsx         // 글 작성 폼
│   │   ├── CommentSection.tsx   // 댓글 목록 및 입력 폼
│   │   └── InfiniteScrollWrapper.tsx // 무한 스크롤 래퍼
│   ├── /lib
│   │   ├── mongoose.ts          // MongoDB 연결
│   │   ├── auth.ts              // NextAuth.js 설정
│   │   └── models
│   │       ├── Post.ts          // Post 스키마
│   │       ├── Comment.ts       // Comment 스키마
│   │       └── Vote.ts          // Vote 스키마
│   ├── /locales
│   │   ├── en
│   │   │   └── common.json      // 영어 번역
│   │   └── ko
│   │       └── common.json      // 한국어 번역
│   ├── layout.tsx               // 전역 레이아웃 (SEO, A11y)
│   ├── page.tsx                 // 분석글 목록 페이지
│   ├── post
│   │   └── [id]
│   │       └── page.tsx         // 분석글 상세 페이지
│   ├── write
│   │   └── page.tsx             // 글 작성 페이지
│   └── globals.css              // Tailwind CSS 스타일
├── /public                      // 정적 파일 (아이콘, 이미지)
├── /tests
│   ├── PostCard.test.tsx        // 단위 테스트
│   └── e2e                      // E2E 테스트 (Playwright)
├── package.json
├── next.config.mjs
├── tailwind.config.js
├── tsconfig.json
├── .eslintrc.json
├── .prettierrc
├── .github/workflows/ci.yml     // CI/CD 파이프라인
└── README.md


Work Breakdown and Tasks
1. Project Setup
Objective: Initialize Next.js project with dependencies, MongoDB connection, and i18n setup for maintainability.

Tasks:
Run npx create-next-app@latest --ts to initialize Next.js project.
Install dependencies: npm install tailwindcss postcss autoprefixer react-quill mongoose swr next-auth@beta next-i18next react-infinite-scroll-component react-hot-toast.
Configure Tailwind CSS: npx tailwindcss init -p, update tailwind.config.js for custom styles.
Set up MongoDB connection in /lib/mongoose.ts:import mongoose from 'mongoose';
export async function connectDB() {
  if (mongoose.connection.readyState >= 1) return;
  await mongoose.connect(process.env.MONGODB_URI!, { useNewUrlParser: true, useUnifiedTopology: true });
}


Configure NextAuth.js in /lib/auth.ts for Google/Email login.
Set up i18n with next-i18next: Create /locales/ko/common.json and /locales/en/common.json for Korean/English translations.
Configure ESLint and Prettier: Create .eslintrc.json and .prettierrc.
Set up project structure as outlined above.




2. Database and API Development
Objective: Define MongoDB schemas and implement API endpoints for posts, votes, and comments.

Tasks:
Create /lib/models/Post.ts:import mongoose from 'mongoose';
const PostSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 100 }, // 정권 심판 문구
  winner: { type: String, required: true }, // 예측 당선자
  gap: { type: Number, required: true }, // 득표율 격차
  votes: { type: Map, of: Number, required: true }, // 후보별 득표율
  keywords: { type: [String], required: true, validate: { validator: (v: string[]) => v.length <= 5 } }, // 키워드 (최대 5개)
  content: { type: String, required: true }, // 본문 HTML
  authorId: { type: String, required: true }, // 작성자 ID
  createdAt: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  views: { type: Number, default: 0 },
});
PostSchema.index({ createdAt: -1, likes: -1, views: -1 });
export default mongoose.models.Post || mongoose.model('Post', PostSchema);


Create /lib/models/Comment.ts:import mongoose from 'mongoose';
const CommentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  content: { type: String, required: true },
  authorId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
export default mongoose.models.Comment || mongoose.model('Comment', CommentSchema);


Create /lib/models/Vote.ts:import mongoose from 'mongoose';
const VoteSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  userId: { type: String, required: true },
  type: { type: String, enum: ['like', 'dislike'], required: true },
});
VoteSchema.index({ postId: 1, userId: 1 }, { unique: true });
export default mongoose.models.Vote || mongoose.model('Vote', VoteSchema);


Implement /app/api/posts/route.ts:
GET: Fetch posts with pagination (skip, limit=10), sorting (createdAt, likes, views).
POST: Create new post, validate mandatory fields.


Implement /app/api/posts/[id]/route.ts:
GET: Fetch post details, increment views.
PUT: Update post (author only).
DELETE: Delete post (author only).


Implement /app/api/vote/[postId]/route.ts:
POST: Add like/dislike, prevent duplicate votes.


Implement /app/api/comments/[postId]/route.ts:
GET: Fetch comments for a post.
POST: Create new comment (authenticated users).


Add error handling: Return { error: string, status: number } for all API failures.




3. Frontend - Post Listing Page
Objective: Implement infinite scroll post listing with sorting and responsive design.

Tasks:
Create /app/page.tsx:
Use react-infinite-scroll-component for infinite scroll.
Fetch posts with useSWRInfinite:import useSWRInfinite from 'swr/infinite';
const fetcher = (url: string) => fetch(url).then((res) => res.json());
const getKey = (pageIndex: number, previousPageData: any) => {
  if (previousPageData && !previousPageData.length) return null;
  return `/api/posts?skip=${pageIndex * 10}&limit=10&sort=${sort}`;
};


Display 9 posts (3×3) on desktop, 10 posts on mobile initially.


Create /components/PostCard.tsx:
Display mandatory fields (title, winner, gap, votes, keywords).
Use React.memo for performance.
Tailwind CSS: grid grid-cols-1 md:grid-cols-3 gap-4.
Add ARIA: aria-label="Post preview: {title}".


Create /components/SortFilter.tsx:
Dropdown for sorting (createdAt, likes, views, comments).
Use useState for sort state, trigger useSWRInfinite refetch.


Create /components/InfiniteScrollWrapper.tsx:
Wrap <InfiniteScroll> with loading spinner and error handling (react-hot-toast).


Add A11y: Ensure keyboard navigation, ARIA roles for cards and filters.
Add i18n: Translate labels (e.g., "Sort by", "Load more") using next-i18next.




4. Frontend - Post Detail Page
Objective: Display post content, enable like/dislike and comments for authenticated users.

Tasks:
Create /app/post/[id]/page.tsx:
Fetch post data with getServerSideProps for SSR.
Render content using react-quill (read-only mode).
Include <CommentSection /> and like/dislike buttons.


Create /components/CommentSection.tsx:
Fetch comments with useSWR.
Add comment form (authenticated users only).
Use Tailwind CSS for styling.


Implement like/dislike:
POST to /api/vote/[postId], check authentication with NextAuth.js.
Prevent duplicate votes via /lib/models/Vote.ts unique index.


Add A11y: ARIA labels for buttons (e.g., aria-label="Like post"), keyboard support.
Add i18n: Translate button labels and comment placeholders.




5. Frontend - Post Creation Page
Objective: Enable authenticated users to write posts with mandatory fields and rich text editor.

Tasks:
Create /app/write/page.tsx:
Redirect unauthenticated users to login.
Include <PostForm /> and <TextEditor />.


Create /components/PostForm.tsx:
Use react-hook-form for form validation.
Mandatory fields:
Title (100 chars max).
Winner (text).
Vote gap (number, %).
Candidate votes (4 candidates, sum to 100%).
Keywords (max 5, comma-separated).


Validate sum of votes: votes.reduce((sum, v) => sum + v, 0) === 100.


Create /components/TextEditor.tsx:
Use react-quill for rich text editing.
Store HTML output in form data.


Submit form to /api/posts via POST request.
Add user feedback: react-hot-toast for success/error messages.
Add A11y: ARIA labels for form fields (e.g., aria-label="Post title").
Add i18n: Translate form labels and placeholders.




6. Authentication and Authorization
Objective: Secure post creation, voting, and commenting with user authentication.

Tasks:
Configure /lib/auth.ts with NextAuth.js:import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
export default NextAuth({
  providers: [GoogleProvider({ clientId: process.env.GOOGLE_ID!, clientSecret: process.env.GOOGLE_SECRET! })],
  callbacks: { jwt: async ({ token, user }) => { if (user) token.id = user.id; return token; } },
});


Create /app/api/auth/[...nextauth]/route.ts for auth routes.
Protect APIs:
/api/posts (POST, PUT, DELETE): Check session.user.id.
/api/vote/[postId] and /api/comments/[postId]: Require authentication.


Add client-side auth: Use useSession from next-auth/react in components.
Add A11y: ARIA labels for login/logout buttons.




7. Performance Optimization
Objective: Optimize infinite scroll, MongoDB queries, and frontend rendering.

Tasks:
MongoDB optimization:
Add indexes in /lib/models/Post.ts: PostSchema.index({ createdAt: -1, likes: -1, views: -1 }).
Use lean() in queries: Post.find().skip(skip).limit(10).lean().


Infinite scroll:
Load 10 posts per page in /api/posts?skip={number}&limit=10.
Use useSWRInfinite with cache key: /api/posts?skip={pageIndex * 10}&limit=10.


Frontend optimization:
Apply React.memo to <PostCard />.
Use next/image for static images.
Implement lazy loading for images in <PostCard />.


API optimization:
Add compression middleware to /app/api.
Cache frequent queries with Redis (optional, via mongoose-redis-cache).


Initial render:
Desktop: Display 9 posts (3×3 grid).
Mobile: Display 10 posts (1-column).
Use Tailwind: grid grid-cols-1 md:grid-cols-3 gap-4.






8. Accessibility (A11y) and Internationalization (i18n)
Objective: Ensure accessibility and support Korean/English languages.

Tasks:
A11y:
Add ARIA attributes: aria-label for buttons, cards, and form fields.
Ensure keyboard navigation: <SortFilter />, <PostCard />, comment form.
Test with screen readers (e.g., NVDA).


i18n:
Configure next-i18next in /app/_app.tsx.
Add translations in /locales/ko/common.json and /locales/en/common.json:// ko/common.json
{
  "sortBy": "정렬 기준",
  "loadMore": "더 보기",
  "writePost": "작성하기"
}




Test A11y: Use axe-core for automated accessibility testing.




9. Testing and CI/CD
Objective: Ensure code quality and automate deployment.

Tasks:
Create unit tests in /tests/PostCard.test.tsx using Jest.
Set up E2E tests in /tests/e2e using Playwright.
Configure CI/CD in .github/workflows/ci.yml:
Run tests on push/pull request.
Deploy to Vercel on merge to main.


Add environment variables: MONGODB_URI, GOOGLE_ID, GOOGLE_SECRET in .env.local.




10. Deployment and Monitoring
Objective: Deploy to production and monitor performance/errors.

Tasks:
Deploy to Vercel: vercel --prod.
Add Google Analytics in /app/layout.tsx for usage tracking.
Set up Sentry in /lib/sentry.ts for error monitoring.
Configure environment variables in Vercel dashboard.




Notes for AI IDE

Code Generation: Generate modular components (e.g., <PostCard />, <TextEditor />) and API routes with error handling.
Validation: Ensure mandatory fields (title, winner, gap, votes, keywords) are validated in <PostForm />.
Performance: Prioritize lean() for MongoDB queries and React.memo for components.
A11y/i18n: Include ARIA attributes and translation keys in all UI components.
Testing: Generate Jest tests for components and Playwright tests for E2E flows.


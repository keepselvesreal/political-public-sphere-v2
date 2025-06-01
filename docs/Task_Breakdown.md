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

---

### Notes for AI IDE
- **Code Generation**: Generate components (e.g., `<PostCard />`, `<TextEditor />`) and APIs with error handling and A11y/i18n support.
- **Validation**: Ensure mandatory fields are validated in `<PostForm />`.
- **Performance**: Use `lean()` for MongoDB queries, `React.memo` for components, and `useSWRInfinite` for infinite scroll.
- **Testing**: Include Jest and Playwright test templates.
- **Prompt Example**: "Generate a PostCard component with Tailwind CSS, React.memo, ARIA labels, and i18n support for displaying election post previews."
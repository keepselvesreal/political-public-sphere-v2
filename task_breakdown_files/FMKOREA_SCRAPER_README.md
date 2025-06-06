# 에펨코리아 스크래퍼 (FMKorea Scraper)

에펨코리아 게시글을 스크래핑하여 원본 게시글 재현에 필요한 모든 정보를 추출하고 JSON 형태로 저장하는 도구입니다.

## 주요 기능

- ✅ **메타데이터 추출**: 제목, 작성자, 날짜, 조회수, 추천수, 댓글수
- ✅ **본문 콘텐츠 추출**: 텍스트, 이미지, 비디오 등 순서 보존
- ✅ **댓글 추출**: 댓글 내용, 작성자, 대댓글 구조, 레벨 정보
- ✅ **데이터 검증**: JSON 스키마 기반 데이터 유효성 검증
- ✅ **원본 재현**: 추출된 데이터로 원본 게시글과 동일한 형태 재현 가능

## 설치 및 설정

### 1. 의존성 설치

```bash
# 가상환경 활성화
venv\Scripts\activate

# 필요한 패키지 설치
pip install -r requirements.txt

# Playwright 브라우저 설치
playwright install chromium
```

### 2. 필요한 패키지

- `playwright==1.40.0` - 웹 스크래핑
- `pytz==2023.3` - 시간대 처리
- `jsonschema==4.20.0` - 데이터 검증
- `pytest==7.4.3` - 테스트 프레임워크
- `pytest-asyncio==0.21.1` - 비동기 테스트

## 사용법

### 1. 기본 스크래핑

```bash
# 개별 게시글 스크래핑
python fmkorea_scraper.py https://www.fmkorea.com/8485393463
```

### 2. Python 코드에서 사용

```python
import asyncio
from fmkorea_scraper import FMKoreaScraper

async def main():
    scraper = FMKoreaScraper()
    
    # 게시글 스크래핑
    url = "https://www.fmkorea.com/8485393463"
    result = await scraper.scrape_post(url)
    
    # 결과 출력
    print(f"제목: {result['metadata']['title']}")
    print(f"작성자: {result['metadata']['author']}")
    print(f"본문 요소 수: {len(result['content'])}")
    print(f"댓글 수: {len(result['comments'])}")
    
    # JSON 파일로 저장
    file_path = await scraper.scrape_and_save(url)
    print(f"저장 완료: {file_path}")

if __name__ == "__main__":
    asyncio.run(main())
```

## 출력 데이터 구조

### JSON 스키마

```json
{
  "post_id": "8485393463",
  "metadata": {
    "title": "게시글 제목",
    "author": "작성자명",
    "date": "2025.06.06 15:27",
    "view_count": 202,
    "up_count": 7,
    "down_count": 0,
    "comment_count": 6,
    "category": ""
  },
  "content": [
    {
      "type": "image",
      "order": 1,
      "data": {
        "src": "https://image.fmkorea.com/...",
        "alt": "이미지 설명",
        "width": "1151",
        "height": "692"
      }
    },
    {
      "type": "text",
      "order": 2,
      "data": {
        "text": "게시글 텍스트 내용"
      }
    }
  ],
  "comments": [
    {
      "comment_id": "8485411698",
      "author": "댓글작성자",
      "content": "댓글 내용",
      "date": "14 분 전",
      "media": [],
      "level": 0,
      "is_reply": false,
      "parent_comment_id": "",
      "up_count": 0,
      "down_count": 0
    }
  ],
  "scraped_at": "2025-06-06T15:41:11.347727+09:00"
}
```

### 데이터 필드 설명

#### 메타데이터 (metadata)
- `title`: 게시글 제목
- `author`: 작성자명
- `date`: 작성 날짜
- `view_count`: 조회수
- `up_count`: 추천수
- `down_count`: 비추천수 (현재 0으로 고정)
- `comment_count`: 댓글수
- `category`: 카테고리 (선택사항)

#### 본문 콘텐츠 (content)
- `type`: 콘텐츠 타입 (`text`, `image`, `video`)
- `order`: 표시 순서
- `data`: 타입별 데이터
  - 텍스트: `text` 필드
  - 이미지: `src`, `alt`, `width`, `height` 필드
  - 비디오: `src`, `autoplay`, `muted` 필드

#### 댓글 (comments)
- `comment_id`: 댓글 고유 ID
- `author`: 댓글 작성자
- `content`: 댓글 내용
- `date`: 작성 시간
- `level`: 댓글 레벨 (0: 원댓글, 1+: 대댓글)
- `is_reply`: 대댓글 여부
- `parent_comment_id`: 부모 댓글 ID
- `up_count`, `down_count`: 추천/비추천 수

## 테스트

### 단위 테스트 실행

```bash
# 간단한 테스트
python -m pytest tests/test_fmkorea_scraper_simple.py -v

# 전체 테스트 (모킹 포함)
python -m pytest tests/test_fmkorea_scraper.py -v
```

### 실제 스크래핑 테스트

```bash
# 실제 웹사이트 스크래핑 테스트
python test_scraper_manual.py
```

## 프론트엔드 재현 컴포넌트

### 실험용 페이지 접근

1. Next.js 개발 서버 실행:
```bash
cd frontend
npm run dev
```

2. 브라우저에서 접근:
```
http://localhost:3000/experiment-post-details
```

### 컴포넌트 사용법

```tsx
import ExperimentalPostRenderer from '@/components/community-posts/experimental-post-renderer';
import postData from '@/public/sample-post.json';

export default function PostPage() {
  return <ExperimentalPostRenderer postData={postData} />;
}
```

## 파일 구조

```
├── fmkorea_scraper.py          # 메인 스크래퍼 클래스
├── test_scraper_manual.py      # 수동 테스트 스크립트
├── tests/
│   ├── test_fmkorea_scraper.py        # 전체 테스트 (모킹)
│   └── test_fmkorea_scraper_simple.py # 간단한 테스트
├── data/                       # 스크래핑된 JSON 파일 저장
├── frontend/
│   ├── app/experiment-post-details/   # 실험용 페이지
│   ├── components/community-posts/    # 재현 컴포넌트
│   └── public/sample-post.json        # 샘플 데이터
└── requirements.txt            # Python 의존성
```

## 주요 특징

### 1. 원본 재현 최적화
- 게시글의 모든 요소를 순서대로 추출
- 이미지, 텍스트, 비디오 등 다양한 미디어 타입 지원
- 댓글의 계층 구조와 대댓글 관계 보존

### 2. 안정적인 스크래핑
- Playwright Stealth 모드 사용
- 네트워크 타임아웃 및 재시도 로직
- 에러 처리 및 로깅

### 3. 데이터 검증
- JSON Schema 기반 데이터 유효성 검증
- 필수 필드 누락 검사
- 타입 안전성 보장

### 4. 확장 가능한 구조
- 모듈화된 추출 메서드
- 셀렉터 기반 설정
- 쉬운 커스터마이징

## 제한사항

- 에펨코리아의 robots.txt 및 이용약관을 준수해야 함
- 과도한 요청으로 인한 IP 차단 가능성
- 웹사이트 구조 변경 시 셀렉터 업데이트 필요
- 이미지는 외부 URL로 참조 (로컬 저장 안함)

## 라이선스

이 프로젝트는 교육 및 연구 목적으로만 사용되어야 합니다.

## 기여

버그 리포트나 기능 개선 제안은 이슈로 등록해주세요. 
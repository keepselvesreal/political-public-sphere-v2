# JSON Schema 정의
post_schema = {...}  # 기존 수정된 스키마 유지

# 게시글 목록 스키마
post_list_schema = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "post_id": {"type": "string"},
            "url": {"type": "string"},
            "title": {"type": "string"},
            "author": {"type": "string"},
            "date": {"type": "string"},
            "up_count": {"type": "integer"},
            "down_count": {"type": "integer"},
            "comment_count": {"type": "integer"},
            "view_count": {"type": "integer"}
        },
        "required": ["post_id", "url", "title", "date", "up_count", "down_count", "comment_count", "view_count"]
    }
}

# 커뮤니티 셀렉터 관리
community_selectors = {
    "fmkorea": {...},
    "ruliweb": {...},
    "ppomppu": {...},
    "clien": {...},
    "mlbpark": {...},
    "dcinside": {...}
}

# 커뮤니티 관리 유틸리티
def get_community_selector(community: str) -> Dict:
    # 커뮤니티 셀렉터 반환
    ...

def add_community_selector(community: str, selectors: Dict):
    # 새로운 커뮤니티 셀렉터 추가
    ...

def remove_community_selector(community: str):
    # 커뮤니티 셀렉터 삭제
    ...

def list_communities() -> List[str]:
    # 지원 커뮤니티 목록 반환
    ...

# MongoDB Atlas 관리
async def connect_mongodb(connection_string: str, db_name: str, collection_name: str) -> Collection:
    # MongoDB Atlas 클라이언트 연결 및 컬렉션 반환
    ...

async def save_to_mongodb(collection: Collection, data: Dict) -> str:
    # 데이터 저장 후 삽입된 문서 ID 반환
    ...

# 데이터 유효성 검사
def validate_data(data: Dict, schema: Dict) -> bool:
    # JSON Schema로 데이터 유효성 검사
    ...

# URL 파싱
def parse_post_id(url: str) -> str:
    # URL에서 게시글 ID 추출
    ...

# 시간대 필터링
def is_within_time_range(date_str: str, start_hour: int, end_hour: int, timezone: str = "Asia/Seoul") -> bool:
    # 게시글 작성 시간이 특정 시간대(예: 15-16시)인지 확인
    ...

# 브라우저 관리
async def setup_browser(config: Dict) -> Tuple[Browser, Page]:
    # 브라우저 초기화
    ...

async def close_browser(browser: Browser, page: Page):
    # 브라우저 종료
    ...

async def navigate_page(page: Page, url: str, config: Dict):
    # 페이지 이동 및 설정
    ...

# 요소별 데이터 추출
async def extract_element_data(element: ElementHandle, selectors: Dict, order: int) -> Optional[Dict]:
    # 단일 요소(텍스트, 이미지, 영상) 데이터 추출
    ...

# 메타데이터 추출
async def extract_metadata(page: Page, selectors: Dict) -> Dict:
    # 게시글 메타데이터(제목, 작성자, up_count, down_count 등) 추출
    ...

# 본문 콘텐츠 추출
async def extract_content(page: Page, selectors: Dict) -> List[Dict]:
    # 본문 콘텐츠(텍스트, 이미지, 영상) 추출
    ...

# 댓글 추출
async def extract_comments(page: Page, selectors: Dict) -> List[Dict]:
    # 댓글 및 대댓글(내용, 미디어, 레벨, 부모 ID) 추출
    ...

# 게시글 목록 추출
async def extract_post_list(page: Page, selectors: Dict) -> List[Dict]:
    # 게시글 목록(제목, URL, 작성자, 날짜, up_count, down_count, comment_count, view_count) 추출
    ...

# 게시글 목록 페이지 탐색
async def find_earliest_page(page: Page, base_url: str, selectors: Dict, start_hour: int, end_hour: int) -> Optional[str]:
    # 특정 시간대(15-16시)의 가장 이른 게시글이 있는 페이지 URL 반환
    ...

# 게시글 선별
def select_top_posts(posts: List[Dict]) -> List[Dict]:
    # 추천수 상위 3개, 댓글수 상위 3개(추천수 제외), 조회수 상위 3개(추천수/댓글수 제외) 선별
    ...

# 특정 시간대 게시글 목록 스크래핑
async def scrape_post_list(community: str, base_url: str, start_hour: int, end_hour: int, config: Dict) -> List[Dict]:
    # 특정 시간대 게시글 목록 스크래핑 (역순 페이지 탐색, 역순 목록 처리)
    selectors = get_community_selector(community)
    browser, page = await setup_browser(config)
    try:
        earliest_page_url = await find_earliest_page(page, base_url, selectors, start_hour, end_hour)
        if not earliest_page_url:
            return []
        
        post_list = []
        current_url = earliest_page_url
        while current_url:
            await navigate_page(page, current_url, config)
            posts = await extract_post_list(page, selectors)
            filtered_posts = [post for post in posts if is_within_time_range(post["date"], start_hour, end_hour)]
            post_list.extend(reversed(filtered_posts))  # 역순으로 추가 (오래된 게시글 먼저)
            next_page_url = await page.query_selector(selectors.get("pagination", {}).get("prev_page", ""))
            current_url = await next_page_url.get_attribute("href") if next_page_url else None
        return validate_data(post_list, post_list_schema) and post_list
    finally:
        await close_browser(browser, page)

# 단일 게시글 스크래핑
async def scrape_post(url: str, selectors: Dict, config: Dict) -> Dict:
    # 게시글 상세 데이터 스크래핑
    browser, page = await setup_browser(config)
    try:
        await navigate_page(page, url, config)
        metadata = await extract_metadata(page, selectors)
        content = await extract_content(page, selectors)
        comments = await extract_comments(page, selectors)
        result = {
            "post_id": parse_post_id(url),
            "metadata": metadata,
            "content": content,
            "comments": comments,
            "scraped_at": datetime.now(pytz.timezone('Asia/Seoul')).isoformat()
        }
        return validate_data(result, post_schema) and result
    finally:
        await close_browser(browser, page)

# 특정 페이지 게시글 목록 스크래핑 및 선별
async def scrape_and_select_page_posts(community: str, page_url: str, config: Dict) -> List[Dict]:
    # 특정 페이지의 게시글 목록 스크래핑 후 선별
    selectors = get_community_selector(community)
    browser, page = await setup_browser(config)
    try:
        await navigate_page(page, page_url, config)
        posts = await extract_post_list(page, selectors)
        return select_top_posts(reversed(posts))  # 역순으로 선별 (오래된 게시글 먼저)
    finally:
        await close_browser(browser, page)

# 저장 함수
async def save_scraped_data(data: Dict, mongo_config: Dict) -> Dict:
    # MongoDB에 데이터 저장 및 결과 반환
    if not validate_data(data, post_schema):
        return {"error": "Validation failed"}
    collection = await connect_mongodb(
        mongo_config["connection_string"],
        mongo_config["db_name"],
        mongo_config["collection_name"]
    )
    inserted_id = await save_to_mongodb(collection, data)
    data["mongo_id"] = inserted_id
    return data

# 메인 실행 함수 (특정 시간대)
async def scrape_and_save_time_range_posts(community: str, base_url: str, start_hour: int, end_hour: int, config: Dict, mongo_config: Dict) -> List[Dict]:
    # 특정 시간대 게시글 목록 스크래핑, 선별, 상세 스크래핑 및 저장
    post_list = await scrape_post_list(community, base_url, start_hour, end_hour, config)
    selected_posts = select_top_posts(post_list)
    
    results = []
    selectors = get_community_selector(community)
    for post in selected_posts:
        scraped_data = await scrape_post(post["url"], selectors, config)
        saved_data = await save_scraped_data(scraped_data, mongo_config)
        results.append(saved_data)
    return results

# 동작 확인용. 메인 실행 함수 (특정 페이지)
async def scrape_and_save_page_posts(community: str, page_url: str, config: Dict, mongo_config: Dict) -> List[Dict]:
    # 특정 페이지 게시글 목록 스크래핑, 선별, 상세 스크래핑 및 저장
    selected_posts = await scrape_and_select_page_posts(community, page_url, config)
    
    results = []
    selectors = get_community_selector(community)
    for post in selected_posts:
        scraped_data = await scrape_post(post["url"], selectors, config)
        results.append(saved_data)
        
    import json
    import time

    file_name = f"test-fmkorea-{time.time()}.json"
    with open(file_name, 'w') as f:
        json.dump(results, f)
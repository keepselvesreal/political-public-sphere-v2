import asyncio
from fmkorea_scraper import FMKoreaScraper

async def test_real_scraping():
    """실제 에펨코리아 게시글 스크래핑 테스트"""
    scraper = FMKoreaScraper()
    
    # 테스트용 URL (실제 존재하는 게시글)
    test_url = "https://www.fmkorea.com/8485393463"
    
    try:
        print("스크래핑 시작...")
        result = await scraper.scrape_post(test_url)
        
        print(f"게시글 ID: {result['post_id']}")
        print(f"제목: {result['metadata']['title']}")
        print(f"작성자: {result['metadata']['author']}")
        print(f"날짜: {result['metadata']['date']}")
        print(f"조회수: {result['metadata']['view_count']}")
        print(f"추천수: {result['metadata']['up_count']}")
        print(f"댓글수: {result['metadata']['comment_count']}")
        print(f"본문 요소 수: {len(result['content'])}")
        print(f"댓글 수: {len(result['comments'])}")
        
        # 파일로 저장
        file_path = await scraper.scrape_and_save(test_url)
        print(f"저장 완료: {file_path}")
        
    except Exception as e:
        print(f"스크래핑 실패: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_real_scraping()) 
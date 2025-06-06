"""
루리웹 스크래핑 디버깅 테스트
"""

import asyncio
from scrapers.ruliweb_scraper import scrape_ruliweb_post

async def debug_ruliweb():
    url = 'https://bbs.ruliweb.com/community/board/300148/read/38077836'
    print(f'Testing URL: {url}')
    
    try:
        result = await scrape_ruliweb_post(url)
        if result:
            print('✅ Success!')
            print(f"Post ID: {result['post_id']}")
            print(f"Title: {result['metadata']['title']}")
            print(f"Comments: {len(result['comments'])}")
        else:
            print('❌ Failed - No result returned')
    except Exception as e:
        print(f'❌ Error: {e}')
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_ruliweb()) 
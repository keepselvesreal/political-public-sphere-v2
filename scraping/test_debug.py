from bs4 import BeautifulSoup

sample_html = """
<div class="rd rd_nav_style2 clear" data-docsrl="8465673277">
    <div class="rd_hd clear">
        <div class="board clear">
            <div class="top_area ngeb">
                <span class="date m_no">2025.06.02 16:33</span>
                <h1 class="np_18px">
                    <span class="np_18px_span">??? : 성상납 관련해서 녹취떴네 ㅋ 끝났네 끝났어 ㅋㅋㅋ</span>
                </h1>
            </div>
            <div class="btm_area clear">
                <div class="side">
                    <a href="#popup_menu_area" onclick="return false;" class="member_5199475678 member_plate">
                        <img src="//image.fmkorea.com/modules/point/icons/fmkorea25/36.png?k" alt="[레벨:36]" title="잉여력:758324, 레벨:36/40" class="level">대구틀딱대변인
                    </a>
                </div>
                <div class="side fr">
                    <span>조회 수 <b>6505</b></span>
                    <span>추천 수 <b>24</b></span>
                    <span>댓글 <b>12</b></span>
                </div>
            </div>
        </div>
    </div>
</div>
"""

soup = BeautifulSoup(sample_html, 'html.parser')

print("=== 다양한 선택자 테스트 ===")
print(f"soup.find('.side.fr'): {soup.find('.side.fr')}")
print(f"soup.find('div', class_='side fr'): {soup.find('div', class_='side fr')}")
print(f"soup.find('div', class_=['side', 'fr']): {soup.find('div', class_=['side', 'fr'])}")

# 모든 side 클래스 찾기
side_divs = soup.find_all('div', class_='side')
print(f"\n모든 side div: {len(side_divs)}개")
for i, div in enumerate(side_divs):
    print(f"  {i}: {div}")
    if 'fr' in div.get('class', []):
        print(f"    -> 이것이 fr 클래스를 가진 div입니다!")
        spans = div.find_all('span')
        for span in spans:
            print(f"    span: {span}")
            if '조회 수' in span.get_text():
                b_tag = span.find('b')
                if b_tag:
                    print(f"    조회수: {b_tag.get_text()}")

print("\n=== 제목 찾기 ===")
title_elem = soup.find('h1') or soup.find('.np_18px_span') or soup.find('span', class_='np_18px_span')
print(f"제목 요소: {title_elem}")
if title_elem:
    print(f"제목: {title_elem.get_text(strip=True)}")

print("\n=== 작성자 찾기 ===")
author_elem = soup.find('.member_plate') or soup.find('a', class_='member_plate')
print(f"작성자 요소: {author_elem}")
if author_elem:
    for img in author_elem.find_all('img'):
        img.decompose()
    print(f"작성자: {author_elem.get_text(strip=True)}")

print("\n=== 통계 영역 찾기 ===")
stats_area = soup.find('.side.fr') or soup.find('.btm_area')
print(f"통계 영역: {stats_area}")

if stats_area:
    print("\n=== 조회수 찾기 ===")
    view_spans = stats_area.find_all('span')
    for span in view_spans:
        if '조회 수' in span.get_text():
            print(f"조회수 span: {span}")
            b_tag = span.find('b')
            if b_tag:
                print(f"조회수: {b_tag.get_text()}")

# 댓글 HTML 테스트
comment_html = """
<ul class="fdb_lst_ul">
    <li id="comment_8465687351" class="fdb_itm clear comment-8465687354">
        <div class="meta">
            <a href="#popup_menu_area" onclick="return false;" class="member_5265134849 member_plate">
                <img src="//image.fmkorea.com/modules/point/icons/fmkorea25/14.png?k" alt="[레벨:14]" title="잉여력:3776, 레벨:14/40" class="level">이슈재밌옹
            </a>
            <span class="date">6 분 전</span>
        </div>
        <div class="comment-content">
            <div class="xe_content">대구틀딱대변인님... 기억하겠습니다<br>그는 좋은 백곰이셨습니다..</div>
        </div>
        <div class="fdb_nav img_tx">
            <span class="vote ui_font">
                <a class="bd_login" href="javascript:;" onclick="return fm_vote_comment(0, 8465687351, this);" title="추천">
                    <em><i class="fa fa-thumbs-o-up color"></i>
                        <span class="voted_count">15</span>
                    </em>
                </a>
            </span>
        </div>
    </li>
</ul>
"""

soup = BeautifulSoup(comment_html, 'html.parser')

print("=== 댓글 구조 분석 ===")
comment_items = soup.find_all('li', class_='fdb_itm')
print(f"댓글 개수: {len(comment_items)}")

for i, item in enumerate(comment_items):
    print(f"\n댓글 {i+1}:")
    print(f"전체 HTML: {item}")
    
    # 작성자 찾기
    author_elem = item.find('a', class_='member_plate')
    print(f"  작성자 요소: {author_elem}")
    if author_elem:
        # 이미지 제거 후 텍스트
        author_copy = BeautifulSoup(str(author_elem), 'html.parser')
        for img in author_copy.find_all('img'):
            img.decompose()
        print(f"  작성자: '{author_copy.get_text(strip=True)}'")
    
    # 추천수 찾기 - 다양한 방법 시도
    print(f"  추천수 찾기:")
    vote_elem1 = item.find('.voted_count')
    print(f"    .voted_count: {vote_elem1}")
    
    vote_elem2 = item.find('span', class_='voted_count')
    print(f"    span.voted_count: {vote_elem2}")
    
    # 모든 span 찾기
    all_spans = item.find_all('span')
    print(f"    모든 span: {len(all_spans)}개")
    for j, span in enumerate(all_spans):
        print(f"      span {j}: {span}")
        if 'voted_count' in span.get('class', []):
            print(f"        -> 이것이 추천수 span입니다: {span.get_text()}")
    
    # 댓글 내용 찾기
    print(f"  내용 찾기:")
    content_elem1 = item.find('.comment-content')
    print(f"    .comment-content: {content_elem1}")
    
    content_elem2 = item.find('div', class_='comment-content')
    print(f"    div.comment-content: {content_elem2}")
    
    if content_elem2:
        xe_content = content_elem2.find('.xe_content')
        print(f"    내부 .xe_content: {xe_content}")
        if xe_content:
            print(f"    내용: '{xe_content.get_text(strip=True)[:50]}...'") 
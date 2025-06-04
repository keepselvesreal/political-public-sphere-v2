/*
목차:
- 정보 공유 글 상세 페이지
- 동적 라우팅 지원
- 조회수 증가 기능
- 정보 출처 표시
- 20개 Mock 데이터 포함
- 마지막 수정: 2024년 12월 19일 19시 10분 (KST)
*/

import { notFound } from 'next/navigation';
import PreparationPostDetail from '@/components/analysis-contest/preparation/PreparationPostDetail';

// 정보 공유 글 타입 정의
interface PreparationPost {
  _id: string;
  title: string;
  content: string;
  source: '언론사' | '유튜브' | '카더라' | '개인 생각';
  author: {
    name: string;
    email: string;
  };
  tags: string[];
  views: number;
  likes: number;
  comments: number;
  createdAt: string;
  updatedAt: string;
}

// Mock 데이터 (개발용) - 20개
const MOCK_POSTS: Record<string, PreparationPost> = {
  '1': {
    _id: '1',
    title: '최신 여론조사 분석 방법론',
    content: `
      <h2>여론조사 분석의 핵심 포인트</h2>
      <p>여론조사를 분석할 때 가장 중요한 것은 표본의 대표성과 조사 방법론입니다.</p>
      
      <h3>1. 표본 설계</h3>
      <p>표본이 모집단을 얼마나 잘 대표하는지 확인해야 합니다. 연령, 성별, 지역별 분포를 체크하세요.</p>
      
      <h3>2. 조사 방법</h3>
      <p>전화조사, 온라인조사, 면접조사 등 각각의 장단점을 이해하고 결과를 해석해야 합니다.</p>
      
      <h3>3. 오차한계</h3>
      <p>95% 신뢰수준에서 ±3.1%p 등의 오차한계를 반드시 고려해야 합니다.</p>
      
      <h3>4. 시계열 분석</h3>
      <p>단일 조사보다는 여러 조사의 추세를 보는 것이 더 정확합니다.</p>
    `,
    source: '언론사',
    author: {
      name: '분석전문가',
      email: 'analyst@example.com'
    },
    tags: ['여론조사', '분석방법', '통계'],
    views: 1250,
    likes: 45,
    comments: 12,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString()
  },
  '2': {
    _id: '2',
    title: '유튜브 정치 채널 분석 팁',
    content: `
      <h2>유튜브 정치 콘텐츠 분석하기</h2>
      <p>유튜브의 정치 관련 콘텐츠를 분석할 때 주의해야 할 점들을 정리했습니다.</p>
      
      <h3>1. 채널의 성향 파악</h3>
      <p>채널 운영자의 정치적 성향과 과거 콘텐츠를 먼저 파악하세요.</p>
      
      <h3>2. 댓글 분석</h3>
      <p>댓글의 반응과 좋아요/싫어요 비율도 중요한 지표입니다.</p>
      
      <h3>3. 조회수 패턴</h3>
      <p>특정 주제에 대한 관심도를 조회수로 측정할 수 있습니다.</p>
    `,
    source: '유튜브',
    author: {
      name: '미디어분석가',
      email: 'media@example.com'
    },
    tags: ['유튜브', '미디어분석', '정치콘텐츠'],
    views: 890,
    likes: 32,
    comments: 8,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString()
  },
  '3': {
    _id: '3',
    title: '카더라 통신으로 들은 내부 정보',
    content: `
      <h2>선거 캠프 내부 소식</h2>
      <p>지인을 통해 들은 선거 캠프 내부 분위기입니다.</p>
      
      <h3>주요 후보 동향</h3>
      <p>각 후보별로 내부적으로 어떤 전략을 세우고 있는지 들은 바를 공유합니다.</p>
      
      <p><strong>주의:</strong> 확인되지 않은 정보이므로 참고용으로만 활용하세요.</p>
    `,
    source: '카더라',
    author: {
      name: '정보수집가',
      email: 'info@example.com'
    },
    tags: ['내부정보', '선거캠프', '루머'],
    views: 2100,
    likes: 78,
    comments: 45,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString()
  },
  '4': {
    _id: '4',
    title: '개인적인 선거 분석 관점',
    content: `
      <h2>나만의 선거 분석법</h2>
      <p>개인적으로 선거를 분석할 때 중요하게 생각하는 요소들을 정리했습니다.</p>
      
      <h3>1. 지역별 특성</h3>
      <p>각 지역의 정치적 성향과 역사적 투표 패턴을 고려합니다.</p>
      
      <h3>2. 세대별 차이</h3>
      <p>연령대별로 다른 정치적 관심사와 투표 성향을 분석합니다.</p>
      
      <h3>3. 경제 상황</h3>
      <p>현재 경제 상황이 유권자의 선택에 미치는 영향을 고려합니다.</p>
    `,
    source: '개인 생각',
    author: {
      name: '정치관찰자',
      email: 'observer@example.com'
    },
    tags: ['개인분석', '선거전략', '투표패턴'],
    views: 567,
    likes: 23,
    comments: 15,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString()
  },
  '5': {
    _id: '5',
    title: 'KBS 여론조사 결과 심층 분석',
    content: `
      <h2>KBS 여론조사 상세 분석</h2>
      <p>최근 발표된 KBS 여론조사 결과를 자세히 분석해보겠습니다.</p>
      
      <h3>조사 개요</h3>
      <ul>
        <li>조사기관: 한국리서치</li>
        <li>조사기간: 2024년 12월 16-17일</li>
        <li>표본수: 1,000명</li>
        <li>오차한계: ±3.1%p</li>
      </ul>
      
      <h3>주요 결과</h3>
      <p>후보별 지지율과 지역별, 연령별 분포를 상세히 분석했습니다.</p>
    `,
    source: '언론사',
    author: {
      name: 'KBS기자',
      email: 'kbs@example.com'
    },
    tags: ['KBS', '여론조사', '지지율'],
    views: 3200,
    likes: 89,
    comments: 34,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString()
  },
  '6': {
    _id: '6',
    title: '정치유튜버 김용호의 최신 분석',
    content: `
      <h2>김용호 채널 최신 영상 요약</h2>
      <p>정치유튜버 김용호의 최신 분석 영상 내용을 정리했습니다.</p>
      
      <h3>주요 포인트</h3>
      <p>현재 선거 상황에 대한 독특한 관점과 예측을 제시했습니다.</p>
      
      <h3>시청자 반응</h3>
      <p>댓글과 좋아요 수를 통해 본 시청자들의 반응도 함께 분석했습니다.</p>
    `,
    source: '유튜브',
    author: {
      name: '유튜브팬',
      email: 'fan@example.com'
    },
    tags: ['김용호', '정치유튜브', '분석'],
    views: 1890,
    likes: 67,
    comments: 28,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString()
  },
  '7': {
    _id: '7',
    title: '선거 관련 찌라시 정보 모음',
    content: `
      <h2>돌아다니는 소문들</h2>
      <p>최근 SNS와 커뮤니티에서 돌아다니는 선거 관련 소문들을 모아봤습니다.</p>
      
      <h3>주의사항</h3>
      <p>모든 정보는 확인되지 않은 것들이므로 참고용으로만 활용하세요.</p>
      
      <h3>소문 목록</h3>
      <p>각종 후보 관련 소문과 선거 전략 관련 이야기들입니다.</p>
    `,
    source: '카더라',
    author: {
      name: '소문수집가',
      email: 'rumor@example.com'
    },
    tags: ['소문', '찌라시', 'SNS'],
    views: 4500,
    likes: 156,
    comments: 89,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()
  },
  '8': {
    _id: '8',
    title: '나의 선거 예측 모델',
    content: `
      <h2>개인적인 예측 모델</h2>
      <p>여러 데이터를 종합해서 만든 나만의 선거 예측 모델입니다.</p>
      
      <h3>사용한 변수들</h3>
      <ul>
        <li>과거 선거 결과</li>
        <li>여론조사 추이</li>
        <li>경제 지표</li>
        <li>SNS 언급량</li>
      </ul>
      
      <h3>예측 결과</h3>
      <p>현재까지의 데이터를 바탕으로 한 예측 결과를 공유합니다.</p>
    `,
    source: '개인 생각',
    author: {
      name: '데이터분석가',
      email: 'data@example.com'
    },
    tags: ['예측모델', '데이터분석', '통계'],
    views: 2300,
    likes: 78,
    comments: 42,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString()
  },
  '9': {
    _id: '9',
    title: 'MBC 뉴스데스크 선거 특집',
    content: `
      <h2>MBC 선거 특집 프로그램 분석</h2>
      <p>어제 방송된 MBC 뉴스데스크 선거 특집의 주요 내용을 정리했습니다.</p>
      
      <h3>전문가 패널</h3>
      <p>정치학 교수들과 여론조사 전문가들의 의견을 종합했습니다.</p>
      
      <h3>핵심 쟁점</h3>
      <p>현재 선거의 주요 쟁점들과 각 후보의 대응 전략을 분석했습니다.</p>
    `,
    source: '언론사',
    author: {
      name: 'MBC기자',
      email: 'mbc@example.com'
    },
    tags: ['MBC', '뉴스데스크', '전문가분석'],
    views: 2800,
    likes: 95,
    comments: 38,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString()
  },
  '10': {
    _id: '10',
    title: '가로세로연구소 최신 분석',
    content: `
      <h2>가로세로연구소 김세의의 분석</h2>
      <p>유튜브 채널 가로세로연구소의 최신 선거 분석 영상을 요약했습니다.</p>
      
      <h3>주요 논점</h3>
      <p>현재 정치 상황에 대한 김세의의 독특한 관점과 분석을 정리했습니다.</p>
      
      <h3>시청자 질문 답변</h3>
      <p>라이브 방송 중 시청자들의 질문에 대한 답변도 포함했습니다.</p>
    `,
    source: '유튜브',
    author: {
      name: '가세연팬',
      email: 'gaseyon@example.com'
    },
    tags: ['가로세로연구소', '김세의', '정치분석'],
    views: 5600,
    likes: 234,
    comments: 67,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString()
  },
  '11': {
    _id: '11',
    title: '선거 관련 내부 정보 (미확인)',
    content: `
      <h2>들리는 소문들</h2>
      <p>정치권 내부에서 들리는 여러 소문들을 정리해봤습니다.</p>
      
      <h3>후보 캠프 동향</h3>
      <p>각 후보 캠프의 내부 분위기와 전략 변화에 대한 소문들입니다.</p>
      
      <h3>주의사항</h3>
      <p>모든 정보는 확인되지 않은 것이므로 신중하게 판단하시기 바랍니다.</p>
    `,
    source: '카더라',
    author: {
      name: '정치통',
      email: 'politics@example.com'
    },
    tags: ['내부정보', '정치권', '소문'],
    views: 3400,
    likes: 123,
    comments: 78,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 11).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 11).toISOString()
  },
  '12': {
    _id: '12',
    title: '선거 결과 예측을 위한 개인적 고찰',
    content: `
      <h2>나만의 선거 분석법</h2>
      <p>개인적으로 선거를 예측할 때 사용하는 방법론을 공유합니다.</p>
      
      <h3>분석 요소</h3>
      <ul>
        <li>역사적 투표 패턴</li>
        <li>현재 정치 이슈</li>
        <li>후보자 개인 매력도</li>
        <li>선거 운동 효과</li>
      </ul>
      
      <h3>예측 과정</h3>
      <p>각 요소들을 어떻게 종합해서 최종 예측을 도출하는지 설명합니다.</p>
    `,
    source: '개인 생각',
    author: {
      name: '선거분석가',
      email: 'election@example.com'
    },
    tags: ['예측방법', '분석기법', '개인견해'],
    views: 1200,
    likes: 45,
    comments: 23,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString()
  },
  '13': {
    _id: '13',
    title: 'SBS 8뉴스 여론조사 분석',
    content: `
      <h2>SBS 여론조사 결과 분석</h2>
      <p>SBS에서 발표한 최신 여론조사 결과를 상세히 분석했습니다.</p>
      
      <h3>조사 방법</h3>
      <p>조사 기관, 표본 수, 조사 방법 등 기본 정보를 정리했습니다.</p>
      
      <h3>결과 해석</h3>
      <p>단순한 수치를 넘어서 결과가 의미하는 바를 분석했습니다.</p>
    `,
    source: '언론사',
    author: {
      name: 'SBS기자',
      email: 'sbs@example.com'
    },
    tags: ['SBS', '8뉴스', '여론조사'],
    views: 2100,
    likes: 67,
    comments: 29,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 13).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 13).toISOString()
  },
  '14': {
    _id: '14',
    title: '신의한수 채널 선거 분석',
    content: `
      <h2>신의한수 최신 영상 요약</h2>
      <p>유튜브 채널 신의한수의 선거 분석 영상을 정리했습니다.</p>
      
      <h3>핵심 메시지</h3>
      <p>이번 영상에서 강조한 주요 포인트들을 요약했습니다.</p>
      
      <h3>댓글 반응</h3>
      <p>시청자들의 댓글을 통해 본 여론의 흐름도 분석했습니다.</p>
    `,
    source: '유튜브',
    author: {
      name: '신한수팬',
      email: 'shinhansu@example.com'
    },
    tags: ['신의한수', '정치유튜브', '선거분석'],
    views: 4200,
    likes: 178,
    comments: 56,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString()
  },
  '15': {
    _id: '15',
    title: '커뮤니티에서 돌아다니는 이야기들',
    content: `
      <h2>온라인 커뮤니티 동향</h2>
      <p>각종 온라인 커뮤니티에서 돌아다니는 선거 관련 이야기들을 모았습니다.</p>
      
      <h3>주요 커뮤니티별 반응</h3>
      <p>디시인사이드, 클리앙, 루리웹 등 각 커뮤니티의 분위기를 정리했습니다.</p>
      
      <h3>신뢰도 주의</h3>
      <p>확인되지 않은 정보들이므로 참고용으로만 활용하세요.</p>
    `,
    source: '카더라',
    author: {
      name: '커뮤니티러',
      email: 'community@example.com'
    },
    tags: ['커뮤니티', '온라인여론', '디시'],
    views: 6700,
    likes: 289,
    comments: 134,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString()
  },
  '16': {
    _id: '16',
    title: '선거 결과 예측을 위한 나만의 지표',
    content: `
      <h2>개인적인 예측 지표</h2>
      <p>여러 선거를 지켜보면서 개발한 나만의 예측 지표를 공유합니다.</p>
      
      <h3>핵심 지표들</h3>
      <ul>
        <li>후보자 인지도 변화</li>
        <li>정책 공약 반응도</li>
        <li>미디어 노출 빈도</li>
        <li>지지층 결집도</li>
      </ul>
      
      <h3>적용 결과</h3>
      <p>이 지표들을 현재 선거에 적용한 결과를 분석했습니다.</p>
    `,
    source: '개인 생각',
    author: {
      name: '예측전문가',
      email: 'predict@example.com'
    },
    tags: ['예측지표', '개인분석', '선거예측'],
    views: 1800,
    likes: 62,
    comments: 31,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 16).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 16).toISOString()
  },
  '17': {
    _id: '17',
    title: 'JTBC 뉴스룸 선거 분석',
    content: `
      <h2>JTBC 뉴스룸 특집 분석</h2>
      <p>JTBC 뉴스룸에서 다룬 선거 특집 내용을 정리했습니다.</p>
      
      <h3>전문가 인터뷰</h3>
      <p>정치학자와 여론조사 전문가들의 인터뷰 내용을 요약했습니다.</p>
      
      <h3>데이터 분석</h3>
      <p>방송에서 제시된 각종 데이터와 그래프를 분석했습니다.</p>
    `,
    source: '언론사',
    author: {
      name: 'JTBC기자',
      email: 'jtbc@example.com'
    },
    tags: ['JTBC', '뉴스룸', '전문가분석'],
    views: 3100,
    likes: 98,
    comments: 44,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 17).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 17).toISOString()
  },
  '18': {
    _id: '18',
    title: '정치유튜버 이준석TV 분석',
    content: `
      <h2>이준석TV 최신 영상 분석</h2>
      <p>이준석의 개인 유튜브 채널에서 다룬 선거 관련 내용을 정리했습니다.</p>
      
      <h3>주요 발언</h3>
      <p>이준석이 언급한 현재 정치 상황에 대한 견해를 정리했습니다.</p>
      
      <h3>시청자 반응</h3>
      <p>댓글과 좋아요 수를 통해 본 반응을 분석했습니다.</p>
    `,
    source: '유튜브',
    author: {
      name: '이준석팬',
      email: 'leejunseok@example.com'
    },
    tags: ['이준석TV', '정치인유튜브', '개인방송'],
    views: 7800,
    likes: 345,
    comments: 89,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 18).toISOString()
  },
  '19': {
    _id: '19',
    title: '선거 관련 찌라시 모음집',
    content: `
      <h2>최근 돌아다니는 찌라시들</h2>
      <p>SNS와 메신저를 통해 돌아다니는 각종 찌라시들을 모아봤습니다.</p>
      
      <h3>주요 내용들</h3>
      <p>후보자 관련 소문부터 선거 전략까지 다양한 내용들입니다.</p>
      
      <h3>팩트체크 필요</h3>
      <p>모든 내용은 확인되지 않은 것이므로 반드시 팩트체크가 필요합니다.</p>
    `,
    source: '카더라',
    author: {
      name: '찌라시수집가',
      email: 'jjirashi@example.com'
    },
    tags: ['찌라시', 'SNS소문', '미확인정보'],
    views: 8900,
    likes: 456,
    comments: 234,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 19).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 19).toISOString()
  },
  '20': {
    _id: '20',
    title: '선거 예측을 위한 종합적 분석',
    content: `
      <h2>종합적인 선거 분석</h2>
      <p>여러 요소들을 종합해서 선거 결과를 예측해보는 개인적인 분석입니다.</p>
      
      <h3>분석 방법론</h3>
      <ul>
        <li>과거 선거 데이터 분석</li>
        <li>현재 여론조사 추이</li>
        <li>경제·사회적 요인</li>
        <li>후보자 개인 요인</li>
      </ul>
      
      <h3>예측 결과</h3>
      <p>현재까지의 분석을 바탕으로 한 개인적인 예측을 제시합니다.</p>
      
      <h3>한계점</h3>
      <p>개인적인 분석의 한계와 불확실성에 대해서도 언급했습니다.</p>
    `,
    source: '개인 생각',
    author: {
      name: '종합분석가',
      email: 'comprehensive@example.com'
    },
    tags: ['종합분석', '선거예측', '개인견해'],
    views: 2400,
    likes: 87,
    comments: 52,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString()
  }
};

export default async function PreparationPostDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  
  try {
    // 실제 API 호출 (현재는 Mock 데이터 사용)
    // const response = await fetch(`/api/analysis-contest/preparation/${id}`);
    // if (!response.ok) throw new Error('게시글을 찾을 수 없습니다');
    // const post = await response.json();
    
    // Mock 데이터 사용
    const post = MOCK_POSTS[id];
    if (!post) {
      notFound();
    }
    
    return <PreparationPostDetail post={post} />;
    
  } catch (error) {
    console.error('게시글 조회 오류:', error);
    notFound();
  }
} 
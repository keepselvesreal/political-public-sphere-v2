/*
목차:
- i18next 초기화 설정
- App Router 호환 다국어 지원
- 한국어/영어 리소스 로딩
- 클라이언트 사이드 i18n 설정
*/

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// 한국어 번역 리소스
import koCommon from '../locales/ko/common.json';
// 영어 번역 리소스  
import enCommon from '../locales/en/common.json';

const resources = {
  ko: {
    common: koCommon,
  },
  en: {
    common: enCommon,
  },
};

// i18next 초기화
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ko', // 기본 언어
    fallbackLng: 'ko', // 폴백 언어
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false, // React는 XSS를 자동으로 방지
    },
    
    // 네임스페이스 설정
    defaultNS: 'common',
    ns: ['common'],
    
    // 키 분리자 설정
    keySeparator: '.',
    nsSeparator: ':',
    
    // 리액트 설정
    react: {
      useSuspense: false, // SSR 호환성을 위해 비활성화
    },
  });

export default i18n; 
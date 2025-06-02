/*
목차:
- NextAuth v5 auth 함수 import (라인 8-10)
- 서버 사이드 인증 함수들 (라인 12-30)
- 클라이언트 사이드 유틸리티 (라인 32-40)
*/

import { auth } from '@/auth'

// 서버 사이드에서 세션 정보 가져오기
export async function getAuthSession() {
  try {
    const session = await auth()
    return session
  } catch (error) {
    console.error('세션 가져오기 오류:', error)
    return null
  }
}

// 사용자 인증 상태 확인
export async function isAuthenticated() {
  const session = await getAuthSession()
  return !!session?.user
}

// 사용자 ID 가져오기
export async function getCurrentUserId() {
  const session = await getAuthSession()
  return session?.user?.id || null
}

// 클라이언트 사이드에서 사용할 수 있는 간단한 유틸리티
export function isUserLoggedIn(session: any) {
  return !!session?.user
}

// 사용자 정보 추출
export function getUserInfo(session: any) {
  return session?.user || null
} 
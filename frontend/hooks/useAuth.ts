/**
 * 📋 파일 목차 (hooks/useAuth.ts)
 * ========================================
 * 🎯 주요 역할: JWT 토큰 기반 인증 상태 관리 훅
 * 
 * 📦 구성 요소:
 * - 라인 1-20: 필수 라이브러리 및 타입 임포트
 * - 라인 22-40: 사용자 타입 및 인터페이스 정의
 * - 라인 42-80: 토큰 관리 함수들
 * - 라인 82-120: useAuth 훅 구현
 * - 라인 122-160: 로그인/로그아웃 함수들
 * 
 * 🔧 주요 기능:
 * - JWT 토큰 저장/조회/삭제
 * - 사용자 인증 상태 관리
 * - 자동 토큰 갱신
 * - 로그인/로그아웃 처리
 * 
 * 마지막 수정: 2025년 06월 03일 18시 20분 (KST)
 */

"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 사용자 정보 타입
 */
export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
  role: string;
  lastLoginAt: Date;
}

/**
 * 인증 상태 타입
 */
export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

/**
 * 로그인 응답 타입
 */
export interface LoginResponse {
  message: string;
  user: User;
  accessToken: string;
  refreshToken: string;
}

/**
 * 토큰 저장소 관리
 */
const TOKEN_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
} as const;

/**
 * 로컬 스토리지에서 토큰 조회
 */
const getStoredToken = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
};

/**
 * 로컬 스토리지에 토큰 저장
 */
const setStoredToken = (key: string, token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, token);
};

/**
 * 로컬 스토리지에서 토큰 삭제
 */
const removeStoredToken = (key: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
};

/**
 * JWT 토큰에서 사용자 정보 추출
 */
const parseJwtPayload = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('JWT 파싱 오류:', error);
    return null;
  }
};

/**
 * useAuth 훅
 */
export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });
  const router = useRouter();

  /**
   * 토큰에서 사용자 정보 로드
   */
  const loadUserFromToken = useCallback(async () => {
    const accessToken = getStoredToken(TOKEN_KEYS.ACCESS_TOKEN);
    
    if (!accessToken) {
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
      return;
    }

    try {
      const payload = parseJwtPayload(accessToken);
      
      if (!payload || payload.exp * 1000 < Date.now()) {
        // 토큰이 만료된 경우
        await logout();
        return;
      }

      // 실제 사용자 정보는 API에서 가져와야 하지만, 
      // 임시로 토큰에서 추출한 정보 사용
      const user: User = {
        id: payload.userId,
        username: payload.username || '',
        name: payload.name || '',
        email: payload.email || '',
        isEmailVerified: payload.isEmailVerified || false,
        role: payload.role || 'user',
        lastLoginAt: new Date(payload.lastLoginAt || Date.now()),
      };

      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      console.error('사용자 정보 로드 오류:', error);
      await logout();
    }
  }, []);

  /**
   * 로그인 처리
   */
  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier: email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || '로그인에 실패했습니다' };
      }

      const loginData: LoginResponse = data;

      // 토큰 저장
      setStoredToken(TOKEN_KEYS.ACCESS_TOKEN, loginData.accessToken);
      setStoredToken(TOKEN_KEYS.REFRESH_TOKEN, loginData.refreshToken);

      // 사용자 상태 업데이트
      setAuthState({
        user: loginData.user,
        isLoading: false,
        isAuthenticated: true,
      });

      return { success: true };
    } catch (error) {
      console.error('로그인 오류:', error);
      return { success: false, error: '로그인 중 오류가 발생했습니다' };
    }
  }, []);

  /**
   * 로그아웃 처리
   */
  const logout = useCallback(async () => {
    // 토큰 삭제
    removeStoredToken(TOKEN_KEYS.ACCESS_TOKEN);
    removeStoredToken(TOKEN_KEYS.REFRESH_TOKEN);

    // 상태 초기화
    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });

    // 홈페이지로 리다이렉트
    router.push('/');
  }, [router]);

  /**
   * 컴포넌트 마운트 시 토큰에서 사용자 정보 로드
   */
  useEffect(() => {
    loadUserFromToken();
  }, [loadUserFromToken]);

  return {
    ...authState,
    login,
    logout,
    refreshAuth: loadUserFromToken,
  };
} 
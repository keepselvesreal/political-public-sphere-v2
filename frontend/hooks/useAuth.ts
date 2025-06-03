/**
 * 📋 파일 목차 (hooks/useAuth.ts)
 * ========================================
 * 🎯 주요 역할: 사용자 인증 상태 관리 훅
 * 
 * 📦 구성 요소:
 * - 라인 1-20: 필수 라이브러리 및 타입 임포트
 * - 라인 22-40: 사용자 및 인증 상태 타입 정의
 * - 라인 42-80: useAuth 훅 구현
 * - 라인 82-120: 회원가입 함수
 * - 라인 122-160: 로그인 함수
 * - 라인 162-180: 로그아웃 함수
 * - 라인 182-200: 사용자 정보 조회 함수
 * 
 * 🔧 주요 기능:
 * - 사용자 인증 상태 관리
 * - 회원가입, 로그인, 로그아웃 처리
 * - JWT 토큰 관리
 * - 로컬 스토리지 연동
 * - 에러 상태 관리
 * 
 * 🔒 보안 기능:
 * - 토큰 자동 저장/삭제
 * - 인증 상태 실시간 업데이트
 * - API 에러 처리
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * 사용자 정보 타입 정의
 */
export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
  role: 'user' | 'admin';
  profileImage?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 회원가입 요청 데이터 타입
 */
export interface SignupData {
  username: string;
  name: string;
  email: string;
  password: string;
  password2: string;
}

/**
 * 로그인 요청 데이터 타입
 */
export interface LoginData {
  identifier: string; // 이메일 또는 사용자명
  password: string;
}

/**
 * useAuth 훅
 * 사용자 인증 상태와 관련 함수들을 제공
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  /**
   * 로컬 스토리지에서 토큰 가져오기
   */
  const getStoredTokens = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    
    return accessToken && refreshToken ? { accessToken, refreshToken } : null;
  }, []);

  /**
   * 토큰을 로컬 스토리지에 저장
   */
  const storeTokens = useCallback((accessToken: string, refreshToken: string) => {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }, []);

  /**
   * 토큰을 로컬 스토리지에서 제거
   */
  const clearTokens = useCallback(() => {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }, []);

  /**
   * 사용자 정보를 로컬 스토리지에 저장
   */
  const storeUser = useCallback((userData: User) => {
    if (typeof window === 'undefined') return;
    
    localStorage.setItem('user', JSON.stringify(userData));
  }, []);

  /**
   * 회원가입 함수
   */
  const signup = useCallback(async (signupData: SignupData) => {
    setLoading(true);
    setError(null);

    try {
      console.log('🚀 회원가입 시작:', { 
        username: signupData.username, 
        email: signupData.email 
      });

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '회원가입에 실패했습니다');
      }

      // 토큰 저장
      storeTokens(data.accessToken, data.refreshToken);
      
      // 사용자 정보 저장
      setUser(data.user);
      storeUser(data.user);
      setIsAuthenticated(true);

      console.log('✅ 회원가입 성공:', { userId: data.user.id });
      return data;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다';
      console.error('❌ 회원가입 실패:', errorMessage);
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [storeTokens, storeUser]);

  /**
   * 로그인 함수
   */
  const login = useCallback(async (loginData: LoginData) => {
    setLoading(true);
    setError(null);

    try {
      console.log('🚀 로그인 시작:', { identifier: loginData.identifier });

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '로그인에 실패했습니다');
      }

      // 토큰 저장
      storeTokens(data.accessToken, data.refreshToken);
      
      // 사용자 정보 저장
      setUser(data.user);
      storeUser(data.user);
      setIsAuthenticated(true);

      console.log('✅ 로그인 성공:', { userId: data.user.id });
      return data;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다';
      console.error('❌ 로그인 실패:', errorMessage);
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [storeTokens, storeUser]);

  /**
   * 로그아웃 함수
   */
  const logout = useCallback(async () => {
    setLoading(true);

    try {
      console.log('🚀 로그아웃 시작');

      // 서버에 로그아웃 요청
      await fetch('/api/auth/logout', {
        method: 'POST',
      });

      // 로컬 상태 및 스토리지 정리
      setUser(null);
      setIsAuthenticated(false);
      clearTokens();

      console.log('✅ 로그아웃 완료');

    } catch (error) {
      console.error('❌ 로그아웃 중 오류:', error);
      // 로그아웃은 실패해도 로컬 상태는 정리
      setUser(null);
      setIsAuthenticated(false);
      clearTokens();
    } finally {
      setLoading(false);
    }
  }, [clearTokens]);

  /**
   * 현재 사용자 정보 조회
   */
  const fetchCurrentUser = useCallback(async () => {
    const tokens = getStoredTokens();
    if (!tokens) return;

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        storeUser(data.user);
        setIsAuthenticated(true);
      } else {
        // 토큰이 유효하지 않으면 정리
        clearTokens();
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('사용자 정보 조회 실패:', error);
      clearTokens();
      setUser(null);
      setIsAuthenticated(false);
    }
  }, [getStoredTokens, storeUser, clearTokens]);

  /**
   * 컴포넌트 마운트 시 저장된 인증 정보 복원
   */
  useEffect(() => {
    const tokens = getStoredTokens();
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

    if (tokens && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsAuthenticated(true);
        
        // 서버에서 최신 사용자 정보 조회
        fetchCurrentUser();
      } catch (error) {
        console.error('저장된 사용자 정보 파싱 실패:', error);
        clearTokens();
      }
    }
  }, [getStoredTokens, fetchCurrentUser, clearTokens]);

  return {
    user,
    loading,
    error,
    isAuthenticated,
    signup,
    login,
    logout,
    fetchCurrentUser,
    clearError: () => setError(null)
  };
} 
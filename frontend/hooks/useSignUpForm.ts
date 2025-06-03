/**
 * 📋 파일 목차 (hooks/useSignUpForm.ts)
 * ========================================
 * 🎯 주요 역할: 회원가입 폼 상태 관리 훅
 * 
 * 📦 구성 요소:
 * - 라인 1-20: 필수 라이브러리 및 타입 임포트
 * - 라인 22-50: 폼 데이터 및 에러 타입 정의
 * - 라인 52-100: useSignUpForm 훅 구현
 * - 라인 102-150: 폼 검증 함수들
 * - 라인 152-200: 폼 상태 관리 함수들
 * 
 * 🔧 주요 기능:
 * - 회원가입 폼 데이터 상태 관리
 * - 실시간 폼 검증
 * - 에러 메시지 관리
 * - 비밀번호 표시/숨김 토글
 * - 인증 방식 선택 (이메일만)
 * 
 * 🔒 보안 기능:
 * - 클라이언트 사이드 검증
 * - 비밀번호 강도 검사
 * - 이메일 형식 검증
 * - 사용자명 형식 검증
 */

'use client';

import { useState, useCallback } from 'react';

/**
 * 회원가입 폼 데이터 타입
 */
export interface SignUpFormData {
  username: string;
  name: string;
  email: string;
  password: string;
  password2: string;
}

/**
 * 폼 에러 타입
 */
export interface FormErrors {
  username?: string;
  name?: string;
  email?: string;
  password?: string;
  password2?: string;
}

/**
 * 인증 방식 타입 (현재는 이메일만 지원)
 */
export type VerificationMethod = 'email';

/**
 * useSignUpForm 훅
 * 회원가입 폼의 상태와 검증 로직을 관리
 */
export function useSignUpForm() {
  // 폼 데이터 상태
  const [formData, setFormData] = useState<SignUpFormData>({
    username: '',
    name: '',
    email: '',
    password: '',
    password2: ''
  });

  // 폼 에러 상태
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // UI 상태
  const [showPassword, setShowPassword] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>('email');

  /**
   * 사용자명 검증
   */
  const validateUsername = useCallback((username: string): string | undefined => {
    if (!username.trim()) {
      return '사용자명을 입력해주세요';
    }
    if (username.length < 3) {
      return '사용자명은 최소 3자 이상이어야 합니다';
    }
    if (username.length > 20) {
      return '사용자명은 최대 20자까지 가능합니다';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return '사용자명은 영문, 숫자, 언더스코어만 사용 가능합니다';
    }
    return undefined;
  }, []);

  /**
   * 이름 검증
   */
  const validateName = useCallback((name: string): string | undefined => {
    if (!name.trim()) {
      return '이름을 입력해주세요';
    }
    if (name.length < 2) {
      return '이름은 최소 2자 이상이어야 합니다';
    }
    if (name.length > 50) {
      return '이름은 최대 50자까지 가능합니다';
    }
    return undefined;
  }, []);

  /**
   * 이메일 검증
   */
  const validateEmail = useCallback((email: string): string | undefined => {
    if (!email.trim()) {
      return '이메일을 입력해주세요';
    }
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return '올바른 이메일 형식이 아닙니다';
    }
    return undefined;
  }, []);

  /**
   * 비밀번호 검증
   */
  const validatePassword = useCallback((password: string): string | undefined => {
    if (!password) {
      return '비밀번호를 입력해주세요';
    }
    if (password.length < 8) {
      return '비밀번호는 최소 8자 이상이어야 합니다';
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return '비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다';
    }
    return undefined;
  }, []);

  /**
   * 비밀번호 확인 검증
   */
  const validatePassword2 = useCallback((password: string, password2: string): string | undefined => {
    if (!password2) {
      return '비밀번호 확인을 입력해주세요';
    }
    if (password !== password2) {
      return '비밀번호가 일치하지 않습니다';
    }
    return undefined;
  }, []);

  /**
   * 전체 폼 검증
   */
  const validateForm = useCallback((): boolean => {
    const errors: FormErrors = {};

    errors.username = validateUsername(formData.username);
    errors.name = validateName(formData.name);
    errors.email = validateEmail(formData.email);
    errors.password = validatePassword(formData.password);
    errors.password2 = validatePassword2(formData.password, formData.password2);

    // 에러가 있는 필드만 저장
    const filteredErrors = Object.fromEntries(
      Object.entries(errors).filter(([_, value]) => value !== undefined)
    );

    setFormErrors(filteredErrors);
    return Object.keys(filteredErrors).length === 0;
  }, [formData, validateUsername, validateName, validateEmail, validatePassword, validatePassword2]);

  /**
   * 폼 데이터 변경 핸들러
   */
  const handleFormChange = useCallback((field: keyof SignUpFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // 실시간 검증 (해당 필드만)
    let fieldError: string | undefined;
    switch (field) {
      case 'username':
        fieldError = validateUsername(value);
        break;
      case 'name':
        fieldError = validateName(value);
        break;
      case 'email':
        fieldError = validateEmail(value);
        break;
      case 'password':
        fieldError = validatePassword(value);
        // 비밀번호가 변경되면 비밀번호 확인도 다시 검증
        if (formData.password2) {
          const password2Error = validatePassword2(value, formData.password2);
          setFormErrors(prev => ({
            ...prev,
            password2: password2Error
          }));
        }
        break;
      case 'password2':
        fieldError = validatePassword2(formData.password, value);
        break;
    }

    setFormErrors(prev => ({
      ...prev,
      [field]: fieldError
    }));
  }, [formData.password, formData.password2, validateUsername, validateName, validateEmail, validatePassword, validatePassword2]);

  /**
   * 폼 초기화
   */
  const resetForm = useCallback(() => {
    setFormData({
      username: '',
      name: '',
      email: '',
      password: '',
      password2: ''
    });
    setFormErrors({});
    setShowPassword(false);
  }, []);

  /**
   * 특정 필드 에러 제거
   */
  const clearFieldError = useCallback((field: keyof FormErrors) => {
    setFormErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  return {
    // 폼 데이터
    formData,
    formErrors,
    
    // UI 상태
    showPassword,
    setShowPassword,
    verificationMethod,
    setVerificationMethod,
    
    // 폼 관리 함수
    handleFormChange,
    validateForm,
    resetForm,
    clearFieldError,
    
    // 개별 검증 함수 (필요시 외부에서 사용)
    validateUsername,
    validateName,
    validateEmail,
    validatePassword,
    validatePassword2
  };
} 
/**
 * 📋 파일 목차 (hooks/useSignUpForm.ts)
 * ========================================
 * 🎯 주요 역할: 단계별 회원가입 폼 상태 관리 훅
 * 
 * 📦 구성 요소:
 * - 라인 1-20: 필수 라이브러리 및 타입 임포트
 * - 라인 22-60: 타입 정의 (단계별 상태 포함)
 * - 라인 62-100: useSignUpForm 훅
 * - 라인 102-140: 폼 상태 관리
 * - 라인 142-200: 단계별 검증 로직
 * 
 * 🔧 주요 기능:
 * - 3단계 회원가입 프로세스 관리
 * - 인증 방식 상태 관리
 * - 폼 데이터 상태 관리
 * - 단계별 폼 검증
 * - 인증 코드 발송/확인 상태 관리
 * 
 * 마지막 수정: 2025년 06월 03일 19시 35분 (KST)
 */

"use client";

import { useState } from 'react';

/**
 * 인증 방식 타입
 */
type VerificationMethod = 'email' | 'sms';

/**
 * 회원가입 단계 타입
 */
type SignUpStep = 'verification' | 'code' | 'account';

/**
 * 인증 상태 타입
 */
type VerificationStatus = 'idle' | 'sending' | 'sent' | 'verifying' | 'verified' | 'error';

/**
 * 폼 데이터 타입
 */
interface FormData {
  // 1단계: 인증 정보
  name: string;
  email: string;
  verificationCode: string;
  
  // 3단계: 계정 정보
  username: string;
  password: string;
  password2: string;
  agreeAll: boolean;
  agreeAge: boolean;
  agreeTerms: boolean;
  agreePrivacy: boolean;
}

/**
 * 폼 에러 타입
 */
interface FormErrors {
  [key: string]: string;
}

/**
 * useSignUpForm 훅 반환 타입
 */
interface UseSignUpFormReturn {
  // 단계 관리
  currentStep: SignUpStep;
  setCurrentStep: (step: SignUpStep) => void;
  
  // 인증 관리
  verificationMethod: VerificationMethod;
  setVerificationMethod: (method: VerificationMethod) => void;
  verificationStatus: VerificationStatus;
  setVerificationStatus: (status: VerificationStatus) => void;
  
  // 폼 상태
  formData: FormData;
  formErrors: FormErrors;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  
  // 폼 핸들러
  handleFormChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCheckboxChange: (name: string, checked: boolean) => void;
  
  // 검증 함수
  validateStep1: () => boolean;
  validateStep2: () => boolean;
  validateStep3: () => boolean;
  
  // 단계 이동
  goToNextStep: () => void;
  goToPrevStep: () => void;
}

/**
 * 단계별 회원가입 폼 상태 관리 훅
 */
export const useSignUpForm = (): UseSignUpFormReturn => {
  // 단계 상태
  const [currentStep, setCurrentStep] = useState<SignUpStep>('verification');
  
  // 인증 상태
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>('email');
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('idle');
  
  // UI 상태
  const [showPassword, setShowPassword] = useState(false);
  
  // 폼 데이터 상태
  const [formData, setFormData] = useState<FormData>({
    // 1단계
    name: '',
    email: '',
    verificationCode: '',
    
    // 3단계
    username: '',
    password: '',
    password2: '',
    agreeAll: false,
    agreeAge: false,
    agreeTerms: false,
    agreePrivacy: false,
  });
  
  // 폼 에러 상태
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  /**
   * 폼 입력 변경 처리
   */
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 해당 필드의 에러 제거
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  /**
   * 체크박스 변경 처리
   */
  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => {
      const newData = { ...prev, [name]: checked };
      
      // 전체 동의 처리
      if (name === 'agreeAll') {
        newData.agreeAge = checked;
        newData.agreeTerms = checked;
        newData.agreePrivacy = checked;
      } else {
        // 개별 항목 변경 시 전체 동의 상태 업데이트
        newData.agreeAll = newData.agreeAge && newData.agreeTerms && newData.agreePrivacy;
      }
      
      return newData;
    });
    
    // 해당 필드의 에러 제거
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  /**
   * 1단계 검증 (이름, 이메일)
   */
  const validateStep1 = (): boolean => {
    const errors: FormErrors = {};

    // 이름 검증
    if (!formData.name.trim()) {
      errors.name = '이름을 입력해주세요';
    } else if (formData.name.length < 2) {
      errors.name = '이름은 2자 이상이어야 합니다';
    }

    // 이메일 검증
    if (!formData.email.trim()) {
      errors.email = '이메일을 입력해주세요';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = '올바른 이메일 형식이 아닙니다';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * 2단계 검증 (인증 코드)
   */
  const validateStep2 = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.verificationCode.trim()) {
      errors.verificationCode = '인증 코드를 입력해주세요';
    } else if (formData.verificationCode.length !== 6) {
      errors.verificationCode = '6자리 인증 코드를 입력해주세요';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * 3단계 검증 (아이디, 비밀번호, 약관)
   */
  const validateStep3 = (): boolean => {
    const errors: FormErrors = {};

    // 사용자명 검증
    if (!formData.username.trim()) {
      errors.username = '아이디를 입력해주세요';
    } else if (formData.username.length < 3) {
      errors.username = '아이디는 3자 이상이어야 합니다';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = '아이디는 영문, 숫자, 언더스코어만 사용 가능합니다';
    }

    // 비밀번호 검증
    if (!formData.password) {
      errors.password = '비밀번호를 입력해주세요';
    } else if (formData.password.length < 6) {
      errors.password = '비밀번호는 6자 이상이어야 합니다';
    }

    // 필수 약관 동의 검증
    if (!formData.agreeAge) {
      errors.agreeAge = '만 14세 이상 동의는 필수입니다';
    }
    if (!formData.agreeTerms) {
      errors.agreeTerms = '이용약관 동의는 필수입니다';
    }
    if (!formData.agreePrivacy) {
      errors.agreePrivacy = '개인정보처리방침 동의는 필수입니다';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * 다음 단계로 이동
   */
  const goToNextStep = () => {
    if (currentStep === 'verification') {
      setCurrentStep('code');
    } else if (currentStep === 'code') {
      setCurrentStep('account');
    }
  };

  /**
   * 이전 단계로 이동
   */
  const goToPrevStep = () => {
    if (currentStep === 'code') {
      setCurrentStep('verification');
    } else if (currentStep === 'account') {
      setCurrentStep('code');
    }
  };

  return {
    // 단계 관리
    currentStep,
    setCurrentStep,
    
    // 인증 관리
    verificationMethod,
    setVerificationMethod,
    verificationStatus,
    setVerificationStatus,
    
    // 폼 상태
    formData,
    formErrors,
    showPassword,
    setShowPassword,
    
    // 폼 핸들러
    handleFormChange,
    handleCheckboxChange,
    
    // 검증 함수
    validateStep1,
    validateStep2,
    validateStep3,
    
    // 단계 이동
    goToNextStep,
    goToPrevStep,
  };
}; 
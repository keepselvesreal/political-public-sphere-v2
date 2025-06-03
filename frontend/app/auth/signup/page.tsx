/**
 * 📋 파일 목차 (app/auth/signup/page.tsx)
 * ========================================
 * 🎯 주요 역할: 단계별 회원가입 페이지 컴포넌트
 * 
 * 📦 구성 요소:
 * - 라인 1-20: 필수 라이브러리 및 컴포넌트 임포트
 * - 라인 22-60: 단계별 처리 로직 (인증 요청, 인증 확인, 회원가입)
 * - 라인 62-100: 메인 SignUpPage 컴포넌트
 * - 라인 102-140: 단계별 컴포넌트 렌더링
 * - 라인 142-180: 네비게이션 버튼
 * 
 * 🔧 주요 기능:
 * - 3단계 회원가입 프로세스 관리
 * - 인증 코드 발송 및 확인
 * - 최종 회원가입 처리
 * - 단계별 폼 검증
 * 
 * 📚 사용된 컴포넌트:
 * - Step1Verification: 1단계 인증 방식 선택
 * - Step2CodeVerification: 2단계 인증 코드 확인
 * - Step3AccountSetup: 3단계 계정 설정
 * 
 * 🎣 사용된 훅:
 * - useSignUpForm: 단계별 폼 상태 관리
 * 
 * 마지막 수정: 2025년 06월 03일 19시 55분 (KST)
 */

"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ShoppingBag, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useSignUpForm } from '@/hooks/useSignUpForm';
import Step1Verification from '@/components/auth/Step1Verification';
import Step2CodeVerification from '@/components/auth/Step2CodeVerification';
import Step3AccountSetup from '@/components/auth/Step3AccountSetup';

/**
 * 단계별 회원가입 페이지 컴포넌트
 */
export default function SignUpPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  // 단계별 회원가입 폼 관리 훅
  const {
    currentStep,
    verificationMethod,
    setVerificationMethod,
    verificationStatus,
    setVerificationStatus,
    formData,
    formErrors,
    showPassword,
    setShowPassword,
    handleFormChange,
    handleCheckboxChange,
    validateStep1,
    validateStep2,
    validateStep3,
    goToNextStep,
    goToPrevStep,
  } = useSignUpForm();

  /**
   * 1단계: 인증 코드 요청 처리
   */
  const handleRequestVerification = async () => {
    if (!validateStep1()) {
      toast({
        title: "입력 오류",
        description: "이름과 이메일을 올바르게 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setVerificationStatus('sending');
    setError('');

    try {
      console.log('🚀 인증 코드 요청:', {
        name: formData.name,
        email: formData.email,
        method: verificationMethod
      });

      // 실제 API 호출 시뮬레이션 (임시)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setVerificationStatus('sent');
      goToNextStep();
      
      toast({
        title: "인증 코드 발송 완료",
        description: `${formData.email}로 인증 코드를 발송했습니다.`,
      });
      
    } catch (error) {
      console.error('❌ 인증 코드 요청 오류:', error);
      setVerificationStatus('error');
      setError('인증 코드 발송에 실패했습니다. 다시 시도해주세요.');
      toast({
        title: "인증 코드 발송 실패",
        description: "다시 시도해주세요.",
        variant: "destructive",
      });
    }
  };

  /**
   * 2단계: 인증 코드 확인 처리
   */
  const handleVerifyCode = async () => {
    if (!validateStep2()) {
      toast({
        title: "입력 오류",
        description: "6자리 인증 코드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setVerificationStatus('verifying');
    setError('');

    try {
      console.log('🔍 인증 코드 확인:', {
        email: formData.email,
        code: formData.verificationCode
      });

      // 실제 API 호출 시뮬레이션 (임시)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setVerificationStatus('verified');
      goToNextStep();
      
      toast({
        title: "인증 완료",
        description: "이메일 인증이 완료되었습니다.",
      });
      
    } catch (error) {
      console.error('❌ 인증 코드 확인 오류:', error);
      setVerificationStatus('error');
      setError('인증 코드가 올바르지 않습니다. 다시 확인해주세요.');
      toast({
        title: "인증 실패",
        description: "인증 코드를 다시 확인해주세요.",
        variant: "destructive",
      });
    }
  };

  /**
   * 3단계: 최종 회원가입 처리
   */
  const handleCompleteSignUp = async () => {
    if (!validateStep3()) {
      toast({
        title: "입력 오류",
        description: "모든 필수 항목을 입력하고 약관에 동의해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('🚀 회원가입 완료:', {
        name: formData.name,
        email: formData.email,
        username: formData.email, // 이메일을 아이디로 사용
        password: formData.password,
      });

      // 회원가입 API 호출
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.email, // 이메일을 아이디로 사용
          name: formData.name,
          email: formData.email,
          password: formData.password,
          password2: formData.password, // 비밀번호 확인은 동일하게
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '회원가입에 실패했습니다');
      }
      
      console.log('✅ 회원가입 완료');
      
      toast({
        title: "회원가입이 완료되었습니다!",
        description: "로그인하여 서비스를 이용해보세요!",
      });
      
      router.push('/auth/login');
      
    } catch (error) {
      console.error('❌ 회원가입 오류:', error);
      const errorMessage = error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다';
      setError(errorMessage);
      toast({
        title: "회원가입 실패",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 단계별 제목 반환
   */
  const getStepTitle = () => {
    switch (currentStep) {
      case 'verification':
        return '인증 방식 선택';
      case 'code':
        return '인증 코드 확인';
      case 'account':
        return '회원가입 완료';
      default:
        return '회원가입';
    }
  };

  /**
   * 단계별 컴포넌트 렌더링
   */
  const renderStepContent = () => {
    switch (currentStep) {
      case 'verification':
        return (
          <Step1Verification
            verificationMethod={verificationMethod}
            setVerificationMethod={setVerificationMethod}
            verificationStatus={verificationStatus}
            formData={{ name: formData.name, email: formData.email }}
            formErrors={formErrors}
            onChange={handleFormChange}
            onRequestVerification={handleRequestVerification}
          />
        );
      case 'code':
        return (
          <Step2CodeVerification
            email={formData.email}
            verificationStatus={verificationStatus}
            formData={{ verificationCode: formData.verificationCode }}
            formErrors={formErrors}
            onChange={handleFormChange}
            onVerifyCode={handleVerifyCode}
          />
        );
      case 'account':
        return (
          <Step3AccountSetup
            email={formData.email}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            formData={{
              username: formData.username,
              password: formData.password,
              agreeAll: formData.agreeAll,
              agreeAge: formData.agreeAge,
              agreeTerms: formData.agreeTerms,
              agreePrivacy: formData.agreePrivacy,
            }}
            formErrors={formErrors}
            onChange={handleFormChange}
            onCheckboxChange={handleCheckboxChange}
          />
        );
      default:
        return null;
    }
  };

  /**
   * 다음 단계 버튼 처리
   */
  const handleNextStep = () => {
    if (currentStep === 'account') {
      handleCompleteSignUp();
    } else {
      // 다른 단계는 각 컴포넌트에서 직접 처리
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-12 animate-fade-in">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          {/* 회원가입 폼 카드 */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-lg shadow-sm p-8"
          >
            {/* 페이지 헤더 */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-4">
                <ShoppingBag size={32} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{getStepTitle()}</h1>
              <p className="text-slate-500 mt-2">정치적 공론장에 참여하세요</p>
            </div>
            
            {/* 단계별 컨텐츠 */}
            <div className="mb-6">
              {renderStepContent()}
            </div>
            
            {/* 서버 에러 메시지 표시 */}
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-6">
                {error}
              </div>
            )}
            
            {/* 액션 버튼들 */}
            <div className="flex gap-3 pt-4">
              {/* 뒤로가기 버튼 */}
              {currentStep !== 'verification' && (
                <button
                  type="button"
                  onClick={goToPrevStep}
                  className="btn-secondary flex-1 flex items-center justify-center"
                >
                  <ChevronLeft size={18} className="mr-1" /> 뒤로
                </button>
              )}
              
              {/* 홈으로 버튼 (첫 단계에서만) */}
              {currentStep === 'verification' && (
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="btn-secondary flex-1 flex items-center justify-center"
                >
                  <ChevronLeft size={18} className="mr-1" /> 홈으로
                </button>
              )}
              
              {/* 회원가입 완료 버튼 (마지막 단계에서만) */}
              {currentStep === 'account' && (
                <button
                  type="button"
                  onClick={handleCompleteSignUp}
                  disabled={isLoading}
                  className="btn-primary flex-1 flex items-center justify-center"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      가입 처리중...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      회원가입 완료 <ArrowRight size={18} className="ml-2" />
                    </span>
                  )}
                </button>
              )}
            </div>
          </motion.div>
          
          {/* 로그인 링크 */}
          <div className="mt-6 text-center">
            <p className="text-slate-600">
              이미 계정이 있으신가요?{' '}
              <Link href="/auth/login" className="text-blue-600 font-medium hover:text-blue-700">
                로그인
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 
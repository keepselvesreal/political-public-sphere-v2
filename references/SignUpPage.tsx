/**
 * 📋 파일 목차 (pages/SignUpPage.tsx)
 * ========================================
 * 🎯 주요 역할: 회원가입 페이지의 메인 컴포넌트
 * 
 * 📦 구성 요소:
 * - 라인 1-15: 필수 라이브러리 및 컴포넌트 임포트
 * - 라인 17-45: 회원가입 제출 처리 로직
 * - 라인 47-80: 메인 SignUpPage 컴포넌트
 * - 라인 82-120: 페이지 레이아웃 및 폼 렌더링
 * 
 * 🔧 주요 기능:
 * - 회원가입 폼 상태 관리 (useSignUpForm 훅 사용)
 * - 회원가입 API 호출 및 에러 처리
 * - 이메일 인증 방식 선택 시 인증 안내 (이메일 중복 안내 포함)
 * - 로딩 상태 표시
 * 
 * 📚 사용된 컴포넌트:
 * - SignUpForm: 회원가입 폼 UI
 * 
 * 🎣 사용된 훅:
 * - useSignUpForm: 폼 상태 관리
 * - useAuth: 사용자 인증
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, ShoppingBag, ChevronLeft, Mail } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSignUpForm } from '../hooks/useSignUpForm';
import SignUpForm from '../components/auth/SignUpForm';
import toast from 'react-hot-toast';

/**
 * 회원가입 페이지 컴포넌트
 * 사용자 회원가입을 처리하는 메인 페이지
 * @returns JSX 엘리먼트
 */
const SignUpPage: React.FC = () => {
  // 전역 상태 및 유틸리티 훅
  const { signup, loading, error } = useAuth();
  const navigate = useNavigate();
  
  // 회원가입 폼 관리 훅
  const {
    verificationMethod,
    setVerificationMethod,
    showPassword,
    setShowPassword,
    formData,
    formErrors,
    handleFormChange,
    validateForm
  } = useSignUpForm();

  /**
   * 회원가입 폼 제출 처리 함수
   * @param e 폼 제출 이벤트
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 폼 유효성 검사
    if (!validateForm()) {
      toast.error('입력 정보를 확인해주세요.');
      return;
    }
    
    try {
      console.log('🚀 회원가입 시작:', {
        username: formData.username,
        email: formData.email,
        verificationMethod
      });
      
      // 회원가입 API 호출
      await signup({
        username: formData.username,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        password2: formData.password,
      });
      
      // 회원가입 완료 후 인증 상태 확인
      console.log('✅ 회원가입 완료 - 인증 상태 확인:');
      const accessToken = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      const user = localStorage.getItem('user');
      
      console.log('  - Access Token:', accessToken ? '저장됨' : '없음');
      console.log('  - Refresh Token:', refreshToken ? '저장됨' : '없음');
      console.log('  - User Info:', user ? '저장됨' : '없음');
      
      if (accessToken && user) {
        console.log('🎉 자동 로그인 성공! 사용자가 인증된 상태입니다.');
      } else {
        console.log('⚠️ 자동 로그인 실패 - 수동 로그인이 필요할 수 있습니다.');
      }
      
      // 성공 시 인증 방식에 따른 안내
      if (verificationMethod === 'email') {
        toast.success('회원가입이 완료되었습니다!');
        navigate('/', { 
          state: { 
            message: '회원가입이 성공적으로 완료되었습니다. 로그인하여 서비스를 이용해보세요!',
            showWelcomeMessage: true 
          } 
        });
      } else {
        toast.success('회원가입이 완료되었습니다!');
        navigate('/');
      }
      
    } catch (error) {
      console.error('❌ 회원가입 오류:', error);
      toast.error('회원가입 중 오류가 발생했습니다.');
    }
  };

  // 디버깅 정보 (개발 환경에서만)
  if (import.meta.env.DEV) {
    console.log('🔍 SignUpPage 상태:', {
      verificationMethod,
      formDataKeys: Object.keys(formData),
      hasErrors: Object.keys(formErrors).length > 0
    });
  }

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
              <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-100 text-accent-600 rounded-full mb-4">
                <ShoppingBag size={32} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">회원가입</h1>
              <p className="text-slate-500 mt-2">쇼핑몰 커뮤니티에 참여하세요</p>
            </div>
            
            {/* 이메일 인증 안내 (이메일 인증 방식 선택 시) */}
            {verificationMethod === 'email' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 text-blue-800 mb-2">
                  <Mail size={16} />
                  <h3 className="font-semibold text-sm">이메일 인증 기반 회원가입</h3>
                </div>
                <div className="text-sm text-blue-700 space-y-2">
                  <p>
                    1단계: 이메일 주소로 인증 코드를 받아 인증을 완료하세요.<br/>
                    2단계: 인증 완료 후 아이디, 비밀번호, 약관 동의를 진행하여 회원가입을 완료하세요.
                  </p>
                  <div className="bg-blue-100 border border-blue-300 rounded p-2 mt-2">
                    <p className="text-xs text-blue-600">
                      💡 <strong>참고:</strong> 이미 가입된 이메일 주소로는 인증 코드가 발송되지 않습니다. 
                      기존 계정이 있다면 로그인을 시도해보세요.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* 회원가입 폼 */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <SignUpForm
                verificationMethod={verificationMethod}
                setVerificationMethod={setVerificationMethod}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                formData={formData}
                formErrors={formErrors}
                onChange={handleFormChange}
              />
              
              {/* 서버 에러 메시지 표시 */}
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}
              
              {/* 액션 버튼들 */}
              <div className="flex gap-3 pt-4">
                {/* 뒤로가기 버튼 */}
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="btn-secondary flex-1 flex items-center justify-center"
                >
                  <ChevronLeft size={18} className="mr-1" /> 뒤로
                </button>
                
                {/* 회원가입 완료 버튼 */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex-1 flex items-center justify-center"
                >
                  {loading ? (
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
              </div>
            </form>
          </motion.div>
          
          {/* 로그인 링크 */}
          <div className="mt-6 text-center">
            <p className="text-slate-600">
              이미 계정이 있으신가요?{' '}
              <Link to="/login" className="text-accent-600 font-medium hover:text-accent-700">
                로그인
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
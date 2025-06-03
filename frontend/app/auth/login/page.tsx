/**
 * 📋 파일 목차 (app/auth/login/page.tsx)
 * ========================================
 * 🎯 주요 역할: 로그인 페이지 컴포넌트
 * 
 * 📦 구성 요소:
 * - 라인 1-20: 필수 라이브러리 및 컴포넌트 임포트
 * - 라인 22-40: 폼 데이터 타입 및 초기값 정의
 * - 라인 42-80: 로그인 페이지 컴포넌트
 * - 라인 82-120: 폼 제출 처리 로직
 * - 라인 122-180: UI 렌더링 (헤더, 폼, 버튼)
 * 
 * 🔧 주요 기능:
 * - 로그인 폼 상태 관리
 * - 이메일/사용자명 로그인 지원
 * - 구글 OAuth 로그인 지원
 * - 로그인 API 연동
 * - 성공 시 토큰 저장 및 리다이렉트
 * - 실시간 폼 검증
 * 
 * 마지막 수정: 2025년 06월 03일 19시 10분 (KST)
 */

"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { signIn } from 'next-auth/react';

/**
 * 로그인 폼 데이터 타입
 */
interface LoginFormData {
  username: string; // 아이디
  password: string;
  rememberMe: boolean;
}

/**
 * 폼 에러 타입
 */
interface FormErrors {
  [key: string]: string | undefined;
}

/**
 * 로그인 페이지 컴포넌트
 */
export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { login } = useAuth();
  
  // 폼 상태 관리
  const [formData, setFormData] = useState<LoginFormData>({
    username: '',
    password: '',
    rememberMe: false,
  });
  
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  /**
   * 폼 유효성 검사
   */
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * 폼 입력 변경 처리
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  /**
   * 로그인 폼 제출 처리
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const result = await login(formData.username, formData.password);

      if (!result.success) {
        throw new Error(result.error || '로그인에 실패했습니다');
      }

      toast({
        title: "로그인 성공!",
        description: "환영합니다.",
      });

      // 홈페이지로 리다이렉트
      router.push('/');

    } catch (error) {
      console.error('로그인 오류:', error);
      toast({
        title: "로그인 실패",
        description: error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 게스트로 계속하기 (임시 기능)
   */
  const handleGuestContinue = () => {
    toast({
      title: "준비 중인 기능",
      description: "게스트 기능은 현재 개발 중입니다.",
      variant: "destructive",
    });
  };

  /**
   * 구글 로그인 처리
   */
  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const result = await signIn('google', { 
        callbackUrl: '/',
        redirect: false 
      });
      
      if (result?.error) {
        throw new Error(result.error);
      }
      
      toast({
        title: "구글 로그인 성공!",
        description: "환영합니다.",
      });
      
      router.push('/');
    } catch (error) {
      console.error('구글 로그인 오류:', error);
      toast({
        title: "구글 로그인 실패",
        description: error instanceof Error ? error.message : '구글 로그인 중 오류가 발생했습니다',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-12 animate-fade-in">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-lg shadow-sm p-8"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-4">
                <LogIn size={32} />
              </div>
              <h1 className="text-2xl font-bold">Welcome Back</h1>
              <p className="text-slate-500 mt-2">Sign in to your account to continue</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">
                  아이디
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  autoComplete="username"
                  placeholder="아이디를 입력하세요"
                  value={formData.username}
                  onChange={handleChange}
                  className={`input-field ${formErrors.username ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                />
                {formErrors.username && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.username}</p>
                )}
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    className={`input-field pr-10 ${formErrors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.password}</p>
                )}
              </div>
              
              <div className="flex items-center justify-between">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-slate-700">Remember me</span>
                </label>
              </div>
              
              <div className="pt-2 space-y-3">
                {/* 구글 로그인 버튼 */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      구글 로그인 중...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      구글 계정으로 로그인
                    </span>
                  )}
                </button>

                {/* 구분선 */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">또는</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary w-full flex items-center justify-center"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing In...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      Sign In <ArrowRight size={18} className="ml-2" />
                    </span>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={handleGuestContinue}
                  className="btn-secondary w-full"
                >
                  Continue as Guest
                </button>
                <div className="mt-4 flex justify-between text-sm">
                  <Link href="/auth/signup" className="text-blue-600 hover:text-blue-700">회원가입</Link>
                  <Link href="/auth/find-account" className="text-blue-600 hover:text-blue-700">아이디 찾기</Link>
                  <Link href="/auth/find-account" className="text-blue-600 hover:text-blue-700">비밀번호 찾기</Link>
                </div>
              </div>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-slate-600">
                Don't have an account?{' '}
                <Link href="/auth/signup" className="text-blue-600 font-medium hover:text-blue-700">
                  Sign Up
                </Link>
              </p>
            </div>
          </motion.div>
          
          {/* Demo Account Notice */}
          <div className="mt-6 bg-slate-100 rounded-lg p-4 text-sm text-slate-700 text-center">
            <p>
              <strong>Demo Account:</strong> Use any username and password to log in.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 
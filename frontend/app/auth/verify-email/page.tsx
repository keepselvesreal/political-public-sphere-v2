/**
 * 📋 파일 목차 (app/auth/verify-email/page.tsx)
 * ========================================
 * 🎯 주요 역할: 이메일 인증 페이지 컴포넌트
 * 
 * 📦 구성 요소:
 * - 라인 1-20: 필수 라이브러리 및 컴포넌트 임포트
 * - 라인 22-40: 상태 타입 및 초기값 정의
 * - 라인 42-80: 이메일 인증 페이지 컴포넌트
 * - 라인 82-120: 인증 코드 발송 처리
 * - 라인 122-160: 인증 코드 확인 처리
 * - 라인 162-250: UI 렌더링 (폼, 버튼, 상태 표시)
 * 
 * 🔧 주요 기능:
 * - 인증 코드 발송 요청
 * - 6자리 인증 코드 입력 및 검증
 * - 발송 빈도 제한 (1분) 표시
 * - 성공/실패 상태 표시
 * - 자동 리다이렉트
 * 
 * 마지막 수정: 2025년 06월 03일 19시 15분 (KST)
 */

"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Home, LogIn, CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

/**
 * 인증 상태 타입
 */
type VerificationStatus = 'input' | 'sending' | 'waiting' | 'verifying' | 'success' | 'error';

/**
 * 이메일 인증 페이지 컴포넌트
 */
export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  // URL에서 이메일 파라미터 가져오기
  const emailParam = searchParams.get('email') || '';
  
  // 상태 관리
  const [status, setStatus] = useState<VerificationStatus>('input');
  const [email, setEmail] = useState(emailParam);
  const [verificationCode, setVerificationCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  /**
   * 카운트다운 타이머 효과
   */
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  /**
   * 인증 코드 발송 처리
   */
  const handleSendVerificationCode = async () => {
    if (!email.trim()) {
      toast({
        title: "입력 오류",
        description: "이메일을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setStatus('sending');
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '인증 코드 발송에 실패했습니다');
      }

      setStatus('waiting');
      setCountdown(60); // 1분 대기
      toast({
        title: "인증 코드 발송 완료",
        description: "이메일을 확인하여 6자리 인증 코드를 입력해주세요.",
      });

    } catch (error) {
      console.error('인증 코드 발송 오류:', error);
      setStatus('error');
      const errorMsg = error instanceof Error ? error.message : '인증 코드 발송 중 오류가 발생했습니다';
      setErrorMessage(errorMsg);
      toast({
        title: "발송 실패",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  /**
   * 인증 코드 확인 처리
   */
  const handleVerifyCode = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      toast({
        title: "입력 오류",
        description: "6자리 인증 코드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setStatus('verifying');
    setErrorMessage('');

    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, token: verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '인증에 실패했습니다');
      }

      setStatus('success');
      toast({
        title: "이메일 인증 완료!",
        description: "계정이 성공적으로 활성화되었습니다.",
      });

      // 3초 후 로그인 페이지로 이동
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);

    } catch (error) {
      console.error('인증 확인 오류:', error);
      setStatus('error');
      const errorMsg = error instanceof Error ? error.message : '인증 확인 중 오류가 발생했습니다';
      setErrorMessage(errorMsg);
      toast({
        title: "인증 실패",
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  /**
   * 인증 코드 입력 변경 처리
   */
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(value);
  };

  /**
   * 홈페이지로 이동
   */
  const handleGoHome = () => {
    router.push('/');
  };

  /**
   * 로그인 페이지로 이동
   */
  const handleGoLogin = () => {
    router.push('/auth/login');
  };

  /**
   * 회원가입 페이지로 이동 (재시도)
   */
  const handleRetry = () => {
    router.push('/auth/signup');
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-screen flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"
      >
        {/* 헤더 섹션 */}
        <div className={`px-8 py-12 text-center ${
          status === 'success' 
            ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
            : status === 'error'
            ? 'bg-gradient-to-r from-red-500 to-rose-600'
            : 'bg-gradient-to-r from-blue-500 to-indigo-600'
        } text-white`}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-20 h-20 bg-white bg-opacity-20 rounded-full mb-6"
          >
            {status === 'success' ? (
              <CheckCircle size={40} />
            ) : status === 'error' ? (
              <XCircle size={40} />
            ) : status === 'sending' || status === 'verifying' ? (
              <div className="animate-spin">
                <RefreshCw size={40} />
              </div>
            ) : (
              <Mail size={40} />
            )}
          </motion.div>
          
          <h1 className="text-3xl font-bold mb-2">
            {status === 'success' ? '인증 완료!' : 
             status === 'error' ? '인증 실패' : 
             status === 'sending' ? '발송 중...' :
             status === 'verifying' ? '인증 중...' :
             '이메일 인증'}
          </h1>
          
          <p className="text-lg opacity-90">
            {status === 'success' 
              ? '이메일 인증이 성공적으로 완료되었습니다' 
              : status === 'error'
              ? '이메일 인증 처리 중 문제가 발생했습니다'
              : status === 'sending'
              ? '인증 코드를 발송하고 있습니다'
              : status === 'verifying'
              ? '인증 코드를 확인하고 있습니다'
              : '이메일로 발송된 인증 코드를 입력하세요'
            }
          </p>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="px-8 py-8">
          {status === 'success' ? (
            <div className="text-center">
              <div className="mb-6">
                <p className="text-lg text-gray-700 mb-4">
                  축하합니다! 정치적 공론장의 모든 서비스를 이용하실 수 있습니다.
                </p>
                
                {email && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-green-800 mb-2">인증된 계정 정보</h3>
                    <p className="text-sm text-green-700">
                      <strong>이메일:</strong> {email}
                    </p>
                  </div>
                )}
                
                {/* 자동 리다이렉트 안내 */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-700">
                    <strong>3초</strong> 후 자동으로 로그인 페이지로 이동합니다.
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={handleGoLogin}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <LogIn size={20} />
                  로그인하기
                </button>
                
                <button
                  onClick={handleGoHome}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <Home size={20} />
                  홈페이지로 이동
                </button>
              </div>
            </div>
          ) : status === 'error' ? (
            <div className="text-center">
              <div className="mb-6">
                <p className="text-lg text-gray-700 mb-4">
                  이메일 인증에 실패했습니다.
                </p>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 text-red-800 mb-2">
                    <AlertTriangle size={16} />
                    <h4 className="font-semibold">오류 상세 정보</h4>
                  </div>
                  <p className="text-sm text-red-700">{errorMessage}</p>
                </div>
                
                {/* 해결 방법 안내 */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">해결 방법</h4>
                  <ul className="text-sm text-yellow-700 text-left space-y-1">
                    <li>• 이메일에서 최신 인증 링크를 사용해주세요</li>
                    <li>• 회원가입 페이지에서 인증 코드를 직접 입력해보세요</li>
                    <li>• 문제가 지속되면 고객센터로 문의해주세요</li>
                  </ul>
                </div>
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={handleRetry}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Mail size={20} />
                  다시 시도하기
                </button>
                
                <button
                  onClick={handleGoHome}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <Home size={20} />
                  홈페이지로 이동
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              {/* 이메일 입력 */}
              <div className="mb-6">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  이메일 주소
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  disabled={status !== 'input'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>

              {/* 인증 코드 발송 버튼 */}
              {status === 'input' && (
                <button 
                  onClick={handleSendVerificationCode}
                  disabled={!email.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mb-6"
                >
                  <Mail size={20} />
                  인증 코드 발송
                </button>
              )}

              {/* 발송 중 상태 표시 */}
              {status === 'sending' && (
                <div className="mb-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-600">인증 코드를 발송하고 있습니다...</p>
                </div>
              )}

              {/* 인증 코드 입력 (발송 후) */}
              {(status === 'waiting' || status === 'verifying') && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-blue-800 text-sm">
                      <strong>{email}</strong>로 6자리 인증 코드를 발송했습니다.
                      이메일을 확인하여 코드를 입력해주세요.
                    </p>
                  </div>

                  <div className="mb-6">
                    <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                      인증 코드 (6자리)
                    </label>
                    <input
                      type="text"
                      id="code"
                      value={verificationCode}
                      onChange={handleCodeChange}
                      placeholder="123456"
                      maxLength={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg tracking-widest"
                      disabled={status === 'verifying'}
                    />
                  </div>

                  {/* 재발송 대기 시간 */}
                  {countdown > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
                      <p className="text-yellow-800 text-sm">
                        인증 코드 재발송까지 <strong>{countdown}초</strong> 남았습니다.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3 mb-6">
                    {/* 재발송 버튼 */}
                    <button 
                      onClick={handleSendVerificationCode}
                      disabled={countdown > 0 || status === 'verifying'}
                      className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      재발송
                    </button>
                    
                    {/* 인증 확인 버튼 */}
                    <button 
                      onClick={handleVerifyCode}
                      disabled={verificationCode.length !== 6 || status === 'verifying'}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {status === 'verifying' ? (
                        <span className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          확인 중...
                        </span>
                      ) : (
                        '인증 확인'
                      )}
                    </button>
                  </div>
                </>
              )}

              {/* 뒤로가기 버튼 */}
              <button 
                onClick={() => router.back()}
                className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors duration-200"
              >
                뒤로
              </button>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="bg-gray-50 px-8 py-4 text-center border-t">
          <p className="text-sm text-gray-600">
            <strong>정치적 공론장</strong> - 정치 토론 플랫폼
          </p>
          <p className="text-xs text-gray-500 mt-1">
            문제가 지속되나요?{' '}
            <Link href="/auth/signup" className="text-blue-600 hover:text-blue-700">
              회원가입 다시 시도
            </Link>
            {' 또는 '}
            <Link href="/auth/login" className="text-blue-600 hover:text-blue-700">
              로그인
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
} 
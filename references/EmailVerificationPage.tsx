/**
 * 📋 파일 목차 (pages/EmailVerificationPage.tsx)
 * ========================================
 * 🎯 주요 역할: 이메일 인증 결과를 표시하는 페이지
 * 
 * 📦 구성 요소:
 * - 라인 1-15: 필수 라이브러리 및 컴포넌트 임포트
 * - 라인 17-45: URL 파라미터 파싱 및 상태 관리
 * - 라인 47-80: 메인 EmailVerificationPage 컴포넌트
 * - 라인 82-150: 성공/실패 상태별 UI 렌더링
 * 
 * 🔧 주요 기능:
 * - URL 쿼리 파라미터에서 인증 결과 파싱
 * - 성공/실패 상태별 다른 UI 표시
 * - 홈페이지/로그인 페이지로 이동 버튼 제공
 * - 반응형 디자인 및 애니메이션 효과
 * - 자동 리다이렉트 기능 (성공 시)
 * 
 * 📚 사용된 컴포넌트:
 * - motion: 애니메이션 효과
 * - Lucide React: 아이콘
 * 
 * 🎣 사용된 훅:
 * - useSearchParams: URL 쿼리 파라미터 파싱
 * - useNavigate: 페이지 이동
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Home, LogIn, Mail, AlertTriangle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * 인증 상태 타입 정의
 */
type VerificationStatus = 'success' | 'error' | 'loading';

/**
 * 에러 메시지 매핑
 */
const ERROR_MESSAGES = {
  invalid_code: '잘못된 인증 코드입니다.',
  user_not_found: '사용자를 찾을 수 없습니다.',
  server_error: '서버 오류가 발생했습니다.',
  expired: '인증 코드가 만료되었습니다.',
  default: '인증 처리 중 오류가 발생했습니다.'
};

/**
 * 이메일 인증 결과 페이지 컴포넌트
 * Django에서 리다이렉트된 인증 결과를 표시
 * @returns JSX 엘리먼트
 */
const EmailVerificationPage: React.FC = () => {
  // URL 파라미터 및 네비게이션 훅
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // 컴포넌트 상태
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [userInfo, setUserInfo] = useState<{
    email?: string;
    name?: string;
  }>({});
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(0);

  /**
   * URL 파라미터에서 인증 결과 파싱
   */
  useEffect(() => {
    const statusParam = searchParams.get('status');
    const email = searchParams.get('email');
    const name = searchParams.get('name');
    const messageParam = searchParams.get('message');

    // 사용자 정보 설정
    setUserInfo({ email: email || undefined, name: name || undefined });

    // 상태별 처리
    if (statusParam === 'success') {
      setStatus('success');
      toast.success('이메일 인증이 완료되었습니다!');
      
      // 성공 시 5초 후 자동으로 홈페이지로 이동
      setCountdown(5);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    } else if (statusParam === 'error') {
      setStatus('error');
      const errorMsg = messageParam ? ERROR_MESSAGES[messageParam as keyof typeof ERROR_MESSAGES] || ERROR_MESSAGES.default : ERROR_MESSAGES.default;
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } else {
      // 잘못된 접근
      setStatus('error');
      setErrorMessage('잘못된 접근입니다.');
    }
  }, [searchParams, navigate]);

  /**
   * 홈페이지로 이동
   */
  const handleGoHome = () => {
    navigate('/');
  };

  /**
   * 로그인 페이지로 이동
   */
  const handleGoLogin = () => {
    navigate('/login');
  };

  /**
   * 회원가입 페이지로 이동 (재시도)
   */
  const handleRetry = () => {
    navigate('/signup');
  };

  // 디버깅 정보 (개발 환경에서만)
  if (import.meta.env.DEV) {
    console.log('🔍 EmailVerificationPage 상태:', {
      status,
      userInfo,
      errorMessage,
      countdown,
      searchParams: Object.fromEntries(searchParams)
    });
  }

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
            ) : (
              <div className="animate-spin">
                <RefreshCw size={40} />
              </div>
            )}
          </motion.div>
          
          <h1 className="text-3xl font-bold mb-2">
            {status === 'success' ? '인증 완료!' : status === 'error' ? '인증 실패' : '처리 중...'}
          </h1>
          
          <p className="text-lg opacity-90">
            {status === 'success' 
              ? '이메일 인증이 성공적으로 완료되었습니다' 
              : status === 'error'
              ? '이메일 인증 처리 중 문제가 발생했습니다'
              : '인증 결과를 확인하고 있습니다'
            }
          </p>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="px-8 py-8">
          {status === 'success' ? (
            <div className="text-center">
              <div className="mb-6">
                <p className="text-lg text-gray-700 mb-4">
                  축하합니다! 대선굿즈의 모든 서비스를 이용하실 수 있습니다.
                </p>
                
                {userInfo.email && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <h3 className="font-semibold text-green-800 mb-2">인증된 계정 정보</h3>
                    {userInfo.name && (
                      <p className="text-sm text-green-700">
                        <strong>이름:</strong> {userInfo.name}
                      </p>
                    )}
                    <p className="text-sm text-green-700">
                      <strong>이메일:</strong> {userInfo.email}
                    </p>
                  </div>
                )}
                
                {/* 자동 리다이렉트 안내 */}
                {countdown > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-700">
                      <strong>{countdown}초</strong> 후 자동으로 홈페이지로 이동합니다.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="space-y-3">
                <button
                  onClick={handleGoHome}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Home size={20} />
                  홈페이지로 이동
                </button>
                
                <button
                  onClick={handleGoLogin}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <LogIn size={20} />
                  로그인하기
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">인증 결과를 확인하고 있습니다...</p>
              <p className="text-sm text-gray-500 mt-2">잠시만 기다려주세요.</p>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="bg-gray-50 px-8 py-4 text-center border-t">
          <p className="text-sm text-gray-600">
            <strong>대선굿즈</strong> - 정치 굿즈 전문 쇼핑몰
          </p>
          <p className="text-xs text-gray-500 mt-1">
            문의사항이 있으시면{' '}
            <Link to="/contact" className="text-blue-600 hover:text-blue-700">
              고객센터
            </Link>
            로 연락해주세요.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default EmailVerificationPage; 
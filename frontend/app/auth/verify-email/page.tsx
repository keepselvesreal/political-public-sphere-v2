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
 * 마지막 수정: 2025년 06월 03일 18시 35분 (KST)
 */

"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, ChevronLeft, ArrowRight, CheckCircle, XCircle, RefreshCw, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
   * 상태별 아이콘 렌더링
   */
  const renderStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle size={40} className="text-green-600" />;
      case 'error':
        return <XCircle size={40} className="text-red-600" />;
      case 'sending':
      case 'verifying':
        return <RefreshCw size={40} className="text-blue-600 animate-spin" />;
      default:
        return <Mail size={40} className="text-blue-600" />;
    }
  };

  /**
   * 상태별 제목 렌더링
   */
  const renderStatusTitle = () => {
    switch (status) {
      case 'success':
        return '인증 완료!';
      case 'error':
        return '인증 실패';
      case 'sending':
        return '인증 코드 발송 중...';
      case 'verifying':
        return '인증 확인 중...';
      case 'waiting':
        return '인증 코드 입력';
      default:
        return '이메일 인증';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4 mx-auto">
                {renderStatusIcon()}
              </div>
              <CardTitle className="text-2xl">{renderStatusTitle()}</CardTitle>
              <CardDescription>
                {status === 'success' 
                  ? '이메일 인증이 성공적으로 완료되었습니다'
                  : status === 'error'
                  ? '인증 처리 중 문제가 발생했습니다'
                  : '이메일로 발송된 인증 코드를 입력하세요'
                }
              </CardDescription>
            </CardHeader>

            <CardContent>
              {status === 'success' ? (
                // 성공 상태
                <div className="text-center space-y-4">
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      계정이 성공적으로 활성화되었습니다. 이제 모든 서비스를 이용하실 수 있습니다.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-3">
                    <Button 
                      onClick={() => router.push('/auth/login')}
                      className="w-full"
                    >
                      로그인하기
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={() => router.push('/')}
                      className="w-full"
                    >
                      홈페이지로 이동
                    </Button>
                  </div>
                </div>
              ) : status === 'error' ? (
                // 에러 상태
                <div className="space-y-4">
                  <Alert variant="destructive">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      {errorMessage}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-3">
                    <Button 
                      onClick={() => {
                        setStatus('input');
                        setErrorMessage('');
                        setVerificationCode('');
                      }}
                      className="w-full"
                    >
                      다시 시도하기
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={() => router.push('/auth/signup')}
                      className="w-full"
                    >
                      회원가입으로 돌아가기
                    </Button>
                  </div>
                </div>
              ) : (
                // 입력/대기 상태
                <div className="space-y-4">
                  {/* 이메일 입력 */}
                  <div className="space-y-2">
                    <Label htmlFor="email">이메일</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                      disabled={status !== 'input'}
                    />
                  </div>

                  {/* 인증 코드 발송 버튼 */}
                  {(status === 'input') && (
                    <Button 
                      onClick={handleSendVerificationCode}
                      disabled={!email.trim()}
                      className="w-full"
                    >
                      <span className="flex items-center">
                        <Mail className="h-4 w-4 mr-2" />
                        인증 코드 발송
                      </span>
                    </Button>
                  )}

                  {/* 발송 중 상태 표시 */}
                  {status === 'sending' && (
                    <Button disabled className="w-full">
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      인증 코드 발송 중...
                    </Button>
                  )}

                  {/* 인증 코드 입력 (발송 후) */}
                  {(status === 'waiting' || status === 'verifying') && (
                    <>
                      <Alert>
                        <Mail className="h-4 w-4" />
                        <AlertDescription>
                          <strong>{email}</strong>로 6자리 인증 코드를 발송했습니다.
                          이메일을 확인하여 코드를 입력해주세요.
                        </AlertDescription>
                      </Alert>

                      <div className="space-y-2">
                        <Label htmlFor="code">인증 코드 (6자리)</Label>
                        <Input
                          id="code"
                          type="text"
                          value={verificationCode}
                          onChange={handleCodeChange}
                          placeholder="123456"
                          maxLength={6}
                          className="text-center text-lg tracking-widest"
                          disabled={status === 'verifying'}
                        />
                      </div>

                      {/* 재발송 대기 시간 */}
                      {countdown > 0 && (
                        <Alert>
                          <Timer className="h-4 w-4" />
                          <AlertDescription>
                            인증 코드 재발송까지 <strong>{countdown}초</strong> 남았습니다.
                          </AlertDescription>
                        </Alert>
                      )}

                      <div className="flex gap-3">
                        {/* 재발송 버튼 */}
                        <Button 
                          variant="outline"
                          onClick={handleSendVerificationCode}
                          disabled={countdown > 0 || status === 'verifying'}
                          className="flex-1"
                        >
                          재발송
                        </Button>
                        
                        {/* 인증 확인 버튼 */}
                        <Button 
                          onClick={handleVerifyCode}
                          disabled={verificationCode.length !== 6 || status === 'verifying'}
                          className="flex-1"
                        >
                          {status === 'verifying' ? (
                            <span className="flex items-center">
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              확인 중...
                            </span>
                          ) : (
                            '인증 확인'
                          )}
                        </Button>
                      </div>
                    </>
                  )}

                  {/* 뒤로가기 버튼 */}
                  <Button 
                    variant="outline"
                    onClick={() => router.back()}
                    className="w-full"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    뒤로
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 추가 링크 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              문제가 지속되나요?{' '}
              <Link href="/auth/signup" className="text-blue-600 hover:text-blue-700 font-medium">
                회원가입 다시 시도
              </Link>
              {' 또는 '}
              <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">
                로그인
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 
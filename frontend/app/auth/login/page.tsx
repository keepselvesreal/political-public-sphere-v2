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
 * - 로그인 API 연동
 * - 성공 시 토큰 저장 및 리다이렉트
 * - 실시간 폼 검증
 * 
 * 마지막 수정: 2025년 06월 03일 18시 30분 (KST)
 */

"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn, ChevronLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

/**
 * 로그인 폼 데이터 타입
 */
interface LoginFormData {
  identifier: string; // 이메일 또는 사용자명
  password: string;
}

/**
 * 폼 에러 타입
 */
interface FormErrors {
  [key: string]: string;
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
    identifier: '',
    password: '',
  });
  
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  /**
   * 폼 입력 변경 처리
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 해당 필드의 에러 제거
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  /**
   * 폼 유효성 검사
   */
  const validateForm = (): boolean => {
    const errors: FormErrors = {};

    // 이메일/사용자명 검증
    if (!formData.identifier.trim()) {
      errors.identifier = '이메일 또는 사용자명을 입력해주세요';
    }

    // 비밀번호 검증
    if (!formData.password) {
      errors.password = '비밀번호를 입력해주세요';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * 로그인 폼 제출 처리
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "입력 오류",
        description: "입력 정보를 확인해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(formData.identifier, formData.password);

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-full mb-4 mx-auto">
                <LogIn size={32} />
              </div>
              <CardTitle className="text-2xl">로그인</CardTitle>
              <CardDescription>
                정치적 공론장에 다시 오신 것을 환영합니다
              </CardDescription>
            </CardHeader>

            <CardContent>
              {/* 로그인 폼 */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 이메일/사용자명 */}
                <div className="space-y-2">
                  <Label htmlFor="identifier">이메일 또는 사용자명</Label>
                  <Input
                    id="identifier"
                    name="identifier"
                    type="text"
                    value={formData.identifier}
                    onChange={handleInputChange}
                    placeholder="이메일 또는 사용자명을 입력하세요"
                    className={formErrors.identifier ? 'border-red-500' : ''}
                  />
                  {formErrors.identifier && (
                    <p className="text-sm text-red-500">{formErrors.identifier}</p>
                  )}
                </div>

                {/* 비밀번호 */}
                <div className="space-y-2">
                  <Label htmlFor="password">비밀번호</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="비밀번호를 입력하세요"
                      className={formErrors.password ? 'border-red-500' : ''}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {formErrors.password && (
                    <p className="text-sm text-red-500">{formErrors.password}</p>
                  )}
                </div>

                {/* 액션 버튼들 */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => router.back()}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    뒤로
                  </Button>
                  
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        로그인 중...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        로그인
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </span>
                    )}
                  </Button>
                </div>
              </form>

              {/* 추가 링크들 */}
              <div className="mt-6 space-y-3">
                <div className="text-center">
                  <Link 
                    href="/auth/find-account" 
                    className="text-sm text-muted-foreground hover:text-blue-600"
                  >
                    아이디/비밀번호를 잊으셨나요?
                  </Link>
                </div>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">또는</span>
                  </div>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    계정이 없으신가요?{' '}
                    <Link href="/auth/signup" className="text-blue-600 hover:text-blue-700 font-medium">
                      회원가입
                    </Link>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 
/**
 * 📋 파일 목차 (app/auth/signup/page.tsx)
 * ========================================
 * 🎯 주요 역할: 회원가입 페이지 컴포넌트
 * 
 * 📦 구성 요소:
 * - 라인 1-20: 필수 라이브러리 및 컴포넌트 임포트
 * - 라인 22-40: 폼 데이터 타입 및 초기값 정의
 * - 라인 42-80: 회원가입 페이지 컴포넌트
 * - 라인 82-120: 폼 제출 처리 로직
 * - 라인 122-200: UI 렌더링 (헤더, 폼, 버튼)
 * 
 * 🔧 주요 기능:
 * - 회원가입 폼 상태 관리
 * - 실시간 폼 검증
 * - 회원가입 API 연동
 * - 성공/실패 처리 및 피드백
 * - 이메일 인증 안내
 * 
 * 마지막 수정: 2025년 06월 03일 18시 25분 (KST)
 */

"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, ChevronLeft, ArrowRight, Mail, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

/**
 * 회원가입 폼 데이터 타입
 */
interface SignupFormData {
  username: string;
  name: string;
  email: string;
  password: string;
  password2: string;
}

/**
 * 폼 에러 타입
 */
interface FormErrors {
  [key: string]: string;
}

/**
 * 회원가입 페이지 컴포넌트
 */
export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // 폼 상태 관리
  const [formData, setFormData] = useState<SignupFormData>({
    username: '',
    name: '',
    email: '',
    password: '',
    password2: '',
  });
  
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

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

    // 사용자명 검증
    if (!formData.username.trim()) {
      errors.username = '사용자명을 입력해주세요';
    } else if (formData.username.length < 3) {
      errors.username = '사용자명은 3자 이상이어야 합니다';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = '사용자명은 영문, 숫자, 언더스코어만 사용 가능합니다';
    }

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

    // 비밀번호 검증
    if (!formData.password) {
      errors.password = '비밀번호를 입력해주세요';
    } else if (formData.password.length < 8) {
      errors.password = '비밀번호는 8자 이상이어야 합니다';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = '비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다';
    }

    // 비밀번호 확인 검증
    if (!formData.password2) {
      errors.password2 = '비밀번호 확인을 입력해주세요';
    } else if (formData.password !== formData.password2) {
      errors.password2 = '비밀번호가 일치하지 않습니다';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * 회원가입 폼 제출 처리
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
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '회원가입에 실패했습니다');
      }

      toast({
        title: "회원가입 성공!",
        description: "이메일 인증을 완료하여 계정을 활성화하세요.",
      });

      // 이메일 인증 페이지로 이동
      router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`);

    } catch (error) {
      console.error('회원가입 오류:', error);
      toast({
        title: "회원가입 실패",
        description: error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다',
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
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full mb-4 mx-auto">
                <UserPlus size={32} />
              </div>
              <CardTitle className="text-2xl">회원가입</CardTitle>
              <CardDescription>
                정치적 공론장에 참여하세요
              </CardDescription>
            </CardHeader>

            <CardContent>
              {/* 이메일 인증 안내 */}
              <Alert className="mb-6">
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">이메일 인증 기반 회원가입</p>
                    <p className="text-sm">
                      1단계: 회원가입 정보를 입력하세요.<br/>
                      2단계: 이메일로 발송된 인증 코드를 입력하여 계정을 활성화하세요.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>

              {/* 회원가입 폼 */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* 사용자명 */}
                <div className="space-y-2">
                  <Label htmlFor="username">사용자명</Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="영문, 숫자, 언더스코어만 사용"
                    className={formErrors.username ? 'border-red-500' : ''}
                  />
                  {formErrors.username && (
                    <p className="text-sm text-red-500">{formErrors.username}</p>
                  )}
                </div>

                {/* 이름 */}
                <div className="space-y-2">
                  <Label htmlFor="name">이름</Label>
                  <Input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="실명을 입력하세요"
                    className={formErrors.name ? 'border-red-500' : ''}
                  />
                  {formErrors.name && (
                    <p className="text-sm text-red-500">{formErrors.name}</p>
                  )}
                </div>

                {/* 이메일 */}
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="example@email.com"
                    className={formErrors.email ? 'border-red-500' : ''}
                  />
                  {formErrors.email && (
                    <p className="text-sm text-red-500">{formErrors.email}</p>
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
                      placeholder="8자 이상, 대소문자, 숫자 포함"
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

                {/* 비밀번호 확인 */}
                <div className="space-y-2">
                  <Label htmlFor="password2">비밀번호 확인</Label>
                  <div className="relative">
                    <Input
                      id="password2"
                      name="password2"
                      type={showPassword2 ? 'text' : 'password'}
                      value={formData.password2}
                      onChange={handleInputChange}
                      placeholder="비밀번호를 다시 입력하세요"
                      className={formErrors.password2 ? 'border-red-500' : ''}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword2(!showPassword2)}
                    >
                      {showPassword2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {formErrors.password2 && (
                    <p className="text-sm text-red-500">{formErrors.password2}</p>
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
                        가입 처리중...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        회원가입 완료
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* 로그인 링크 */}
          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              이미 계정이 있으신가요?{' '}
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
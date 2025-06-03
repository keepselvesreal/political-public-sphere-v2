/**
 * 📋 파일 목차 (app/auth/find-account/page.tsx)
 * ========================================
 * 🎯 주요 역할: 아이디/비밀번호 찾기 페이지 컴포넌트
 * 
 * 📦 구성 요소:
 * - 라인 1-20: 필수 라이브러리 및 컴포넌트 임포트
 * - 라인 22-40: 상태 타입 및 초기값 정의
 * - 라인 42-80: 아이디/비밀번호 찾기 페이지 컴포넌트
 * - 라인 82-120: UI 렌더링 (탭, 폼, 버튼)
 * 
 * 🔧 주요 기능:
 * - 아이디 찾기 (이메일 기반)
 * - 비밀번호 찾기 (이메일 기반)
 * - 탭 전환 UI
 * - 향후 API 연동 준비
 * 
 * 마지막 수정: 2025년 06월 03일 18시 40분 (KST)
 */

"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Key, ChevronLeft, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

/**
 * 아이디/비밀번호 찾기 페이지 컴포넌트
 */
export default function FindAccountPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // 상태 관리
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 아이디 찾기 처리
   */
  const handleFindUsername = async () => {
    if (!email.trim()) {
      toast({
        title: "입력 오류",
        description: "이메일을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // TODO: 실제 API 구현 시 연동
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "준비 중인 기능",
        description: "아이디 찾기 기능은 현재 개발 중입니다.",
        variant: "destructive",
      });
    }, 1000);
  };

  /**
   * 비밀번호 재설정 처리
   */
  const handleResetPassword = async () => {
    if (!username.trim()) {
      toast({
        title: "입력 오류",
        description: "사용자명을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // TODO: 실제 API 구현 시 연동
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "준비 중인 기능",
        description: "비밀번호 재설정 기능은 현재 개발 중입니다.",
        variant: "destructive",
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400 rounded-full mb-4 mx-auto">
                <Key size={32} />
              </div>
              <CardTitle className="text-2xl">계정 찾기</CardTitle>
              <CardDescription>
                아이디를 잊으셨거나 비밀번호를 재설정하세요
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Tabs defaultValue="username" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="username">아이디 찾기</TabsTrigger>
                  <TabsTrigger value="password">비밀번호 찾기</TabsTrigger>
                </TabsList>
                
                <TabsContent value="username" className="space-y-4">
                  <Alert>
                    <User className="h-4 w-4" />
                    <AlertDescription>
                      가입 시 사용한 이메일 주소를 입력하시면 아이디를 알려드립니다.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <Label htmlFor="find-email">이메일</Label>
                    <Input
                      id="find-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleFindUsername}
                    disabled={isLoading || !email.trim()}
                    className="w-full"
                  >
                    {isLoading ? (
                      <span className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        처리 중...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Mail className="h-4 w-4 mr-2" />
                        아이디 찾기
                      </span>
                    )}
                  </Button>
                </TabsContent>
                
                <TabsContent value="password" className="space-y-4">
                  <Alert>
                    <Key className="h-4 w-4" />
                    <AlertDescription>
                      사용자명을 입력하시면 비밀번호 재설정 링크를 이메일로 보내드립니다.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <Label htmlFor="reset-username">사용자명</Label>
                    <Input
                      id="reset-username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="사용자명을 입력하세요"
                    />
                  </div>
                  
                  <Button 
                    onClick={handleResetPassword}
                    disabled={isLoading || !username.trim()}
                    className="w-full"
                  >
                    {isLoading ? (
                      <span className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        처리 중...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Key className="h-4 w-4 mr-2" />
                        비밀번호 재설정
                      </span>
                    )}
                  </Button>
                </TabsContent>
              </Tabs>

              {/* 뒤로가기 버튼 */}
              <div className="mt-6">
                <Button 
                  variant="outline"
                  onClick={() => router.back()}
                  className="w-full"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  뒤로
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 추가 링크 */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              계정이 기억나셨나요?{' '}
              <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">
                로그인
              </Link>
            </p>
            <p className="text-sm text-muted-foreground">
              계정이 없으신가요?{' '}
              <Link href="/auth/signup" className="text-blue-600 hover:text-blue-700 font-medium">
                회원가입
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 
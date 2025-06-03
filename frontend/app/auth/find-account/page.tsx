/**
 * 📋 파일 목차 (app/auth/find-account/page.tsx)
 * ========================================
 * 🎯 주요 역할: 아이디/비밀번호 찾기 페이지 컴포넌트
 * 
 * 📦 구성 요소:
 * - 라인 1-20: 필수 라이브러리 및 컴포넌트 임포트
 * - 라인 22-60: 컴포넌트 상태 관리 (탭, 폼 데이터, 단계별 상태)
 * - 라인 62-100: 아이디 찾기 관련 핸들러
 * - 라인 102-200: 비밀번호 찾기 관련 핸들러
 * - 라인 202-400: UI 렌더링 (탭, 폼, 버튼, 단계별 표시)
 * 
 * 🔧 주요 기능:
 * - 아이디 찾기: 이름 + 이메일 인증으로 계정 검색 및 결과 지속 표시
 * - 비밀번호 찾기: 아이디 확인 → 본인 인증 → 비밀번호 재설정 단계별 진행
 * - 이메일 인증 코드 발송 및 검증
 * - 단계별 UI 활성화/비활성화 제어
 * 
 * 마지막 수정: 2025년 06월 03일 19시 05분 (KST)
 */

"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Mail, ArrowRight, Check, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

type TabType = 'id' | 'password';

/**
 * 아이디/비밀번호 찾기 페이지 컴포넌트
 */
export default function FindAccountPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<TabType>('id');
  
  // 아이디 찾기 상태
  const [isIdVerified, setIsIdVerified] = useState(false);
  const [foundUsername, setFoundUsername] = useState<string>('');
  
  // 비밀번호 찾기 상태
  const [isUsernameChecked, setIsUsernameChecked] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [userContactInfo, setUserContactInfo] = useState<{email?: string}>({});
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    verificationCode: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 아이디 찾기 - 인증 코드 요청
  const requestVerificationForId = async () => {
    if (!formData.email) {
      toast({
        title: "입력 오류",
        description: "이메일을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      // TODO: 실제 API 구현 시 연동
      toast({
        title: "준비 중인 기능",
        description: "인증 코드 발송 기능은 현재 개발 중입니다.",
        variant: "destructive",
      });
    } catch (error) {
      console.error('인증 코드 발송 오류:', error);
      toast({
        title: "발송 실패",
        description: "인증 코드 발송 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 아이디 찾기 - 인증 코드 확인
  const handleVerifyCodeForId = async () => {
    if (!formData.verificationCode) {
      toast({
        title: "입력 오류",
        description: "인증 코드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      // TODO: 실제 API 구현 시 연동
      setIsIdVerified(true);
      toast({
        title: "인증 완료",
        description: "인증이 완료되었습니다.",
      });
    } catch (error) {
      console.error('인증 코드 확인 중 오류:', error);
      toast({
        title: "인증 실패",
        description: "인증 코드 확인 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 아이디 찾기 실행
  const handleFindUsername = async () => {
    if (!isIdVerified) {
      toast({
        title: "인증 필요",
        description: "먼저 인증을 완료해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.name || !formData.email) {
      toast({
        title: "입력 오류",
        description: "이름과 인증된 이메일을 모두 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      // TODO: 실제 API 구현 시 연동
      setFoundUsername('example_user'); // 임시 데이터
      toast({
        title: "아이디 찾기 성공",
        description: "아이디를 찾았습니다.",
      });
    } catch (error) {
      console.error('아이디 찾기 중 오류:', error);
      toast({
        title: "찾기 실패",
        description: "아이디 찾기 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 비밀번호 찾기 - 아이디 확인
  const handleCheckUsername = async () => {
    if (!formData.username) {
      toast({
        title: "입력 오류",
        description: "아이디를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      // TODO: 실제 API 구현 시 연동
      setIsUsernameChecked(true);
      setUserContactInfo({ email: 'user@example.com' }); // 임시 데이터
      toast({
        title: "아이디 확인 완료",
        description: "아이디가 확인되었습니다.",
      });
    } catch (error) {
      console.error('아이디 확인 중 오류:', error);
      toast({
        title: "확인 실패",
        description: "아이디 확인 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 비밀번호 찾기 - 인증 코드 요청
  const requestVerificationForPassword = async () => {
    try {
      // TODO: 실제 API 구현 시 연동
      toast({
        title: "준비 중인 기능",
        description: "인증 코드 발송 기능은 현재 개발 중입니다.",
        variant: "destructive",
      });
    } catch (error) {
      console.error('인증 코드 발송 오류:', error);
      toast({
        title: "발송 실패",
        description: "인증 코드 발송 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 비밀번호 찾기 - 인증 코드 확인
  const handleVerifyCodeForPassword = async () => {
    if (!formData.verificationCode) {
      toast({
        title: "입력 오류",
        description: "인증 코드를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      // TODO: 실제 API 구현 시 연동
      setIsPasswordVerified(true);
      toast({
        title: "인증 완료",
        description: "인증이 완료되었습니다.",
      });
    } catch (error) {
      console.error('인증 코드 확인 중 오류:', error);
      toast({
        title: "인증 실패",
        description: "인증 코드 확인 중 오류가 발생했습니다.",
        variant: "destructive",
      });
    }
  };

  // 비밀번호 재설정
  const handleResetPassword = async () => {
    if (!formData.newPassword || !formData.confirmPassword) {
      toast({
        title: "입력 오류",
        description: "새 비밀번호를 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "입력 오류",
        description: "비밀번호가 일치하지 않습니다.",
        variant: "destructive",
      });
      return;
    }

    try {
      // TODO: 실제 API 구현 시 연동
      toast({
        title: "비밀번호 재설정 완료",
        description: "비밀번호가 성공적으로 재설정되었습니다.",
      });
      router.push('/auth/login');
    } catch (error) {
      console.error('비밀번호 재설정 중 오류:', error);
      toast({
        title: "재설정 실패",
        description: "비밀번호 재설정 중 오류가 발생했습니다.",
        variant: "destructive",
      });
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
                <Search size={32} />
              </div>
              <h1 className="text-2xl font-bold">계정 찾기</h1>
              <p className="text-slate-500 mt-2">
                {activeTab === 'id' 
                  ? '등록된 정보로 아이디를 찾아보세요'
                  : '아이디를 입력하여 비밀번호를 재설정하세요'}
              </p>
            </div>
            
            <div className="mb-6">
              <div className="flex rounded-md overflow-hidden">
                <button
                  className={`flex-1 py-2 text-center ${activeTab === 'id' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  onClick={() => setActiveTab('id')}
                >
                  아이디 찾기
                </button>
                <button
                  className={`flex-1 py-2 text-center ${activeTab === 'password' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  onClick={() => setActiveTab('password')}
                >
                  비밀번호 찾기
                </button>
              </div>
            </div>
            
            <div className="space-y-6">
              {activeTab === 'id' ? (
                <>
                  {/* 아이디 찾기 섹션 */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                      이름
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="이름을 입력하세요"
                      required
                    />
                  </div>
                  
                  {/* 본인 인증 제목 */}
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-slate-700 mb-4">본인 인증</h3>
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                      이메일 주소
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="input-field"
                        style={{ width: 'calc(100% - 100px)' }}
                        placeholder="이메일을 입력하세요"
                        required
                      />
                      <button
                        type="button"
                        onClick={requestVerificationForId}
                        className="w-24 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
                      >
                        인증 요청
                      </button>
                    </div>
                  </div>
                  
                  {/* 인증 코드 입력 */}
                  <div>
                    <label htmlFor="verificationCode" className="block text-sm font-medium text-slate-700 mb-1">
                      인증 코드
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        id="verificationCode"
                        name="verificationCode"
                        value={formData.verificationCode}
                        onChange={handleChange}
                        className="input-field"
                        style={{ width: 'calc(100% - 100px)' }}
                        placeholder="인증 코드를 입력하세요"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyCodeForId}
                        className="w-24 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
                      >
                        확인
                      </button>
                    </div>
                    {isIdVerified && (
                      <p className="text-green-600 text-sm mt-1">✓ 인증이 완료되었습니다.</p>
                    )}
                  </div>
                  
                  {/* 아이디 찾기 결과 표시 */}
                  {foundUsername && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                      <div className="flex items-center">
                        <Check className="text-green-600 mr-2" size={20} />
                        <div>
                          <p className="text-green-800 font-medium">아이디를 찾았습니다!</p>
                          <p className="text-green-700 text-lg font-bold mt-1">{foundUsername}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <button 
                    type="button"
                    onClick={handleFindUsername}
                    disabled={!isIdVerified}
                    className={`w-full flex items-center justify-center mt-6 py-2.5 px-4 rounded-md transition-colors ${
                      !isIdVerified
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    아이디 찾기
                    <ArrowRight size={18} className="ml-2" />
                  </button>
                </>
              ) : (
                <>
                  {/* 비밀번호 찾기 섹션 */}
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">
                      아이디
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        className="input-field"
                        style={{ width: 'calc(100% - 100px)' }}
                        placeholder="아이디를 입력하세요"
                        required
                      />
                      <button
                        type="button"
                        onClick={handleCheckUsername}
                        className="w-24 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
                      >
                        확인
                      </button>
                    </div>
                    {isUsernameChecked && (
                      <p className="text-green-600 text-sm mt-1">✓ 아이디가 확인되었습니다.</p>
                    )}
                  </div>
                  
                  {/* 본인 인증 섹션 (아이디 확인 후 활성화) */}
                  {isUsernameChecked && (
                    <>
                      <div className="text-center">
                        <h3 className="text-lg font-semibold text-slate-700 mb-4">본인 인증</h3>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          이메일 주소
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={userContactInfo.email || ''}
                            className="input-field bg-slate-100"
                            style={{ width: 'calc(100% - 100px)' }}
                            disabled
                          />
                          <button
                            type="button"
                            onClick={requestVerificationForPassword}
                            className="w-24 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
                          >
                            인증 요청
                          </button>
                        </div>
                      </div>
                      
                      {/* 인증 코드 입력 */}
                      <div>
                        <label htmlFor="verificationCodePassword" className="block text-sm font-medium text-slate-700 mb-1">
                          인증 코드
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            id="verificationCodePassword"
                            name="verificationCode"
                            value={formData.verificationCode}
                            onChange={handleChange}
                            className="input-field"
                            style={{ width: 'calc(100% - 100px)' }}
                            placeholder="인증 코드를 입력하세요"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyCodeForPassword}
                            className="w-24 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
                          >
                            확인
                          </button>
                        </div>
                        {isPasswordVerified && (
                          <p className="text-green-600 text-sm mt-1">✓ 인증이 완료되었습니다.</p>
                        )}
                      </div>
                      
                      {/* 비밀번호 재설정 버튼 */}
                      <button 
                        type="button"
                        onClick={() => setShowPasswordReset(true)}
                        disabled={!isPasswordVerified}
                        className={`w-full flex items-center justify-center mt-6 py-2.5 px-4 rounded-md transition-colors ${
                          !isPasswordVerified
                            ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                            : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                      >
                        비밀번호 재설정
                        <ArrowRight size={18} className="ml-2" />
                      </button>
                    </>
                  )}
                  
                  {/* 새 비밀번호 입력 섹션 */}
                  {showPasswordReset && isPasswordVerified && (
                    <>
                      <div className="border-t pt-6 mt-6">
                        <h3 className="text-lg font-semibold text-slate-700 mb-4 text-center">새 비밀번호 설정</h3>
                        
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 mb-1">
                              새 비밀번호
                            </label>
                            <div className="relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                id="newPassword"
                                name="newPassword"
                                value={formData.newPassword}
                                onChange={handleChange}
                                className="input-field pr-10"
                                placeholder="새 비밀번호를 입력하세요 (8자 이상)"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                              </button>
                            </div>
                          </div>
                          
                          <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 mb-1">
                              비밀번호 확인
                            </label>
                            <div className="relative">
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="input-field pr-10"
                                placeholder="비밀번호를 다시 입력하세요"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                              >
                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                              </button>
                            </div>
                          </div>
                          
                          <button 
                            type="button"
                            onClick={handleResetPassword}
                            className="w-full flex items-center justify-center mt-6 py-2.5 px-4 rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors"
                          >
                            확인
                            <Check size={18} className="ml-2" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </motion.div>
          
          {/* 추가 링크 */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-slate-600">
              계정이 기억나셨나요?{' '}
              <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">
                로그인
              </Link>
            </p>
            <p className="text-sm text-slate-600">
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
/**
 * 📋 파일 목차 (components/auth/Step2CodeVerification.tsx)
 * ========================================
 * 🎯 주요 역할: 2단계 인증 코드 입력 및 확인
 * 
 * 📦 구성 요소:
 * - 라인 1-20: 필수 라이브러리 및 컴포넌트 임포트
 * - 라인 22-40: 타입 정의
 * - 라인 42-80: Step2CodeVerification 컴포넌트
 * - 라인 82-120: 인증 코드 입력 UI
 * - 라인 122-160: 인증 확인 버튼 및 상태 표시
 * 
 * 🔧 주요 기능:
 * - 6자리 인증 코드 입력
 * - 인증 확인 처리
 * - 타이머 표시 (4:48)
 * - 인증 성공/실패 상태 표시
 * 
 * 마지막 수정: 2025년 06월 03일 19시 45분 (KST)
 */

"use client";

import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * 인증 상태 타입
 */
type VerificationStatus = 'idle' | 'sending' | 'sent' | 'verifying' | 'verified' | 'error';

/**
 * Step2CodeVerification 컴포넌트 Props
 */
interface Step2CodeVerificationProps {
  email: string;
  verificationStatus: VerificationStatus;
  formData: {
    verificationCode: string;
  };
  formErrors: {
    [key: string]: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVerifyCode: () => void;
}

/**
 * 2단계: 인증 코드 입력 및 확인 컴포넌트
 */
const Step2CodeVerification: React.FC<Step2CodeVerificationProps> = ({
  email,
  verificationStatus,
  formData,
  formErrors,
  onChange,
  onVerifyCode
}) => {
  // 타이머 상태 (4분 48초 = 288초)
  const [timeLeft, setTimeLeft] = useState(288);

  // 타이머 효과
  useEffect(() => {
    if (timeLeft > 0 && verificationStatus !== 'verified') {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft, verificationStatus]);

  // 시간 포맷팅 (mm:ss)
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* 인증 완료 상태 표시 */}
      {verificationStatus === 'verified' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle size={20} />
            <h3 className="font-semibold">인증 완료! 회원가입을 안료해주세요</h3>
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full"></span>
              <span>아이디</span>
              <span className="text-red-500">*</span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              이메일을 아이디로 사용
            </p>
            <div className="mt-2 p-2 bg-green-100 rounded text-sm text-green-800">
              {email}
            </div>
          </div>
        </div>
      )}

      {/* 이메일 주소 표시 */}
      <div className="space-y-2">
        <Label className="block text-sm font-medium text-slate-700">이메일 주소</Label>
        <div className="flex items-center gap-2">
          <div className="flex-1 p-2.5 bg-slate-100 border border-slate-300 rounded-md text-slate-600">
            {email}
          </div>
          <div className="flex items-center gap-1 text-sm text-slate-500">
            <Clock size={16} />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>
      </div>

      {/* 인증 코드 입력 */}
      <div className="space-y-2">
        <Label htmlFor="verificationCode" className="block text-sm font-medium text-slate-700">
          인증 코드 <span className="text-red-500">*</span>
        </Label>
        <div className="flex gap-2">
          <Input
            id="verificationCode"
            name="verificationCode"
            type="text"
            value={formData.verificationCode}
            onChange={onChange}
            placeholder="6자리 인증 코드"
            maxLength={6}
            className={`input-field flex-1 text-center text-lg tracking-widest ${
              formErrors.verificationCode ? 'border-red-500' : ''
            }`}
            disabled={verificationStatus === 'verified'}
          />
          <button
            type="button"
            onClick={onVerifyCode}
            disabled={
              verificationStatus === 'verifying' || 
              verificationStatus === 'verified' ||
              formData.verificationCode.length !== 6
            }
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {verificationStatus === 'verifying' ? '확인중...' : '인증 확인'}
          </button>
        </div>
        {formErrors.verificationCode && (
          <p className="text-sm text-red-500">{formErrors.verificationCode}</p>
        )}
        
        {/* 인증 실패 메시지 */}
        {verificationStatus === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">
              인증 코드가 올바르지 않습니다. 다시 확인해주세요.
            </p>
          </div>
        )}
      </div>

      {/* 안내 메시지 */}
      <div className="text-sm text-slate-600">
        <p>이메일로 발송된 6자리 인증 코드를 입력해주세요.</p>
        {timeLeft === 0 && (
          <p className="text-red-600 mt-1">
            인증 시간이 만료되었습니다. 다시 인증을 요청해주세요.
          </p>
        )}
      </div>
    </div>
  );
};

export default Step2CodeVerification; 
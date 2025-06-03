/**
 * 📋 파일 목차 (components/auth/Step1Verification.tsx)
 * ========================================
 * 🎯 주요 역할: 1단계 인증 방식 선택 및 기본 정보 입력
 * 
 * 📦 구성 요소:
 * - 라인 1-20: 필수 라이브러리 및 컴포넌트 임포트
 * - 라인 22-40: 타입 정의
 * - 라인 42-80: Step1Verification 컴포넌트
 * - 라인 82-120: 인증 방식 선택 UI
 * - 라인 122-180: 이름, 이메일 입력 필드
 * 
 * 🔧 주요 기능:
 * - 이메일/SMS 인증 방식 선택
 * - 이름, 이메일 입력
 * - 인증 요청 버튼
 * - 실시간 폼 검증
 * 
 * 마지막 수정: 2025년 06월 03일 19시 40분 (KST)
 */

"use client";

import React from 'react';
import { Mail, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * 인증 방식 타입
 */
type VerificationMethod = 'email' | 'sms';

/**
 * 인증 상태 타입
 */
type VerificationStatus = 'idle' | 'sending' | 'sent' | 'verifying' | 'verified' | 'error';

/**
 * Step1Verification 컴포넌트 Props
 */
interface Step1VerificationProps {
  verificationMethod: VerificationMethod;
  setVerificationMethod: (method: VerificationMethod) => void;
  verificationStatus: VerificationStatus;
  formData: {
    name: string;
    email: string;
  };
  formErrors: {
    [key: string]: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRequestVerification: () => void;
}

/**
 * 1단계: 인증 방식 선택 및 기본 정보 입력 컴포넌트
 */
const Step1Verification: React.FC<Step1VerificationProps> = ({
  verificationMethod,
  setVerificationMethod,
  verificationStatus,
  formData,
  formErrors,
  onChange,
  onRequestVerification
}) => {
  return (
    <div className="space-y-6">
      {/* 인증 방식 선택 */}
      <div className="space-y-3">
        <Label className="block text-sm font-medium text-slate-700">인증 방식 선택</Label>
        <div className="grid grid-cols-2 gap-3">
          {/* 이메일 인증 */}
          <label 
            className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
              verificationMethod === 'email' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="verificationMethod"
              value="email"
              checked={verificationMethod === 'email'}
              onChange={(e) => setVerificationMethod(e.target.value as VerificationMethod)}
              className="sr-only"
            />
            <Mail 
              size={24} 
              className={`mb-2 ${
                verificationMethod === 'email' ? 'text-blue-600' : 'text-slate-400'
              }`} 
            />
            <span className={`text-sm font-medium ${
              verificationMethod === 'email' ? 'text-blue-900' : 'text-slate-600'
            }`}>
              이메일 인증
            </span>
          </label>

          {/* SMS 인증 */}
          <label 
            className={`flex flex-col items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
              verificationMethod === 'sms' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="verificationMethod"
              value="sms"
              checked={verificationMethod === 'sms'}
              onChange={(e) => setVerificationMethod(e.target.value as VerificationMethod)}
              className="sr-only"
            />
            <MessageSquare 
              size={24} 
              className={`mb-2 ${
                verificationMethod === 'sms' ? 'text-blue-600' : 'text-slate-400'
              }`} 
            />
            <span className={`text-sm font-medium ${
              verificationMethod === 'sms' ? 'text-blue-900' : 'text-slate-600'
            }`}>
              SMS 인증
            </span>
          </label>
        </div>
      </div>

      {/* 이름 입력 */}
      <div className="space-y-2">
        <Label htmlFor="name" className="block text-sm font-medium text-slate-700">
          이름 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={onChange}
          placeholder="이름을 입력해주세요"
          className={`input-field ${formErrors.name ? 'border-red-500' : ''}`}
        />
        {formErrors.name && (
          <p className="text-sm text-red-500">{formErrors.name}</p>
        )}
      </div>

      {/* 이메일 주소 입력 */}
      <div className="space-y-2">
        <Label htmlFor="email" className="block text-sm font-medium text-slate-700">
          이메일 주소 <span className="text-red-500">*</span>
        </Label>
        <div className="flex gap-2">
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={onChange}
            placeholder="example@email.com"
            className={`input-field flex-1 ${formErrors.email ? 'border-red-500' : ''}`}
          />
          <button
            type="button"
            onClick={onRequestVerification}
            disabled={verificationStatus === 'sending' || !formData.name.trim() || !formData.email.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {verificationStatus === 'sending' ? '발송중...' : '인증 요청'}
          </button>
        </div>
        {formErrors.email && (
          <p className="text-sm text-red-500">{formErrors.email}</p>
        )}
        
        {/* 인증 요청 상태 메시지 */}
        {verificationStatus === 'sent' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-sm text-green-700">
              {verificationMethod === 'email' 
                ? `${formData.email}로 인증 코드를 발송했습니다.`
                : '휴대폰으로 인증 코드를 발송했습니다.'
              }
            </p>
          </div>
        )}
        
        {verificationStatus === 'error' && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">
              인증 코드 발송에 실패했습니다. 다시 시도해주세요.
            </p>
          </div>
        )}
      </div>

      {/* 이메일로 발송된 6자리 인증 코드를 입력하세요 안내 */}
      {verificationStatus === 'sent' && (
        <div className="text-center text-sm text-slate-600">
          이메일로 발송된 6자리 인증 코드를 입력하세요.
        </div>
      )}
    </div>
  );
};

export default Step1Verification; 
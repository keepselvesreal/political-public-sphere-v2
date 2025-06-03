/**
 * 📋 파일 목차 (components/auth/Step3AccountSetup.tsx)
 * ========================================
 * 🎯 주요 역할: 3단계 계정 정보 설정 및 약관 동의
 * 
 * 📦 구성 요소:
 * - 라인 1-20: 필수 라이브러리 및 컴포넌트 임포트
 * - 라인 22-40: 타입 정의
 * - 라인 42-80: Step3AccountSetup 컴포넌트
 * - 라인 82-140: 아이디, 비밀번호 입력 필드
 * - 라인 142-200: 약관 동의 체크박스
 * 
 * 🔧 주요 기능:
 * - 아이디 입력 (이메일을 아이디로 사용 안내)
 * - 비밀번호 입력 및 표시/숨김
 * - 약관 동의 (전체 동의, 개별 동의)
 * - 실시간 폼 검증
 * 
 * 마지막 수정: 2025년 06월 03일 19시 50분 (KST)
 */

"use client";

import React from 'react';
import { Eye, EyeOff, User, Lock, FileText, Shield, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Step3AccountSetup 컴포넌트 Props
 */
interface Step3AccountSetupProps {
  email: string;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  formData: {
    username: string;
    password: string;
    agreeAll: boolean;
    agreeAge: boolean;
    agreeTerms: boolean;
    agreePrivacy: boolean;
  };
  formErrors: {
    [key: string]: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCheckboxChange: (name: string, checked: boolean) => void;
}

/**
 * 3단계: 계정 정보 설정 및 약관 동의 컴포넌트
 */
const Step3AccountSetup: React.FC<Step3AccountSetupProps> = ({
  email,
  showPassword,
  setShowPassword,
  formData,
  formErrors,
  onChange,
  onCheckboxChange
}) => {
  return (
    <div className="space-y-6">
      {/* 아이디 섹션 */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-green-800 mb-2">
          <User size={16} />
          <span className="font-semibold text-sm">아이디</span>
          <span className="text-red-500">*</span>
        </div>
        <p className="text-xs text-green-600 mb-2">이메일을 아이디로 사용</p>
        <div className="p-2 bg-green-100 border border-green-300 rounded text-sm text-green-800">
          {email}
        </div>
      </div>

      {/* 비밀번호 입력 */}
      <div className="space-y-2">
        <Label htmlFor="password" className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Lock size={16} />
          비밀번호 <span className="text-red-500">*</span>
        </Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={onChange}
            placeholder="비밀번호를 입력하세요 (최소 6자)"
            className={`input-field pr-10 ${formErrors.password ? 'border-red-500' : ''}`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        {formErrors.password && (
          <p className="text-sm text-red-500">{formErrors.password}</p>
        )}
      </div>

      {/* 약관 동의 */}
      <div className="space-y-4">
        <Label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <FileText size={16} />
          약관 동의
        </Label>
        
        {/* 전체 동의 */}
        <div className="border border-slate-200 rounded-lg p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.agreeAll}
              onChange={(e) => onCheckboxChange('agreeAll', e.target.checked)}
              className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <span className="font-medium text-slate-900">전체 동의</span>
          </label>
        </div>

        {/* 개별 약관 동의 */}
        <div className="space-y-3 pl-4">
          {/* 만 14세 이상 */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.agreeAge}
              onChange={(e) => onCheckboxChange('agreeAge', e.target.checked)}
              className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">
              만 14세 이상입니다 <span className="text-red-500">*</span>
            </span>
          </label>
          {formErrors.agreeAge && (
            <p className="text-sm text-red-500 ml-7">{formErrors.agreeAge}</p>
          )}

          {/* 이용약관 동의 */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.agreeTerms}
              onChange={(e) => onCheckboxChange('agreeTerms', e.target.checked)}
              className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-700">
                <span className="text-blue-600 underline cursor-pointer hover:text-blue-800">이용약관</span>에 동의합니다 <span className="text-red-500">*</span>
              </span>
              <ExternalLink size={12} className="text-blue-600" />
            </div>
          </label>
          {formErrors.agreeTerms && (
            <p className="text-sm text-red-500 ml-7">{formErrors.agreeTerms}</p>
          )}

          {/* 개인정보처리방침 동의 */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.agreePrivacy}
              onChange={(e) => onCheckboxChange('agreePrivacy', e.target.checked)}
              className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-700">
                <span className="text-blue-600 underline cursor-pointer hover:text-blue-800">개인정보처리방침</span>에 동의합니다 <span className="text-red-500">*</span>
              </span>
              <ExternalLink size={12} className="text-blue-600" />
            </div>
          </label>
          {formErrors.agreePrivacy && (
            <p className="text-sm text-red-500 ml-7">{formErrors.agreePrivacy}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Step3AccountSetup; 
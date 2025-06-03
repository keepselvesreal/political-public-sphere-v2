/**
 * 📋 파일 목차 (components/auth/UserMenu.tsx)
 * ========================================
 * 🎯 주요 역할: 사용자 인증 메뉴 컴포넌트
 * 
 * 📦 구성 요소:
 * - 라인 1-20: 필수 라이브러리 및 컴포넌트 임포트
 * - 라인 22-40: 사용자 메뉴 컴포넌트 정의
 * - 라인 42-80: 로그인된 사용자 메뉴 렌더링
 * - 라인 82-120: 비로그인 사용자 메뉴 렌더링
 * 
 * 🔧 주요 기능:
 * - 사용자 이모티콘 버튼 표시
 * - 드롭다운 메뉴 (회원가입, 로그인, 아이디/비밀번호 찾기)
 * - 로그인 상태에 따른 메뉴 변경
 * - 각 메뉴 클릭 시 해당 페이지로 라우팅
 * 
 * 마지막 수정: 2025년 06월 03일 18시 15분 (KST)
 */

"use client";

import Link from 'next/link';
import { useState } from 'react';
import { User, LogOut, UserPlus, LogIn, Key, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface UserMenuProps {
  user?: {
    id: string;
    name: string;
    email: string;
    isEmailVerified: boolean;
  } | null;
  onLogout?: () => void;
}

export default function UserMenu({ user, onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  // 로그인된 사용자 메뉴
  const renderLoggedInMenu = () => (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center space-x-2 hover:bg-blue-50 dark:hover:bg-blue-900/20"
        >
          <div className="text-lg">👤</div>
          <span className="max-w-20 truncate">{user?.name || user?.email}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-3 py-2 border-b">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
          {!user?.isEmailVerified && (
            <p className="text-xs text-orange-600 mt-1">이메일 인증 필요</p>
          )}
        </div>
        
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>프로필 설정</span>
          </Link>
        </DropdownMenuItem>
        
        {!user?.isEmailVerified && (
          <DropdownMenuItem asChild>
            <Link href="/auth/verify-email" className="flex items-center space-x-2 text-orange-600">
              <Key className="h-4 w-4" />
              <span>이메일 인증</span>
            </Link>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={onLogout}
          className="flex items-center space-x-2 text-red-600 focus:text-red-600"
        >
          <LogOut className="h-4 w-4" />
          <span>로그아웃</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // 비로그인 사용자 메뉴
  const renderGuestMenu = () => (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center space-x-2 hover:bg-blue-50 dark:hover:bg-blue-900/20"
        >
          <div className="text-lg">👤</div>
          <span>계정</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href="/auth/signup" className="flex items-center space-x-2">
            <UserPlus className="h-4 w-4" />
            <span>회원가입</span>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link href="/auth/login" className="flex items-center space-x-2">
            <LogIn className="h-4 w-4" />
            <span>로그인</span>
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <Link href="/auth/find-account" className="flex items-center space-x-2 text-muted-foreground">
            <Key className="h-4 w-4" />
            <span>아이디/비밀번호 찾기</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return user ? renderLoggedInMenu() : renderGuestMenu();
} 
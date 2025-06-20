"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ModeToggle } from '@/components/ModeToggle';
import { BarChart2, PenTool, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserMenu from '@/components/auth/UserMenu';
import { useAuth } from '@/hooks/useAuth';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 인증 상태별 버튼 렌더링
  const renderAuthButtons = () => {
    if (isLoading) {
      return (
        <div className="w-20 h-9 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
      );
    }

    return (
      <div className="flex items-center space-x-2">
        {user && (
          <Link href="/analysis-contest/write">
            <Button variant="outline" size="sm" className="flex items-center space-x-1">
              <PenTool className="h-4 w-4" />
              <span>글쓰기</span>
            </Button>
          </Link>
        )}
        
        <UserMenu user={user} onLogout={logout} />
      </div>
    );
  };

  return (
    <header 
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled 
          ? 'bg-white dark:bg-gray-950 shadow-md' 
          : 'bg-transparent'
      }`}
    >
      {/* 상단 타이틀 영역 */}
      <div className="w-full bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 py-3">
        <div className="container mx-auto px-4 flex items-center justify-center">
          <div className="flex items-center space-x-3">
            {/* 임시 이미지 아이콘 */}
            <Image className="h-8 w-8 text-blue-600" />
            <h1 className="font-bold text-2xl text-gray-900 dark:text-white">
              정치적 공론장
            </h1>
          </div>
        </div>
      </div>

      {/* 하단 네비게이션 영역 */}
      <div className={`w-full transition-all duration-300 ${
        isScrolled ? 'py-2' : 'py-4'
      }`}>
        <div className="container mx-auto px-4 flex items-center justify-between">
          {/* 좌측 여백 */}
          <div className="flex-1"></div>
          
          {/* 중앙 네비게이션 메뉴 */}
          <nav className="flex items-center justify-center space-x-8">
            <Link 
              href="/beyond-bias" 
              className="text-foreground hover:text-blue-600 transition-colors font-medium px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              정치 편향 극복
            </Link>
            <Link 
              href="/community-posts" 
              className="text-foreground hover:text-blue-600 transition-colors font-medium px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              정치 마실?!
            </Link>
            
            {/* 천하제일 분석대회 호버 메뉴 */}
            <div className="relative group">
              <span className="text-foreground hover:text-blue-600 transition-colors font-medium px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">
                천하제일 분석대회
              </span>
              
              {/* 호버 시 나타나는 서브메뉴 */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 w-48 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="py-2">
                  <Link 
                    href="/analysis-contest/preparation" 
                    className="block px-4 py-2 text-sm text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 transition-colors"
                  >
                    준비
                  </Link>
                  <Link 
                    href="/analysis-contest/practice" 
                    className="block px-4 py-2 text-sm text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 transition-colors"
                  >
                    실전
                  </Link>
                </div>
              </div>
            </div>
          </nav>
          
          {/* 우측 인증 및 설정 버튼 */}
          <div className="flex-1 flex items-center justify-end space-x-4">
            {renderAuthButtons()}
            <ModeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
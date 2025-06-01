"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { ModeToggle } from '@/components/ModeToggle';
import { BarChart2, User, LogOut, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { data: session, status } = useSession();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 인증 상태별 버튼 렌더링
  const renderAuthButtons = () => {
    if (status === 'loading') {
      return (
        <div className="w-20 h-9 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
      );
    }

    if (session?.user) {
      return (
        <div className="flex items-center space-x-2">
          <Link href="/write">
            <Button variant="outline" size="sm" className="flex items-center space-x-1">
              <PenTool className="h-4 w-4" />
              <span>글쓰기</span>
            </Button>
          </Link>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center space-x-1">
                <User className="h-4 w-4" />
                <span className="max-w-20 truncate">{session.user.name || session.user.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>프로필</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => signOut()}
                className="flex items-center space-x-2 text-red-600"
              >
                <LogOut className="h-4 w-4" />
                <span>로그아웃</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }

    return (
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => signIn('google')}
      >
        로그인
      </Button>
    );
  };

  return (
    <header 
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled 
          ? 'bg-white dark:bg-gray-950 shadow-md py-3' 
          : 'bg-transparent py-5'
      }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <BarChart2 className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-xl">ElectionPulse</span>
        </Link>
        
        <div className="flex items-center space-x-8">
          <nav className="hidden md:flex space-x-8">
            <Link 
              href="/predictions" 
              className="text-foreground hover:text-blue-600 transition-colors"
            >
              Predictions
            </Link>
            <Link 
              href="/analysis" 
              className="text-foreground hover:text-blue-600 transition-colors"
            >
              Analysis
            </Link>
            <Link 
              href="/trends" 
              className="text-foreground hover:text-blue-600 transition-colors"
            >
              Trends
            </Link>
          </nav>
          
          <div className="flex items-center space-x-4">
            {renderAuthButtons()}
            <ModeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
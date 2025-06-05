/*
스크래퍼 실험용 페이지 전용 레이아웃

목적:
- 인증 관련 오류 우회
- 독립적인 실험 환경 제공
- 최소한의 의존성으로 구성

작성자: AI Assistant
작성일: 2025년 6월 4일 16:30 (KST)
*/

import '../globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FMKorea 스크래퍼 실험실',
  description: '스크래퍼 결과 데이터의 실험적 재현 및 검증',
};

export default function ScraperExperimentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
        >
          <div className="min-h-screen">
            {children}
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
} 
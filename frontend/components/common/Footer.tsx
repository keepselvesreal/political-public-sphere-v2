import Link from 'next/link';
import { BarChart2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-100 dark:bg-gray-900 py-4 border-t border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-2">
          {/* 로고와 회사명 */}
          <div className="flex items-center space-x-2">
            <BarChart2 className="h-4 w-4 text-blue-600" />
            <span className="font-semibold text-sm">정치적 공론장</span>
          </div>
          
          {/* 저작권 정보 */}
          <div className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} 정치적 공론장. All rights reserved.
          </div>
          
          {/* 간단한 링크들 */}
          <div className="flex items-center space-x-4 text-xs">
            <Link href="/about" className="text-muted-foreground hover:text-blue-600">
              소개
            </Link>
            <Link href="/contact" className="text-muted-foreground hover:text-blue-600">
              문의
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
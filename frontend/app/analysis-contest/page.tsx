/*
목차:
- 천하제일 분석대회 리다이렉트 페이지
- /analysis-contest/practice로 자동 리다이렉트
*/

"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AnalysisContestRedirect() {
  const router = useRouter();

  useEffect(() => {
    // practice 페이지로 리다이렉트
    router.replace('/analysis-contest/practice');
  }, [router]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-center items-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">페이지를 이동하는 중...</p>
        </div>
      </div>
    </div>
  );
}
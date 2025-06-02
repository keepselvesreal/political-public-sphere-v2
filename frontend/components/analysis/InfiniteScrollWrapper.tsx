/*
목차:
- InfiniteScrollWrapper 컴포넌트
- react-infinite-scroll-component 래핑
- 로딩 스피너 및 에러 처리
- react-hot-toast 통합
*/

"use client";

import React from 'react';
import InfiniteScroll from 'react-infinite-scroll-component';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import { Loader2, AlertCircle } from 'lucide-react';

interface InfiniteScrollWrapperProps {
  children: React.ReactNode;
  hasMore: boolean;
  loadMore: () => void;
  loading?: boolean;
  error?: string | null;
  dataLength: number;
  className?: string;
}

export default function InfiniteScrollWrapper({
  children,
  hasMore,
  loadMore,
  loading = false,
  error = null,
  dataLength,
  className = ""
}: InfiniteScrollWrapperProps) {
  const { t } = useTranslation('common');

  // 에러가 발생했을 때 토스트 표시
  React.useEffect(() => {
    if (error) {
      toast.error(error, {
        id: 'infinite-scroll-error',
        duration: 5000,
        icon: <AlertCircle className="h-4 w-4" />,
      });
    }
  }, [error]);

  const LoadingSpinner = () => (
    <div className="flex justify-center items-center py-8" role="status" aria-live="polite">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" aria-hidden="true" />
      <span className="ml-2 text-muted-foreground">{t('loadMore')}</span>
      <span className="sr-only">{t('loading')}</span>
    </div>
  );

  const EndMessage = () => (
    <div className="text-center py-8 text-muted-foreground" role="status" aria-live="polite">
      <p>{t('noMorePosts')}</p>
    </div>
  );

  const ErrorMessage = () => (
    <div className="text-center py-8" role="alert">
      <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" aria-hidden="true" />
      <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
      <button
        onClick={loadMore}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label={t('retry')}
      >
        {t('retry')}
      </button>
    </div>
  );

  if (error && dataLength === 0) {
    return <ErrorMessage />;
  }

  return (
    <div className={className}>
      <InfiniteScroll
        dataLength={dataLength}
        next={loadMore}
        hasMore={hasMore && !loading && !error}
        loader={<LoadingSpinner />}
        endMessage={<EndMessage />}
        scrollThreshold={0.8}
        style={{ overflow: 'visible' }}
        aria-label={t('postList')}
      >
        {children}
      </InfiniteScroll>
      
      {/* 초기 로딩 상태 */}
      {loading && dataLength === 0 && <LoadingSpinner />}
      
      {/* 추가 로딩 중 에러 표시 */}
      {error && dataLength > 0 && (
        <div className="text-center py-4" role="alert">
          <p className="text-red-600 dark:text-red-400 text-sm mb-2">{error}</p>
          <button
            onClick={loadMore}
            className="text-blue-500 hover:text-blue-600 text-sm underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
            aria-label={t('retry')}
          >
            {t('retry')}
          </button>
        </div>
      )}
    </div>
  );
} 
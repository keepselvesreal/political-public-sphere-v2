/*
목차:
- 정치적 공론장 메인 페이지
- 3개 주요 섹션 소개 (정치 편향 극복, 정치 마실?!, 천하제일 분석대회)
- 각 섹션별 링크 및 미리보기
- 반응형 카드 레이아웃
*/

"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, MessageSquare, Trophy, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* 헤로 섹션 */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
          정치적 공론장에 오신 것을 환영합니다
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
          건전한 정치적 토론과 분석을 통해 더 나은 민주주의를 만들어가는 공간입니다.
        </p>
      </div>

      {/* 주요 섹션 카드 */}
      <div className="grid md:grid-cols-3 gap-8 mb-16">
        {/* 정치 편향 극복 */}
        <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-500">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 p-3 bg-blue-100 dark:bg-blue-900 rounded-full w-fit">
              <BarChart3 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl mb-2">정치 편향 극복</CardTitle>
            <CardDescription className="text-base">
              객관적인 데이터와 분석을 통해 정치적 편향을 인식하고 극복해보세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/beyond-bias">
              <Button className="group-hover:bg-blue-600 transition-colors">
                시작하기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* 정치 마실?! */}
        <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-green-500">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 p-3 bg-green-100 dark:bg-green-900 rounded-full w-fit">
              <MessageSquare className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl mb-2">정치 마실?!</CardTitle>
            <CardDescription className="text-base">
              일상적인 정치 이야기를 편안하게 나누는 커뮤니티 공간입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/community-posts">
              <Button className="group-hover:bg-green-600 transition-colors">
                참여하기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* 천하제일 분석대회 */}
        <Card className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-purple-500">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 p-3 bg-purple-100 dark:bg-purple-900 rounded-full w-fit">
              <Trophy className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <CardTitle className="text-2xl mb-2">천하제일 분석대회</CardTitle>
            <CardDescription className="text-base">
              정치 분석 실력을 겨루고 인사이트를 공유하는 경쟁의 장입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/analysis-contest">
              <Button className="group-hover:bg-purple-600 transition-colors">
                도전하기
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* 추가 정보 섹션 */}
      <div className="text-center bg-gray-50 dark:bg-gray-900 rounded-lg p-8">
        <h2 className="text-2xl font-bold mb-4">함께 만들어가는 건전한 정치 문화</h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          다양한 관점을 존중하며, 사실에 기반한 토론을 통해 
          더 나은 정치적 의사결정을 위한 지혜를 모아갑니다.
        </p>
      </div>
    </div>
  );
}
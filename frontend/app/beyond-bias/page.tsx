/*
목차:
- 정치 편향 극복 메인 페이지
- 편향 분석 도구 소개
- 객관적 데이터 기반 분석
- 편향 극복 가이드
*/

"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Target, Brain, TrendingUp } from 'lucide-react';

export default function BeyondBias() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* 헤더 섹션 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          정치 편향 극복
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          객관적인 데이터와 분석을 통해 정치적 편향을 인식하고 극복해보세요.
        </p>
      </div>

      {/* 기능 카드들 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Card className="text-center">
          <CardHeader>
            <BarChart3 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <CardTitle>편향 분석</CardTitle>
            <CardDescription>
              나의 정치적 편향 정도를 객관적으로 측정해보세요.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <Target className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <CardTitle>균형 잡기</CardTitle>
            <CardDescription>
              다양한 관점을 고려한 균형 잡힌 시각을 기를 수 있습니다.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <Brain className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <CardTitle>비판적 사고</CardTitle>
            <CardDescription>
              정보를 비판적으로 분석하는 능력을 향상시켜보세요.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <TrendingUp className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <CardTitle>성장 추적</CardTitle>
            <CardDescription>
              편향 극복 과정을 추적하고 성장을 확인하세요.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* 준비 중 메시지 */}
      <div className="text-center bg-gray-50 dark:bg-gray-900 rounded-lg p-12">
        <h2 className="text-2xl font-bold mb-4">🚧 준비 중입니다</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          정치 편향 극복 도구를 개발 중입니다. 곧 만나보실 수 있습니다!
        </p>
        <Button disabled>
          곧 출시 예정
        </Button>
      </div>
    </div>
  );
} 
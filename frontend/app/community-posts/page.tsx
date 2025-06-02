/*
목차:
- 정치 마실?! 커뮤니티 메인 페이지
- 일상적인 정치 이야기 공간
- 커뮤니티 게시글 목록
- 편안한 토론 환경
*/

"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Coffee, Users, Heart } from 'lucide-react';

export default function CommunityPosts() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* 헤더 섹션 */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
          정치 마실?!
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          일상적인 정치 이야기를 편안하게 나누는 커뮤니티 공간입니다.
        </p>
      </div>

      {/* 커뮤니티 특징 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Card className="text-center">
          <CardHeader>
            <Coffee className="h-12 w-12 text-amber-600 mx-auto mb-4" />
            <CardTitle>편안한 분위기</CardTitle>
            <CardDescription>
              마치 동네 카페에서 이야기하는 것처럼 편안하게 대화해보세요.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <MessageSquare className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <CardTitle>자유로운 토론</CardTitle>
            <CardDescription>
              다양한 정치적 주제에 대해 자유롭게 의견을 나눠보세요.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <CardTitle>다양한 관점</CardTitle>
            <CardDescription>
              서로 다른 배경과 생각을 가진 사람들과 소통해보세요.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="text-center">
          <CardHeader>
            <Heart className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <CardTitle>상호 존중</CardTitle>
            <CardDescription>
              서로의 의견을 존중하며 건전한 토론 문화를 만들어가요.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* 준비 중 메시지 */}
      <div className="text-center bg-gray-50 dark:bg-gray-900 rounded-lg p-12">
        <h2 className="text-2xl font-bold mb-4">🚧 준비 중입니다</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          정치 마실?! 커뮤니티를 개발 중입니다. 곧 만나보실 수 있습니다!
        </p>
        <Button disabled>
          곧 출시 예정
        </Button>
      </div>
    </div>
  );
} 
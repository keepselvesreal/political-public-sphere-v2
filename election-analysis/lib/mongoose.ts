/*
목차:
- MongoDB 연결 함수 (connectDB)
- 연결 상태 확인 및 재사용
- 환경변수 기반 연결 설정
*/

import mongoose from 'mongoose';

export async function connectDB() {
  // 이미 연결되어 있으면 재사용
  if (mongoose.connection.readyState >= 1) return;
  
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('MongoDB 연결 성공');
  } catch (error) {
    console.error('MongoDB 연결 실패:', error);
    throw error;
  }
} 
/**
 * 📋 파일 목차 (tests/setup/test-db.ts)
 * ========================================
 * 🎯 주요 역할: 테스트용 MongoDB 메모리 서버 설정
 * 
 * 📦 구성 요소:
 * - 라인 1-20: 필수 라이브러리 임포트
 * - 라인 22-40: MongoDB 메모리 서버 설정
 * - 라인 42-60: 데이터베이스 연결 함수
 * - 라인 62-80: 테스트 데이터 정리 함수
 * 
 * 🔧 주요 기능:
 * - 테스트용 MongoDB 메모리 서버 시작/종료
 * - 테스트 간 데이터 정리
 * - 테스트 데이터베이스 연결 관리
 * 
 * 🧪 테스트 지원:
 * - 격리된 테스트 환경 제공
 * - 빠른 테스트 실행
 * - 자동 데이터 정리
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

/**
 * 테스트용 MongoDB 메모리 서버 시작
 */
export async function startTestDB(): Promise<string> {
  try {
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'test-auth-db'
      }
    });
    
    const mongoUri = mongoServer.getUri();
    console.log('🧪 테스트 DB 시작:', mongoUri);
    
    return mongoUri;
  } catch (error) {
    console.error('❌ 테스트 DB 시작 실패:', error);
    throw error;
  }
}

/**
 * 테스트용 MongoDB 연결
 */
export async function connectTestDB(): Promise<void> {
  try {
    const mongoUri = await startTestDB();
    
    await mongoose.connect(mongoUri);
    console.log('✅ 테스트 DB 연결 성공');
  } catch (error) {
    console.error('❌ 테스트 DB 연결 실패:', error);
    throw error;
  }
}

/**
 * 테스트용 MongoDB 연결 해제 및 서버 종료
 */
export async function disconnectTestDB(): Promise<void> {
  try {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    
    if (mongoServer) {
      await mongoServer.stop();
    }
    
    console.log('✅ 테스트 DB 정리 완료');
  } catch (error) {
    console.error('❌ 테스트 DB 정리 실패:', error);
    throw error;
  }
}

/**
 * 테스트 간 데이터 정리
 */
export async function clearTestDB(): Promise<void> {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log('⚠️ DB 연결이 없어 데이터 정리를 건너뜁니다');
      return;
    }

    const db = mongoose.connection.db;
    if (!db) {
      console.log('⚠️ DB 인스턴스가 없어 데이터 정리를 건너뜁니다');
      return;
    }

    // 모든 컬렉션 목록 가져오기
    const collections = await db.listCollections().toArray();
    
    // 각 컬렉션의 모든 문서 삭제
    for (const collectionInfo of collections) {
      const collection = db.collection(collectionInfo.name);
      await collection.deleteMany({});
    }
    
    console.log('🧹 테스트 데이터 정리 완료');
  } catch (error) {
    console.error('❌ 테스트 데이터 정리 실패:', error);
    throw error;
  }
}

/**
 * 테스트 환경 변수 설정
 */
export function setupTestEnv(): void {
  // 환경 변수 설정 (테스트 환경)
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = 'test-jwt-secret';
  }
  if (!process.env.JWT_REFRESH_SECRET) {
    process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
  }
} 
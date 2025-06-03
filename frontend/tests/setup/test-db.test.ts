/**
 * 📋 파일 목차 (tests/setup/test-db.test.ts)
 * ========================================
 * 🎯 주요 역할: 테스트 DB 설정 검증
 * 
 * 📦 구성 요소:
 * - 라인 1-15: 테스트 설정 및 임포트
 * - 라인 17-35: DB 연결 테스트
 * - 라인 37-55: 데이터 정리 테스트
 * 
 * 🧪 테스트 케이스:
 * - MongoDB 메모리 서버 연결
 * - 데이터 생성 및 정리
 * - 환경 변수 설정
 */

import { connectTestDB, disconnectTestDB, clearTestDB, setupTestEnv } from './test-db';
import mongoose from 'mongoose';

describe('테스트 DB 설정 검증', () => {
  beforeAll(() => {
    setupTestEnv();
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await disconnectTestDB();
    }
  });

  it('환경 변수가 올바르게 설정되어야 함', () => {
    expect(process.env.JWT_SECRET).toBe('test-jwt-secret');
    expect(process.env.JWT_REFRESH_SECRET).toBe('test-jwt-refresh-secret');
  });

  it('테스트 DB에 연결할 수 있어야 함', async () => {
    await connectTestDB();
    expect(mongoose.connection.readyState).toBe(1); // 1 = connected
  });

  it('테스트 데이터를 정리할 수 있어야 함', async () => {
    // 테스트 컬렉션 생성
    const testCollection = mongoose.connection.db?.collection('test');
    await testCollection?.insertOne({ test: 'data' });
    
    // 데이터 정리
    await clearTestDB();
    
    // 정리 확인
    const count = await testCollection?.countDocuments();
    expect(count).toBe(0);
  });
}); 
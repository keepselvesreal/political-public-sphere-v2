/**
 * 📋 파일 목차 (lib/models/EmailVerificationToken.ts)
 * ========================================
 * 🎯 주요 역할: 이메일 인증 토큰을 관리하는 MongoDB 스키마
 * 
 * 📦 구성 요소:
 * - 라인 1-15: 필수 라이브러리 및 타입 임포트
 * - 라인 17-35: 이메일 인증 토큰 인터페이스 정의
 * - 라인 37-75: 토큰 스키마 정의
 * - 라인 77-85: 토큰 생성 정적 메서드
 * - 라인 87-95: 토큰 검증 정적 메서드
 * - 라인 97-105: 모델 내보내기
 * 
 * 🔧 주요 기능:
 * - 이메일 인증 토큰 생성 및 저장
 * - 토큰 만료 시간 관리 (24시간)
 * - 토큰 사용 상태 추적
 * - 자동 만료 처리 (TTL 인덱스)
 * - 사용자 ID 연결
 * 
 * 🔒 보안 기능:
 * - 6자리 숫자 토큰 생성
 * - 토큰 재사용 방지
 * - 자동 만료 처리
 * 
 * 마지막 수정: 2025년 06월 03일 17시 40분 (KST)
 */

import mongoose, { Document, Schema, Model } from 'mongoose';
import crypto from 'crypto';

/**
 * 이메일 인증 토큰 인터페이스 정의
 */
export interface IEmailVerificationToken extends Document {
  userId: mongoose.Types.ObjectId;  // 사용자 ID (ObjectId 참조)
  email: string;           // 인증할 이메일 주소
  token: string;           // 6자리 인증 토큰
  isUsed: boolean;         // 토큰 사용 여부
  expiresAt: Date;         // 토큰 만료 시간
  createdAt: Date;         // 토큰 생성 시간
}

/**
 * 이메일 인증 토큰 모델 인터페이스 (정적 메서드 포함)
 */
export interface IEmailVerificationTokenModel extends Model<IEmailVerificationToken> {
  generateToken(email: string): Promise<IEmailVerificationToken>;
  verifyToken(email: string, token: string): Promise<IEmailVerificationToken | null>;
}

/**
 * 이메일 인증 토큰 스키마 정의
 */
const EmailVerificationTokenSchema = new Schema<IEmailVerificationToken>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '사용자 ID는 필수입니다']
  },
  email: {
    type: String,
    required: [true, '이메일은 필수입니다'],
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '올바른 이메일 형식이 아닙니다']
  },
  token: {
    type: String,
    required: [true, '토큰은 필수입니다'],
    length: [6, '토큰은 6자리여야 합니다']
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24시간 후 만료
    index: { expireAfterSeconds: 0 } // TTL 인덱스로 자동 삭제
  }
}, {
  timestamps: true
});

/**
 * 토큰 생성 정적 메서드
 * 새로운 6자리 인증 토큰을 생성하고 저장
 */
EmailVerificationTokenSchema.statics.generateToken = async function(email: string): Promise<IEmailVerificationToken> {
  // 기존 미사용 토큰 삭제
  await this.deleteMany({ email, isUsed: false });
  
  // 6자리 랜덤 숫자 토큰 생성
  const token = Math.floor(100000 + Math.random() * 900000).toString();
  
  // 새 토큰 생성 및 저장
  const verificationToken = new this({
    email,
    token,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24시간 후 만료
  });
  
  return await verificationToken.save();
};

/**
 * 토큰 검증 정적 메서드
 * 이메일과 토큰을 검증하고 사용 처리
 */
EmailVerificationTokenSchema.statics.verifyToken = async function(email: string, token: string): Promise<IEmailVerificationToken | null> {
  // 유효한 토큰 찾기 (미사용, 미만료)
  const verificationToken = await this.findOne({
    email: email.toLowerCase(),
    token,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  });
  
  if (!verificationToken) {
    return null;
  }
  
  // 토큰을 사용됨으로 표시
  verificationToken.isUsed = true;
  await verificationToken.save();
  
  return verificationToken;
};

/**
 * 인덱스 설정
 * 검색 성능 최적화 및 자동 만료 처리
 */
EmailVerificationTokenSchema.index({ email: 1, isUsed: 1 });
EmailVerificationTokenSchema.index({ userId: 1 });
EmailVerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// 모델 생성 및 내보내기
const EmailVerificationToken = (mongoose.models.EmailVerificationToken || 
  mongoose.model<IEmailVerificationToken, IEmailVerificationTokenModel>('EmailVerificationToken', EmailVerificationTokenSchema)) as IEmailVerificationTokenModel;

export default EmailVerificationToken; 
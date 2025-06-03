/**
 * 📋 파일 목차 (lib/models/User.ts)
 * ========================================
 * 🎯 주요 역할: 사용자 정보를 관리하는 MongoDB 스키마
 * 
 * 📦 구성 요소:
 * - 라인 1-20: 필수 라이브러리 및 타입 임포트
 * - 라인 22-45: 사용자 인터페이스 정의 (IUser)
 * - 라인 47-80: 사용자 스키마 정의 (UserSchema)
 * - 라인 82-95: 비밀번호 해싱 미들웨어
 * - 라인 97-110: 비밀번호 검증 메서드
 * - 라인 112-120: 모델 내보내기
 * 
 * 🔧 주요 기능:
 * - 사용자 기본 정보 저장 (이름, 이메일, 비밀번호)
 * - 이메일 인증 상태 관리
 * - 비밀번호 자동 해싱
 * - 비밀번호 검증 메서드
 * - 계정 생성/수정 시간 추적
 * 
 * 🔒 보안 기능:
 * - bcrypt를 이용한 비밀번호 해싱
 * - 이메일 중복 방지 (unique 인덱스)
 * - 사용자명 중복 방지 (unique 인덱스)
 */

import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * 사용자 인터페이스 정의
 * MongoDB 문서와 TypeScript 타입을 연결
 */
export interface IUser extends Document {
  username: string;           // 사용자명 (고유)
  name: string;              // 실명
  email: string;             // 이메일 주소 (고유)
  password: string;          // 해싱된 비밀번호
  isEmailVerified: boolean;  // 이메일 인증 여부
  profileImage?: string;     // 프로필 이미지 URL (선택사항)
  role: 'user' | 'admin';    // 사용자 역할
  isActive: boolean;         // 계정 활성화 상태
  lastLoginAt?: Date;        // 마지막 로그인 시간
  createdAt: Date;           // 계정 생성 시간
  updatedAt: Date;           // 계정 수정 시간
  
  // 메서드
  comparePassword(candidatePassword: string): Promise<boolean>;
}

/**
 * 사용자 스키마 정의
 * MongoDB 컬렉션 구조 및 제약 조건 설정
 */
const UserSchema = new Schema<IUser>({
  username: {
    type: String,
    required: [true, '사용자명은 필수입니다'],
    unique: true,
    trim: true,
    minlength: [3, '사용자명은 최소 3자 이상이어야 합니다'],
    maxlength: [20, '사용자명은 최대 20자까지 가능합니다'],
    match: [/^[a-zA-Z0-9_]+$/, '사용자명은 영문, 숫자, 언더스코어만 사용 가능합니다']
  },
  name: {
    type: String,
    required: [true, '이름은 필수입니다'],
    trim: true,
    minlength: [2, '이름은 최소 2자 이상이어야 합니다'],
    maxlength: [50, '이름은 최대 50자까지 가능합니다']
  },
  email: {
    type: String,
    required: [true, '이메일은 필수입니다'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, '올바른 이메일 형식이 아닙니다']
  },
  password: {
    type: String,
    required: [true, '비밀번호는 필수입니다'],
    minlength: [8, '비밀번호는 최소 8자 이상이어야 합니다']
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  profileImage: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true, // createdAt, updatedAt 자동 생성
  toJSON: {
    transform: function(doc, ret) {
      // JSON 변환 시 비밀번호 필드 제거
      delete ret.password;
      return ret;
    }
  }
});

/**
 * 비밀번호 해싱 미들웨어
 * 사용자 저장 전에 비밀번호를 자동으로 해싱
 */
UserSchema.pre('save', async function(next) {
  // 비밀번호가 수정되지 않았으면 건너뛰기
  if (!this.isModified('password')) return next();
  
  try {
    // 비밀번호 해싱 (salt rounds: 12)
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

/**
 * 비밀번호 검증 메서드
 * 입력된 비밀번호와 저장된 해시를 비교
 */
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('비밀번호 비교 중 오류:', error);
    return false;
  }
};

/**
 * 인덱스 설정
 * 검색 성능 최적화
 */
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ createdAt: -1 });

// 모델 생성 및 내보내기
const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User; 
/*
목차:
- Jest DOM 확장 설정
- 테스트 환경 초기화
- Next.js API 테스트를 위한 폴리필
*/

import '@testing-library/jest-dom';

// Next.js API 테스트를 위한 Web API 폴리필
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// 완전한 Response 모킹
Object.defineProperty(global, 'Response', {
  value: class MockResponse {
    constructor(public body?: any, public init?: any) {}
    status = this.init?.status || 200;
    statusText = this.init?.statusText || 'OK';
    headers = new Map();
    
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
    }
    
    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
    }
    
    static json(data: any, init?: any) {
      return new MockResponse(data, init);
    }
  }
});

Object.defineProperty(global, 'Request', {
  value: class MockRequest {
    constructor(public url: string, public init?: any) {}
    async json() {
      return JSON.parse(this.init?.body || '{}');
    }
    headers = new Map();
    method = this.init?.method || 'GET';
  }
});

Object.defineProperty(global, 'Headers', {
  value: Map
}); 
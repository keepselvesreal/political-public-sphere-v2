/*
목차:
- NextAuth v5 핸들러 import (라인 8-10)
- HTTP 메서드 핸들러 내보내기 (라인 12-13)
*/

import { handlers } from '@/auth'

// NextAuth v5 핸들러 내보내기
export const { GET, POST } = handlers 
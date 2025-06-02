/*
목차:
- NextAuth v5 설정 (라인 8-30)
- Google OAuth 프로바이더 (라인 31-40)
- 콜백 함수들 (라인 41-55)
- 내보내기 (라인 57-60)
*/

import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true, // 개발 환경에서 호스트 신뢰
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // JWT 콜백
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    // 세션 콜백
    session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string
      }
      return session
    },
  },
  debug: process.env.NODE_ENV === "development", // 개발 환경에서 디버그 활성화
})

// 타입 확장
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
} 
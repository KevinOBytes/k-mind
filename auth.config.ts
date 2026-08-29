import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  providers: [], // Providers are defined in auth.ts (server-side only) to avoid database and bcrypt imports on Edge runtime
  session: { strategy: 'jwt' },
  trustHost: true,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET || 'fallback-secret-for-development-only-12345',
} satisfies NextAuthConfig;

export const { auth: edgeAuth } = NextAuth(authConfig);

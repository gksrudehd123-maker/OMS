import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: '이메일', type: 'email' },
        password: { label: '비밀번호', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('이메일과 비밀번호를 입력해주세요');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error('등록되지 않은 이메일입니다');
        }

        const isValid = await compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error('비밀번호가 올바르지 않습니다');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          allowedChannels: user.allowedChannels,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role: string }).role;
        token.allowedChannels = (user as unknown as { allowedChannels: string[] }).allowedChannels;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.allowedChannels = token.allowedChannels;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};

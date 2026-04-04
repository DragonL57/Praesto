import { compare } from 'bcrypt-ts';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import {
  getUser,
  getUserById,
  isAccountLocked,
  incrementFailedLoginAttempts,
  resetFailedLoginAttempts,
  type User as DbUser,
} from '@/lib/db/queries';
import { authConfig } from '@/app/(auth)/auth.config';

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(
        credentials: Record<string, unknown> | undefined,
      ): Promise<DbUser | null> {
        const email = credentials?.email as string;
        const password = credentials?.password as string;

        if (!email || !password) return null;

        const users = await getUser(email);
        if (users.length === 0) return null;

        const userFromDb = users[0];

        if (!userFromDb.emailVerified) {
          throw new Error('EmailNotVerified');
        }

        if (await isAccountLocked(userFromDb.id)) {
          throw new Error('AccountLocked');
        }

        const userPassword = userFromDb.password;
        if (!userPassword) return null;

        const passwordsMatch = await compare(password, userPassword);
        if (!passwordsMatch) {
          await incrementFailedLoginAttempts(userFromDb.id);
          return null;
        }

        await resetFailedLoginAttempts(userFromDb.id);
        return userFromDb;
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        const dbUser = user as DbUser;
        token.id = dbUser.id;
        token.sessionVersion = dbUser.sessionVersion ?? 1;
      }
      if (token.id) {
        const dbUser = await getUserById(token.id as string);
        if (!dbUser || dbUser.sessionVersion !== token.sessionVersion) {
          return {} as typeof token;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { sessionVersion?: number }).sessionVersion =
          token.sessionVersion as number;
      }
      return session;
    },
  },
});

import { compare } from 'bcrypt-ts';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import {
  getUser,
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
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Only update session once per 24 hours (reduces auth calls)
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
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

        // Check if the account is locked
        if (await isAccountLocked(userFromDb.id)) {
          console.log(`Login attempt for locked account: ${email}`);
          return null;
        }

        const userPassword = userFromDb.password;
        if (!userPassword) return null;
        const passwordsMatch = await compare(password, userPassword);

        if (!passwordsMatch) {
          // Increment failed attempts on password mismatch
          await incrementFailedLoginAttempts(userFromDb.id);
          return null;
        }

        // Reset failed attempts counter on successful login
        await resetFailedLoginAttempts(userFromDb.id);

        return userFromDb;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      // `user` is the DbUser from authorize(), only on initial sign-in
      if (user) {
        token.id = user.id;
        // Don't try to set emailVerified on token - keep it simple
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
});

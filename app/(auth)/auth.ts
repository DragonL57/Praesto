/* eslint-disable import/no-unresolved */
import { compare } from 'bcrypt-ts';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

import {
  getUser,
  isAccountLocked,
  incrementFailedLoginAttempts,
  resetFailedLoginAttempts,
  type User as DbUser
} from '@/lib/db/queries';
import { authConfig } from './auth.config';

// It's often recommended to augment NextAuth's types via a d.ts file (e.g., next-auth.d.ts)
// For simplicity here, we'll use inline casting, but a d.ts file is cleaner for larger projects.

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials): Promise<DbUser | null> {
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

        const passwordsMatch = await compare(password, userFromDb.password!);

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
    async jwt({ token, user }) {
      // `user` is the DbUser from authorize(), only on initial sign-in
      if (user) {
        const dbUser = user as DbUser;
        token.id = dbUser.id;
        token.emailVerified = dbUser.emailVerified;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Extend session user type inline
        const extendedUser = session.user as typeof session.user & {
          id?: string;
          emailVerified?: boolean | null;
        };

        if (token.id) {
          extendedUser.id = token.id as string;
        }
        if (typeof token.emailVerified === 'boolean' || token.emailVerified === null) {
          // Cast to the expected type to satisfy TypeScript
          extendedUser.emailVerified = token.emailVerified as (Date & boolean) | null;
        }
      }
      return session;
    },
  },
});

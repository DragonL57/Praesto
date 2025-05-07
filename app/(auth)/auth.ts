/* eslint-disable import/no-unresolved */
import { compare } from 'bcrypt-ts';
import NextAuth from 'next-auth'; // Import default Session and User types from here
import Credentials from 'next-auth/providers/credentials';

import { getUser, type User as DbUser } from '@/lib/db/queries';
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
        const passwordsMatch = await compare(password, userFromDb.password!); // Keep the non-null assertion if password can indeed be null in DB but is required for login
        if (!passwordsMatch) return null;

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
          extendedUser.emailVerified = token.emailVerified;
        }
      }
      return session;
    },
  },
});

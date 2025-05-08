/* eslint-disable import/no-unresolved */
import { compare } from 'bcrypt-ts';
import NextAuth from 'next-auth'; // Import default Session and User types from here
import Credentials from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';

import { getUser, type User as DbUser, createOAuthUser } from '@/lib/db/queries';
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
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      // Simplify the authorization configuration to fix code verifier issues
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      },
      // Explicitly disable PKCE to resolve the error
      checks: ["none"],
      // Use a simpler profile callback to ensure profile data is correctly mapped
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          emailVerified: true
        }
      }
    }),
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
    async signIn({ account, profile }) {
      // Only handle Google sign-ins
      if (account?.provider === 'google' && profile?.email) {
        try {
          // Create or retrieve the user in our database
          await createOAuthUser(profile.email);
          return true;
        } catch (error) {
          console.error('Error creating OAuth user:', error);
          return false;
        }
      }

      return true;
    },
    async jwt({ token, user, account }) {
      // `user` is the DbUser from authorize(), only on initial sign-in
      if (user) {
        const dbUser = user as DbUser;
        token.id = dbUser.id;
        token.emailVerified = dbUser.emailVerified;
      }

      // If it's a Google sign-in, we can consider the email as verified
      if (account?.provider === 'google') {
        token.emailVerified = true;
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

import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: '/login',
    newUser: '/',
  },
  // Add JWT configuration with a secret
  secret: process.env.NEXTAUTH_SECRET,
  // Reduce debug logging in production
  debug: process.env.NODE_ENV === 'development',
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl, headers } }) {
      const isLoggedIn = !!auth?.user;
      const isOnChat = nextUrl.pathname.startsWith('/chat');
      const isOnApi = nextUrl.pathname.startsWith('/api');
      const isOnAuth = nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register');
      const isRootPath = nextUrl.pathname === '/';
      const isSharedChat = nextUrl.pathname.startsWith('/share/');

      // Determine the correct origin from headers to avoid issues with AUTH_URL in local dev
      const host = headers.get('host');
      const protocol = headers.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
      const origin = host ? `${protocol}://${host}` : nextUrl.origin;

      // 1. Allow authenticated users to access chat and api
      if (isOnChat || isOnApi) {
        if (isLoggedIn) return true;
        // Construct redirect URL using the determined origin to avoid hardcoded production URLs from AUTH_URL
        return Response.redirect(new URL(`/login?callbackUrl=${encodeURIComponent(nextUrl.pathname)}`, origin));
      }

      // 2. Redirect logged-in users away from auth pages to chat
      if (isLoggedIn && isOnAuth) {
        return Response.redirect(new URL('/chat', origin));
      }

      // 3. Allow public access to landing, auth pages, and shared content
      return true;
    },
  },
} satisfies NextAuthConfig;

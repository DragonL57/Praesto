import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/login',
    newUser: '/',
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isRootPath = nextUrl.pathname === '/';
      const isOnChat = nextUrl.pathname.startsWith('/chat');
      const isOnApi = nextUrl.pathname.startsWith('/api');
      const isOnRegister = nextUrl.pathname.startsWith('/register');
      const isOnLogin = nextUrl.pathname.startsWith('/login');
      const isSharedChat = nextUrl.pathname.match(/^\/chat\/[a-zA-Z0-9-]+$/); // Match shared chat URL pattern

      // Allow access to landing page without authentication
      if (isRootPath) {
        return true;
      }

      // Redirect authenticated users from login/register pages to /chat
      if (isLoggedIn && (isOnLogin || isOnRegister)) {
        return Response.redirect(new URL('/chat', nextUrl as unknown as URL));
      }

      if (isOnRegister || isOnLogin) {
        return true; // Always allow access to register and login pages
      }
      
      // Allow access to shared chat URLs without authentication
      if (isSharedChat) {
        return true;
      }

      if (isOnChat || isOnApi) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      }

      if (isLoggedIn) {
        return Response.redirect(new URL('/', nextUrl as unknown as URL));
      }

      return true;
    },
  },
} satisfies NextAuthConfig;

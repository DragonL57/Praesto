import NextAuth from 'next-auth';

import { authConfig } from '@/app/(auth)/auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    // Protect the main chat areas
    '/chat/:path*',
    // Add other protected routes here if needed, e.g., '/admin/:path*'

    // Apply middleware logic ALSO to login/register 
    // (e.g., to handle redirecting logged-in users away from them)
    '/login',
    '/register',

    // Exclude auth API routes from middleware to prevent conflicts
    // '/:path*' matches all routes except those starting with /api
    // This ensures auth routes are handled directly by NextAuth
    '/((?!api/auth).)*'
  ],
};

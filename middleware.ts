import NextAuth from 'next-auth';

import { authConfig } from '@/app/(auth)/auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  // Matcher simplified to focus on core protected areas and auth pages
  matcher: [
    // Protect the main chat areas
    '/chat/:path*',
    // Add other protected routes here if needed, e.g., '/admin/:path*'

    // Apply middleware logic ALSO to login/register 
    // (e.g., to handle redirecting logged-in users away from them)
    '/login',
    '/register'
    // Note: This no longer broadly matches /api routes. Auth.js internal routes
    // like /api/auth/session should handle their own auth checks.
  ],
};

import NextAuth from 'next-auth';

import { authConfig } from '@/app/(auth)/auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  // Update matcher to include auth API routes
  matcher: [
    // Protect the main chat areas
    '/chat/:path*',
    // Add other protected routes here if needed, e.g., '/admin/:path*'

    // Apply middleware logic ALSO to login/register 
    // (e.g., to handle redirecting logged-in users away from them)
    '/login',
    '/register',

    // Include the auth API routes
    '/api/auth/:path*'
    // Note: This now includes auth routes but not all API routes
  ],
};

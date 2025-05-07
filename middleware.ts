import NextAuth from 'next-auth';

import { authConfig } from '@/app/(auth)/auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  // Protect API routes and authenticated pages while allowing access to auth pages and landing page
  // But also check auth pages to redirect authenticated users
  matcher: [
    // Protect all API routes by default, EXCEPT:
    //  - /api/get_transcript (existing exclusion)
    //  - /api/auth/forgot-password
    //  - /api/auth/reset-password
    //  - /api/auth/verify-email
    //  - /api/cron/cleanup-unverified-users (NEW: cron job exclusion)
    //  - /api/auth/register (if you have a public registration API endpoint)
    '/((?!api/get_transcript|api/auth/forgot-password|api/auth/reset-password|api/auth/verify-email|api/cron/cleanup-unverified-users|api/auth/register).*)api/:path*',
    '/chat/:path*',
    '/login',
    '/register'
  ],
};

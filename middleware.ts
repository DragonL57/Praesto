import NextAuth from 'next-auth';

import { authConfig } from '@/app/(auth)/auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  // Protect API routes and authenticated pages while allowing access to the landing page
  // Exclude get_transcript API from auth to allow public access
  matcher: ['/((?!api/get_transcript).*)api/:path*', '/chat/:path*', '/login', '/register'],
};

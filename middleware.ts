import NextAuth from 'next-auth';

import { authConfig } from '@/app/(auth)/auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  // Protect API routes and authenticated pages while allowing access to auth pages and landing page
  // Exclude auth pages from the matcher so they can be accessed directly
  matcher: ['/((?!api/get_transcript).*)api/:path*', '/chat/:path*'],
};

import NextAuth from 'next-auth';

import { authConfig } from '@/app/(auth)/auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  // Protect API routes and authenticated pages while allowing access to the landing page
  matcher: ['/chat/:path*', '/api/:path*', '/login', '/register'],
};

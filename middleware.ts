import NextAuth from 'next-auth';

import { authConfig } from '@/app/(auth)/auth.config';

export default NextAuth(authConfig).auth;

export const config = {
  // Exclude the root path from authentication checks
  matcher: ['/chat/:path*', '/api/:path*', '/login', '/register'],
};

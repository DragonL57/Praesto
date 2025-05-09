import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { authConfig } from '@/app/(auth)/auth.config';
import { rateLimit } from '@/lib/rate-limit';

// Middleware function to handle both authentication and rate limiting
export async function middleware(request: NextRequest) {
  // Apply rate limiting for auth endpoints
  const rateLimitResponse = rateLimit(request);
  if (rateLimitResponse.status === 429) {
    return rateLimitResponse;
  }

  // Apply NextAuth middleware for protected routes
  const authMiddleware = await NextAuth(authConfig).auth();

  // Create a new response if authMiddleware is not a NextResponse
  // This ensures we always have a NextResponse object with headers
  const response = authMiddleware instanceof NextResponse
    ? authMiddleware
    : NextResponse.next();

  // Set security headers - now we're guaranteed to have headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"
  );

  return response;
}

export const config = {
  matcher: [
    // Protect the main chat areas
    '/chat/:path*',
    // Add other protected routes here if needed, e.g., '/admin/:path*'

    // Apply middleware logic ALSO to login/register 
    // (e.g., to handle redirecting logged-in users away from them)
    '/login',
    '/register',

    // Auth API routes
    '/api/auth/:path*',
    '/(auth)/api/auth/:path*',

    // Exclude other API routes from middleware to prevent conflicts
    '/((?!api/).)*'
  ],
};

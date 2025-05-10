import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { authConfig } from '@/app/(auth)/auth.config';
import { rateLimit } from '@/lib/rate-limit';

// Helper to quickly check if a path matches any of the patterns
function pathMatchesPatterns(path: string, patterns: string[]): boolean {
  return patterns.some(pattern => {
    // Simple wildcard matching for patterns ending with *
    if (pattern.endsWith('*')) {
      return path.startsWith(pattern.slice(0, -1));
    }
    return path === pattern;
  });
}

// AI API endpoints that should bypass most middleware processing
const AI_API_ENDPOINTS = [
  '/api/chat',
  '/api/(chat)/api/chat',
  '/api/get_transcript',
  '/api/document',
];

// Middleware function to handle both authentication and rate limiting
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Fast path for AI API endpoints - minimal processing
  if (pathMatchesPatterns(path, AI_API_ENDPOINTS)) {
    // For AI endpoints, we only need to verify authentication, not full middleware stack
    const authMiddleware = await NextAuth(authConfig).auth();

    // If auth fails, return the auth response
    if (authMiddleware && 'status' in authMiddleware && authMiddleware.status !== 200) {
      return authMiddleware;
    }

    // Otherwise, quickly pass through with minimal processing
    const response = NextResponse.next();

    // Set only essential security headers for API endpoints
    response.headers.set('X-Content-Type-Options', 'nosniff');

    return response;
  }

  // Regular path for non-AI endpoints

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
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-src 'self' https://vercel.live;"
  );

  return response;
}

export const config = {
  matcher: [
    // Protect the main chat areas
    '/chat/:path*',

    // Apply middleware logic to login/register 
    // to handle redirecting logged-in users away from them
    '/login',
    '/register',

    // Use a single standardized auth route pattern 
    '/api/auth/:path*',

    // Include AI API endpoints to apply optimized middleware
    '/api/chat',
    '/api/get_transcript',
    '/api/document',

    // Exclude other API routes from middleware to prevent conflicts
    '/((?!api/).)*'
  ],
};

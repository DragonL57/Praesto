import { auth } from './lib/auth-handler';
import { rateLimitEdge } from './lib/rate-limit-edge';
import type { NextRequest } from 'next/server';

export default async function middleware(request: NextRequest) {
  const rateLimitResponse = rateLimitEdge(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  return (
    auth as unknown as (request: NextRequest) => Promise<Response | undefined>
  )(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};

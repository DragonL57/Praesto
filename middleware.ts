import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from './lib/auth-handler';
import { rateLimitEdge } from './lib/rate-limit-edge';

const PUBLIC_API_PREFIXES = ['/api/public/', '/api/cron/', '/api/auth/'];

export default async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const rateLimitResponse = await rateLimitEdge(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  if (PUBLIC_API_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return NextResponse.next();
  }

  return (
    auth as unknown as (request: NextRequest) => Promise<Response | undefined>
  )(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
};

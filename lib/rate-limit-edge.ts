import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const COOKIE_MAX_AGE = 15 * 60;

const AUTH_ENDPOINT_LIMITS: Record<string, number> = {
  'forgot-password:POST': 10,
  'login:POST': 20,
  'register:POST': 10,
  'reset-password:POST': 10,
  'verify-email:POST': 20,
  'callback/credentials:POST': 20,
};

export function rateLimitEdge(request: NextRequest): NextResponse | null {
  const path = request.nextUrl.pathname;
  const method = request.method;

  const isAuthAction = path.startsWith('/api/auth/');
  if (!isAuthAction) return null;

  const endpointKey = path.split('/api/auth/').pop() || '';
  const limitKey = `${endpointKey}:${method}`;

  const maxRequests = AUTH_ENDPOINT_LIMITS[limitKey] || 100;

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const key = `${ip}:${limitKey}`;

  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  const rateLimitCookie = request.cookies.get('rl_data')?.value;
  let requests: Array<{ key: string; timestamp: number }> = [];

  if (rateLimitCookie) {
    try {
      requests = JSON.parse(decodeURIComponent(rateLimitCookie));
    } catch {
      requests = [];
    }
  }

  requests = requests.filter((r) => r.key === key && r.timestamp > windowStart);

  if (requests.length >= maxRequests) {
    return NextResponse.json(
      { success: false, message: 'Too many requests, please try again later.' },
      { status: 429 },
    );
  }

  requests.push({ key, timestamp: now });

  const response = NextResponse.next();
  response.cookies.set(
    'rl_data',
    encodeURIComponent(JSON.stringify(requests.slice(-500))),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
      sameSite: 'lax',
    },
  );

  return response;
}

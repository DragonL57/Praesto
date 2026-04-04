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

async function createHmacSignature(
  data: string,
  secret: string,
): Promise<string> {
  return crypto.subtle
    .importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    .then((key) =>
      crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)),
    )
    .then((buffer) =>
      Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(''),
    );
}

export async function rateLimitEdge(
  request: NextRequest,
): Promise<NextResponse | null> {
  const path = request.nextUrl.pathname;
  const method = request.method;

  const isAuthAction = path.startsWith('/api/auth/');
  if (!isAuthAction) return null;

  const endpointKey = path.split('/api/auth/').pop() || '';
  const limitKey = `${endpointKey}:${method}`;

  const maxRequests = AUTH_ENDPOINT_LIMITS[limitKey] || 100;

  const _ip =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const now = Date.now();
  const windowId = Math.floor(now / RATE_LIMIT_WINDOW_MS);

  const cookieName = `rl_${limitKey.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const cookieData = request.cookies.get(cookieName)?.value;

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is required for rate limiting');
  }

  let counter = 0;
  let isValid = false;

  if (cookieData) {
    try {
      const [storedWindow, storedCount, signature] = cookieData.split('|');
      const expectedSig = await createHmacSignature(
        `${storedWindow}:${storedCount}`,
        secret,
      );

      if (
        signature === expectedSig &&
        parseInt(storedWindow, 10) === windowId
      ) {
        counter = parseInt(storedCount, 10);
        isValid = true;
      }
    } catch (error) {
      console.warn(
        '[rateLimitEdge] Invalid or tampered rate limit cookie:',
        error,
      );
    }
  }

  if (!isValid) {
    counter = 0;
  }

  if (counter >= maxRequests) {
    return NextResponse.json(
      { success: false, message: 'Too many requests, please try again later.' },
      { status: 429 },
    );
  }

  counter += 1;

  const signature = await createHmacSignature(
    `${windowId}:${counter}`,
    process.env.NEXTAUTH_SECRET || 'fallback-secret',
  );

  const response = NextResponse.next();
  response.cookies.set(cookieName, `${windowId}|${counter}|${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax',
  });

  return response;
}

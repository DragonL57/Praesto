import { NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/services/google-calendar-api';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  if (action === 'authorize') {
    try {
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const state = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const authUrl = getAuthorizationUrl(state);

      const response = NextResponse.redirect(authUrl);
      response.cookies.set('google_oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 600,
        path: '/',
        sameSite: 'lax',
      });

      return response;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate authorization URL',
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json(
    {
      success: false,
      error: 'Invalid action',
    },
    { status: 400 },
  );
}

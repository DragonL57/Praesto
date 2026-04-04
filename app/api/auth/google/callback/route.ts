import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  getTokensFromCode,
  getAuthorizationUrl,
} from '@/lib/services/google-calendar-api';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const action = searchParams.get('action');
  const error = searchParams.get('error');
  const returnedState = searchParams.get('state');

  if (error) {
    return NextResponse.json(
      {
        success: false,
        error: `Authorization failed: ${error}`,
      },
      { status: 400 },
    );
  }

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

  if (!code) {
    return NextResponse.json(
      {
        success: false,
        error: 'No authorization code provided',
      },
      { status: 400 },
    );
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get('google_oauth_state')?.value;

  if (!savedState || !returnedState || savedState !== returnedState) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid state parameter. Possible CSRF attack detected.',
      },
      { status: 403 },
    );
  }

  try {
    const tokens = await getTokensFromCode(code);

    cookieStore.delete('google_oauth_state');

    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        success: true,
        message: 'Google Calendar connected successfully!',
        tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expiry_date,
        },
        instructions: [
          'Copy these tokens to your .env.local file:',
          `GOOGLE_ACCESS_TOKEN=${tokens.access_token}`,
          `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`,
        ],
      });
    }

    return NextResponse.redirect(
      new URL('/settings?calendar=connected', request.url),
    );
  } catch (error) {
    console.error('Failed to exchange authorization code for tokens:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to authenticate with Google Calendar',
      },
      { status: 500 },
    );
  }
}

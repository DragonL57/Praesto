import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getTokensFromCode, getAuthorizationUrl } from '@/lib/google-calendar-api';

/**
 * Google Calendar OAuth Callback Handler
 * 
 * This route handles the OAuth 2.0 callback from Google after user authorization.
 * 
 * Flow:
 * 1. User visits /api/auth/google?action=authorize to start OAuth flow
 * 2. User is redirected to Google's consent screen
 * 3. After authorization, Google redirects back to this endpoint with code
 * 4. Exchange code for access and refresh tokens
 * 5. Store tokens securely (you should save to database)
 */

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const action = searchParams.get('action');
    const error = searchParams.get('error');

    // Handle authorization errors
    if (error) {
        return NextResponse.json(
            {
                success: false,
                error: `Authorization failed: ${error}`
            },
            { status: 400 }
        );
    }

    // Start OAuth flow - redirect to Google
    if (action === 'authorize') {
        try {
            const authUrl = getAuthorizationUrl();
            return NextResponse.redirect(authUrl);
        } catch {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Failed to generate authorization URL'
                },
                { status: 500 }
            );
        }
    }

    // Handle OAuth callback - exchange code for tokens
    if (!code) {
        return NextResponse.json(
            {
                success: false,
                error: 'No authorization code provided'
            },
            { status: 400 }
        );
    }

    try {
        const tokens = await getTokensFromCode(code);

        // TODO: Store tokens securely
        // In production, you should:
        // 1. Get the authenticated user's ID (from session/JWT)
        // 2. Encrypt the tokens
        // 3. Store them in your database associated with the user
        // 
        // Example:
        // await db.update(users)
        //   .set({ 
        //     googleAccessToken: encrypt(tokens.access_token),
        //     googleRefreshToken: encrypt(tokens.refresh_token),
        //   })
        //   .where(eq(users.id, userId));

        // For development/testing, return the tokens
        // WARNING: Do NOT expose tokens in production!
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

        // In production, redirect to success page
        return NextResponse.redirect(
            new URL('/settings?calendar=connected', request.url)
        );

    } catch (error) {
        console.error('Failed to exchange authorization code for tokens:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to authenticate with Google Calendar'
            },
            { status: 500 }
        );
    }
}

import { NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/google-calendar-api';

/**
 * Google Calendar OAuth Start Handler
 *
 * This route starts the OAuth 2.0 flow by redirecting to Google's consent screen.
 * Usage: /api/auth/google?action=authorize
 */
export async function GET(request: Request) {
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'authorize') {
        try {
            const authUrl = getAuthorizationUrl();
            return NextResponse.redirect(authUrl);
        } catch (_error) {
            return NextResponse.json({
                success: false,
                error: 'Failed to generate authorization URL',
            }, { status: 500 });
        }
    }

    return NextResponse.json({
        success: false,
        error: 'Invalid action',
    }, { status: 400 });
}

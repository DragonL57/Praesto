// This file creates a specific route handler for /api/auth/signout
// NextAuth.js client looks for this endpoint for signout operations
import { signOut } from '@/app/auth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        // Get the CSRF token and callbackUrl from the request body
        const body = await request.json().catch(() => ({}));

        // Perform the server-side signout operation
        await signOut({ redirect: false });

        // Return a success response
        return NextResponse.json(
            {
                url: body.callbackUrl || '/'
            },
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );
    } catch (error) {
        console.error('Error during signout:', error);

        // Return an error response
        return NextResponse.json(
            {
                error: 'Failed to sign out'
            },
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );
    }
}
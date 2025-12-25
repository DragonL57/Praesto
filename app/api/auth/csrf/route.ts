// This file creates a specific route handler for /api/auth/csrf
// NextAuth.js client looks for this endpoint for CSRF protection
import { NextResponse } from 'next/server';
import crypto from 'node:crypto';

export async function GET() {
    // Generate a CSRF token (this is a simplified version)
    const csrfToken = crypto.randomBytes(32).toString('hex');

    // Return the CSRF token as JSON with proper headers
    return NextResponse.json(
        { csrfToken },
        {
            headers: {
                'Content-Type': 'application/json',
            },
        }
    );
}
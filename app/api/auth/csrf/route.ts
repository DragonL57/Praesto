// This file creates a specific route handler for /api/auth/csrf
// NextAuth.js client looks for this endpoint for CSRF protection
import { NextResponse } from 'next/server';

export async function GET() {
  // Generate a CSRF token (this is a simplified version)
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const csrfToken = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Return the CSRF token as JSON with proper headers
  return NextResponse.json(
    { csrfToken },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
}

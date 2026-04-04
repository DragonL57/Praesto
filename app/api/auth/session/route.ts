// This file creates a specific route handler for /api/auth/session
// NextAuth.js client looks for this endpoint to get session info
import { auth } from '@/app/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();

  // Return the session data as JSON with proper headers
  return NextResponse.json(session, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

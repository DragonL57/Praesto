import { type NextRequest, NextResponse } from 'next/server';
import { verifyEmail } from '@/lib/db/queries';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token } = body;

    if (!email || !token) {
      return NextResponse.json(
        { success: false, message: 'Email and token are required' },
        { status: 400 },
      );
    }

    const success = await verifyEmail(email, token);

    if (success) {
      return NextResponse.json(
        { success: true, message: 'Email verified successfully' },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired verification token' },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error('Error during email verification:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred during verification' },
      { status: 500 },
    );
  }
}

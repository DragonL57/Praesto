import { type NextRequest, NextResponse } from 'next/server';
import { getUser, setPasswordResetToken } from '@/lib/db/queries';
import { generateToken, sendPasswordResetEmail } from '@/lib/services/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 },
      );
    }

    const users = await getUser(email);

    if (users.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message:
            'If an account with that email exists, a password reset link has been sent',
        },
        { status: 200 },
      );
    }

    const resetToken = generateToken();

    const result = await setPasswordResetToken(email, resetToken);

    if (!result) {
      return NextResponse.json(
        { success: false, message: 'Failed to generate password reset token' },
        { status: 500 },
      );
    }

    const emailSent = await sendPasswordResetEmail(email, resetToken);

    if (!emailSent) {
      return NextResponse.json(
        { success: false, message: 'Failed to send password reset email' },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { success: true, message: 'Password reset email sent' },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while processing your request',
      },
      { status: 500 },
    );
  }
}

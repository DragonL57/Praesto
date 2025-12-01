import { type NextRequest, NextResponse } from 'next/server';
import { getUser, setPasswordResetToken } from '@/lib/db/queries';
import { generateToken, sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    console.log('[API /api/auth/forgot-password] Route hit');
    try {
        const body = await request.json();
        const { email } = body;
        console.log('[API /api/auth/forgot-password] Received email from body:', email);

        if (!email) {
            console.log('[API /api/auth/forgot-password] Email not provided in body');
            return NextResponse.json(
                { success: false, message: 'Email is required' },
                { status: 400 }
            );
        }

        console.log('[API /api/auth/forgot-password] Looking up user...');
        const users = await getUser(email);
        console.log('[API /api/auth/forgot-password] User lookup result:', users.length > 0 ? `User found: ${users[0]?.id}` : 'User not found');

        if (users.length === 0) {
            console.log('[API /api/auth/forgot-password] User not found, returning generic success (security)');
            return NextResponse.json(
                { success: true, message: 'If an account with that email exists, a password reset link has been sent' },
                { status: 200 }
            );
        }

        const resetToken = generateToken();
        console.log('[API /api/auth/forgot-password] Generated reset token for email:', email, 'Token:', resetToken);

        const result = await setPasswordResetToken(email, resetToken);
        console.log('[API /api/auth/forgot-password] Token saved to database result:', result);

        if (!result) {
            console.error('[API /api/auth/forgot-password] Failed to set password reset token in DB for email:', email);
            return NextResponse.json(
                { success: false, message: 'Failed to generate password reset token' },
                { status: 500 }
            );
        }

        // ---- Restore Email Sending Logic -----
        console.log('[API /api/auth/forgot-password] Attempting to send password reset email to:', email);
        const emailSent = await sendPasswordResetEmail(email, resetToken);
        console.log('[API /api/auth/forgot-password] Email sending result:', emailSent);

        if (!emailSent) {
            console.error('[API /api/auth/forgot-password] Failed to send password reset email to:', email);
            return NextResponse.json(
                { success: false, message: 'Failed to send password reset email' },
                { status: 500 }
            );
        }

        console.log('[API /api/auth/forgot-password] Password reset email sent successfully to:', email);
        return NextResponse.json(
            { success: true, message: 'Password reset email sent' }, // This is the final, user-facing success message
            { status: 200 }
        );

    } catch (error) {
        console.error('[API /api/auth/forgot-password] CATCH BLOCK ERROR:', error);
        let requestBodyForError = 'Could not parse request body';
        try {
            const clonedRequest = request.clone();
            requestBodyForError = await clonedRequest.text();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
            requestBodyForError = 'Failed to clone or read request body for error logging.';
        }
        console.error('[API /api/auth/forgot-password] Request body during error:', requestBodyForError);
        return NextResponse.json(
            { success: false, message: 'An error occurred in API route while processing request' },
            { status: 500 }
        );
    }
} 
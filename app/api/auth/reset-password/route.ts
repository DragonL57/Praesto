import { type NextRequest, NextResponse } from 'next/server';
import { resetPassword } from '@/lib/db/queries';
import { z } from 'zod';

// Password validation schema
const passwordSchema = z.string()
    .min(6, "Password must be at least 6 characters long")
    .max(100, "Password is too long")
    .refine(password => /[a-z]/.test(password), "Password must contain at least one lowercase letter")
    .refine(password => /[0-9]/.test(password), "Password must contain at least one number");

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, token, password } = body;

        if (!email || !token || !password) {
            return NextResponse.json(
                { success: false, message: 'Email, token, and password are required' },
                { status: 400 }
            );
        }

        // Validate password
        try {
            passwordSchema.parse(password);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return NextResponse.json(
                    {
                        success: false,
                        message: error.errors[0]?.message || 'Invalid password format'
                    },
                    { status: 400 }
                );
            }
        }

        // Reset password
        const success = await resetPassword(email, token, password);

        if (success) {
            return NextResponse.json(
                { success: true, message: 'Password reset successfully' },
                { status: 200 }
            );
        } else {
            return NextResponse.json(
                { success: false, message: 'Invalid or expired reset token' },
                { status: 400 }
            );
        }
    } catch (error) {
        console.error('Error during password reset:', error);
        return NextResponse.json(
            { success: false, message: 'An error occurred during password reset' },
            { status: 500 }
        );
    }
} 
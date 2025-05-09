import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory store for rate limiting
// In production, you'd want to use Redis or another distributed store
const rateLimitStore = new Map<string, { count: number, timestamp: number }>();

// Rate limit middleware for auth endpoints
export function rateLimit(req: NextRequest) {
    // Get client IP from forwarded header or use a fallback
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
        req.headers.get('x-real-ip') ||
        'unknown';
    const path = req.nextUrl.pathname;

    // Only apply rate limiting to authentication endpoints
    if (!path.startsWith('/api/auth/') &&
        !path.startsWith('/(auth)/api/auth/') &&
        path !== '/login' &&
        path !== '/register') {
        return NextResponse.next();
    }

    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    const maxRequests = path.includes('forgot-password') ? 3 : 5; // Stricter limits for password reset

    const key = `${ip}:${path}`;
    const record = rateLimitStore.get(key) || { count: 0, timestamp: now };

    // Reset count if the window has passed
    if (now - record.timestamp > windowMs) {
        record.count = 0;
        record.timestamp = now;
    }

    record.count++;
    rateLimitStore.set(key, record);

    const remaining = Math.max(0, maxRequests - record.count);

    // Set headers to inform about rate limit
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', (record.timestamp + windowMs).toString());

    // If rate limit is exceeded, return 429 Too Many Requests
    if (record.count > maxRequests) {
        return NextResponse.json(
            { success: false, message: 'Too many requests, please try again later.' },
            { status: 429 }
        );
    }

    return response;
}
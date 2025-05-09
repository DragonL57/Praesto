import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory store for rate limiting
// In production, you'd want to use Redis or another distributed store
const rateLimitStore = new Map<string, { count: number, timestamp: number }>();

// Clean up old entries every 30 minutes
const CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
        if (now - record.timestamp > CLEANUP_INTERVAL) {
            rateLimitStore.delete(key);
        }
    }
}, CLEANUP_INTERVAL);

// Rate limit middleware for auth endpoints
export function rateLimit(req: NextRequest) {
    // Get client IP from forwarded header or use a fallback
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ||
        req.headers.get('x-real-ip') ||
        'unknown';
    const path = req.nextUrl.pathname;
    const method = req.method;

    // Only apply strict rate limiting to auth actions (POST requests)
    // For login/register page views, apply a much higher limit
    const isAuthAction = (
        (path.startsWith('/api/auth/') || path.startsWith('/(auth)/api/auth/')) ||
        ((path === '/login' || path === '/register') && method === 'POST')
    );

    // Don't rate limit normal page views
    if (!isAuthAction && method === 'GET') {
        return NextResponse.next();
    }

    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes

    // Different limits based on the endpoint and method
    let maxRequests = 20; // Default higher limit for most requests

    if (isAuthAction) {
        // Stricter limits for auth actions
        if (path.includes('forgot-password') && method === 'POST') {
            maxRequests = 5; // 5 password reset attempts per 15 minutes
        } else if ((path === '/login' || path === '/api/auth/callback/credentials') && method === 'POST') {
            maxRequests = 10; // 10 login attempts per 15 minutes
        } else if (path === '/register' && method === 'POST') {
            maxRequests = 5; // 5 registration attempts per 15 minutes
        }
    }

    const key = `${ip}:${path}:${method}`;
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
        console.log(`Rate limit exceeded for ${key} - count: ${record.count}, limit: ${maxRequests}`);
        return NextResponse.json(
            { success: false, message: 'Too many requests, please try again later.' },
            { status: 429 }
        );
    }

    return response;
}
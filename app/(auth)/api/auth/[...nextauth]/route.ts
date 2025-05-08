import { NextRequest } from 'next/server';
import {
    GET as AuthGET,
    POST as AuthPOST
} from '@/app/(auth)/auth';

// Export handlers with additional logging for debugging
export const GET = async (req: NextRequest) => {
    try {
        const response = await AuthGET(req);
        return response;
    } catch (error) {
        console.error('Auth GET handler error:', error);
        return new Response(JSON.stringify({ error: 'Authentication error' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
};

export const POST = async (req: NextRequest) => {
    try {
        const response = await AuthPOST(req);
        return response;
    } catch (error) {
        console.error('Auth POST handler error:', error);
        return new Response(JSON.stringify({ error: 'Authentication error' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
};

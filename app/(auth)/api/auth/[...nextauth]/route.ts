// NextAuth route handler for the original location
import { NextRequest } from 'next/server';
/* eslint-disable import/no-unresolved */
import { GET as AuthGET, POST as AuthPOST } from '@/app/(auth)/auth';

// Export handlers with additional logging for debugging
export const GET = async (req: NextRequest) => {
    try {
        const response = await AuthGET(req);
        return response;
    } catch (error) {
        console.error('Auth GET handler error:', error);
        // Return a proper JSON error response
        return Response.json({ error: 'Authentication error' }, { status: 500 });
    }
};

export const POST = async (req: NextRequest) => {
    try {
        const response = await AuthPOST(req);
        return response;
    } catch (error) {
        console.error('Auth POST handler error:', error);
        // Return a proper JSON error response
        return Response.json({ error: 'Authentication error' }, { status: 500 });
    }
};

// NextAuth route handler for the original location
import { NextRequest } from 'next/server';
/* eslint-disable import/no-unresolved */
import { GET as AuthGET, POST as AuthPOST } from '@/app/(auth)/auth';

// Export handlers with improved error handling
export const GET = async (req: NextRequest) => {
    try {
        const response = await AuthGET(req);
        return response;
    } catch (error) {
        console.error('Auth GET handler error:', error);
        // Return a more detailed error response with status code
        return Response.json({
            error: 'Authentication error',
            message: error instanceof Error ? error.message : 'Unknown error',
            status: 'error'
        }, { status: 500 });
    }
};

export const POST = async (req: NextRequest) => {
    try {
        const response = await AuthPOST(req);
        return response;
    } catch (error) {
        console.error('Auth POST handler error:', error);
        // Return a more detailed error response with status code
        return Response.json({
            error: 'Authentication error',
            message: error instanceof Error ? error.message : 'Unknown error',
            status: 'error'
        }, { status: 500 });
    }
};

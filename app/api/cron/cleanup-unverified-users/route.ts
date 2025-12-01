import { type NextRequest, NextResponse } from 'next/server';
import { deleteOldUnverifiedUsers } from '@/lib/db/queries';

// This should be stored in your environment variables
const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
    console.log('[API Cron Cleanup] /api/cron/cleanup-unverified-users route hit');

    // 1. Authenticate the request
    const authToken = request.headers.get('authorization')?.split('Bearer ')[1];

    if (!CRON_SECRET) {
        console.error('[API Cron Cleanup] CRON_SECRET is not set in environment variables.');
        return NextResponse.json({ success: false, message: 'Internal server configuration error.' }, { status: 500 });
    }

    if (authToken !== CRON_SECRET) {
        console.warn('[API Cron Cleanup] Unauthorized attempt to access cron job. Provided token:', authToken);
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    console.log('[API Cron Cleanup] Cron job authorized.');

    try {
        // 2. Define the cleanup window (e.g., users older than 48 hours)
        const hoursAgo = 48;
        const olderThanDate = new Date();
        olderThanDate.setHours(olderThanDate.getHours() - hoursAgo);

        console.log(`[API Cron Cleanup] Deleting unverified users created before: ${olderThanDate.toISOString()}`);

        // 3. Call the database query
        const { count } = await deleteOldUnverifiedUsers(olderThanDate);

        console.log(`[API Cron Cleanup] Successfully deleted ${count} old, unverified users.`);
        return NextResponse.json({ success: true, message: `Cleanup successful. Deleted ${count} users.` });

    } catch (error) {
        console.error('[API Cron Cleanup] Error during cron job execution:', error);
        return NextResponse.json({ success: false, message: 'An error occurred during cleanup.' }, { status: 500 });
    }
} 
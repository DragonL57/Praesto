import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { thinkingLevel } = await request.json();

        if (!thinkingLevel) {
            return NextResponse.json({ error: 'Thinking level is required' }, { status: 400 });
        }

        // Validate thinking level
        const validLevels = ['minimal', 'low', 'medium', 'high'];
        if (!validLevels.includes(thinkingLevel)) {
            return NextResponse.json({ error: 'Invalid thinking level' }, { status: 400 });
        }

        // Set the cookie with the thinking level preference
        const cookieStore = await cookies();
        cookieStore.set('thinking-level', thinkingLevel);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error setting thinking level cookie:', error);
        return NextResponse.json({ error: 'Failed to set thinking level preference' }, { status: 500 });
    }
}

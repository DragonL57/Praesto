import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { model } = await request.json();

        if (!model) {
            return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
        }

        // Set the cookie with the model preference
        const cookieStore = await cookies();
        cookieStore.set('chat-model', model);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error setting model cookie:', error);
        return NextResponse.json({ error: 'Failed to set model preference' }, { status: 500 });
    }
}
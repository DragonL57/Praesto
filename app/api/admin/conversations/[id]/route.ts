import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { chat } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// Connect to the database
const url = process.env.POSTGRES_URL;
if (!url) throw new Error('POSTGRES_URL is not defined');
const client = postgres(url);
const db = drizzle(client);

// GET a single conversation
export async function GET(
  _request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const { id } = params;

    const result = await db.select().from(chat).where(eq(chat.id, id));

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 },
    );
  }
}

// PATCH to update conversation visibility
export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    const { id } = params;
    const { visibility } = await request.json();

    if (!visibility || (visibility !== 'public' && visibility !== 'private')) {
      return NextResponse.json(
        { error: 'Invalid visibility value. Must be "public" or "private"' },
        { status: 400 },
      );
    }

    const result = await db
      .update(chat)
      .set({ visibility })
      .where(eq(chat.id, id))
      .returning({ id: chat.id, visibility: chat.visibility });

    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating conversation visibility:', error);
    return NextResponse.json(
      { error: 'Failed to update conversation visibility' },
      { status: 500 },
    );
  }
}

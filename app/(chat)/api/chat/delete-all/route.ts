/* eslint-disable import/no-unresolved */
import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db';
import { chat, message, vote } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all chats for this user
    const userChats = await db
      .select({ id: chat.id })
      .from(chat)
      .where(eq(chat.userId, userId));

    const chatIds = userChats.map(c => c.id);

    // No chats found for user
    if (chatIds.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    // Delete all votes for these chats
    await db.delete(vote).where(
      and(
        eq(vote.chatId, chatIds[0]) // We'll delete one by one if multiple chats
      )
    );

    // Delete all messages for these chats
    await db.delete(message).where(
      and(
        eq(message.chatId, chatIds[0]) // Same approach
      )
    );

    // Delete all chats for this user
    const result = await db.delete(chat).where(eq(chat.userId, userId));

    return NextResponse.json({
      success: true,
      deleted: userChats.length
    });
  } catch (error) {
    console.error('Error deleting chats:', error);
    return NextResponse.json(
      { error: 'Failed to delete chats' },
      { status: 500 }
    );
  }
}
/* eslint-disable import/no-unresolved */
import { NextResponse } from 'next/server';
import { auth } from '@/app/auth';
import { deleteChatById, getChatsByUserId } from '@/lib/db/queries';

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all chats for this user
    const { chats: userChats } = await getChatsByUserId({
      id: userId,
      limit: 1000, // Using a high limit to get all chats
      startingAfter: null,
      endingBefore: null,
    });

    // No chats found for user
    if (userChats.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 });
    }

    // Delete each chat (deleteChatById also deletes associated messages and votes)
    const deletePromises = userChats.map((chat) =>
      deleteChatById({ id: chat.id }),
    );

    await Promise.all(deletePromises);

    return NextResponse.json({
      success: true,
      deleted: userChats.length,
    });
  } catch (error) {
    console.error('Error deleting chats:', error);
    return NextResponse.json(
      { error: 'Failed to delete chats' },
      { status: 500 },
    );
  }
}

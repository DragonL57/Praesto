import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { user, chat, message } from '@/lib/db/schema';
import { desc, count, sql, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// Connect to the database
const url = process.env.POSTGRES_URL;
if (!url) throw new Error('POSTGRES_URL is not defined');
const client = postgres(url);
const db = drizzle(client);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Number.parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Subquery to get message counts per chat
    const chatMessages = db
      .select({
        chatId: message.chatId,
        messageCount: count(message.id).as('messageCount'),
        lastMessageTime: sql<string>`MAX(${message.createdAt})`.as('lastMessageTime'),
      })
      .from(message)
      .groupBy(message.chatId)
      .as('chatMessages');

    // Base query conditions
    const conditions = searchQuery
      ? sql`${chat.title} LIKE ${`%${searchQuery.toLowerCase()}%`}`
      : sql`1=1`;

    // Apply status filter if not "all"
    // Note: This is a placeholder since your schema might not have a status field
    // You might need to adapt this based on your actual data model
    if (status !== 'all') {
      // For example, if "archived" status is determined by a field in your chat table
      // conditions = and(conditions, eq(chat.visibility, status === 'active' ? 'public' : 'private'));
    }

    // Main query with filtering
    const query = db
      .select({
        id: chat.id,
        userId: chat.userId,
        title: chat.title,
        userName: user.email, // Using email as userName since we don't have a name field
        messagesCount: chatMessages.messageCount,
        lastActive: chatMessages.lastMessageTime, // Now properly referencing the aliased field
        model: sql<string>`'unknown'`.as('model'), // Placeholder - actual model info may be stored elsewhere
        visibility: chat.visibility,
      })
      .from(chat)
      .leftJoin(user, eq(chat.userId, user.id))
      .leftJoin(chatMessages, eq(chat.id, chatMessages.chatId))
      .where(conditions)
      .orderBy(desc(chatMessages.lastMessageTime)) // Using the proper alias here too
      .limit(limit)
      .offset(offset);

    const conversations = await query;

    // Calculate total conversation count for pagination
    const totalCount = await db
      .select({ count: count() })
      .from(chat)
      .where(conditions);

    return NextResponse.json({
      conversations,
      totalCount: totalCount[0].count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
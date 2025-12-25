import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { user, chat, message } from '@/lib/db/schema';
import { desc, count, sql, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search') || '';
    // Removed unused status variable
    const limit = Number.parseInt(searchParams.get('limit') || '50');
    const offset = Number.parseInt(searchParams.get('offset') || '0');

    // Subquery to get message counts per user
    const userMessages = db
      .select({
        userId: chat.userId,
        messageCount: count(message.id).as('messageCount'),
      })
      .from(chat)
      .leftJoin(message, eq(message.chatId, chat.id))
      .groupBy(chat.userId)
      .as('userMessages');

    // Main query with filtering
    const query = db
      .select({
        id: user.id,
        email: user.email,
        // Calculate last active time based on most recent chat
        lastActive: sql<string>`MAX(${chat.createdAt})`,
        // Count chats per user
        chatCount: count(chat.id),
        // Get message count from subquery
        messageCount: userMessages.messageCount,
      })
      .from(user)
      .leftJoin(chat, eq(user.id, chat.userId))
      .leftJoin(userMessages, eq(user.id, userMessages.userId))
      .where(
        searchQuery
          ? sql`LOWER(${user.email}) LIKE ${`%${searchQuery.toLowerCase()}%`}`
          : sql`1=1`
      )
      .groupBy(user.id, user.email, userMessages.messageCount)
      .orderBy(desc(sql<string>`MAX(${chat.createdAt})`))
      .limit(limit)
      .offset(offset);

    const users = await query;

    // Calculate total user count for pagination
    const totalCount = await db.select({ count: count() }).from(user);

    return NextResponse.json({
      users,
      totalCount: totalCount[0].count,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
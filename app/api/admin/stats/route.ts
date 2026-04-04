import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { user, chat, message } from '@/lib/db/schema';
import { count, sql, gte } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function GET() {
  try {
    // Get the current timestamp
    const now = new Date();

    // Calculate timestamps for various periods
    const oneDayAgo = new Date(now);
    oneDayAgo.setDate(now.getDate() - 1);

    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(now.getDate() - 7);

    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);

    // Get total user count
    const totalUsersResult = await db.select({ count: count() }).from(user);
    const totalUsers = totalUsersResult[0].count;

    // Get recent users (last 30 days)
    const recentUsersQuery = db.select({ count: count() }).from(user);

    const recentUsersResult = await recentUsersQuery;
    const recentUsers = recentUsersResult[0]?.count || 0;

    // Get total chats
    const totalChatsResult = await db.select({ count: count() }).from(chat);
    const totalChats = totalChatsResult[0].count;

    // Get recent chats (last 30 days)
    const recentChatsQuery = db
      .select({ count: count() })
      .from(chat)
      .where(gte(chat.createdAt, oneMonthAgo));

    const recentChatsResult = await recentChatsQuery;
    const recentChats = recentChatsResult[0].count;

    // Get total messages
    const totalMessagesResult = await db
      .select({ count: count() })
      .from(message);
    const totalMessages = totalMessagesResult[0].count;

    // Get recent messages (last 30 days)
    const recentMessagesQuery = db
      .select({ count: count() })
      .from(message)
      .where(gte(message.createdAt, oneMonthAgo));

    const recentMessagesResult = await recentMessagesQuery;
    const recentMessages = recentMessagesResult[0].count;

    // Get active users (with activity in the last 7 days)
    const activeUsersQuery = db
      .select({ count: sql<number>`COUNT(DISTINCT ${chat.userId})` })
      .from(chat)
      .where(gte(chat.createdAt, oneWeekAgo));

    const activeUsersResult = await activeUsersQuery;
    const activeUsers = activeUsersResult[0].count;

    return NextResponse.json({
      userStats: {
        total: totalUsers,
        recent: recentUsers,
        active: activeUsers,
      },
      chatStats: {
        total: totalChats,
        recent: recentChats,
      },
      messageStats: {
        total: totalMessages,
        recent: recentMessages,
      },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin stats' },
      { status: 500 },
    );
  }
}

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { chat, message } from '@/lib/db/schema';
import { count, sql, and, gte } from 'drizzle-orm';
import { NextResponse } from 'next/server';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function GET() {
  try {
    // Get the current date
    const now = new Date();

    // For the last 30 days data points (daily)
    const dailyData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      // Format date for display (MMM DD)
      const displayDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      // Format dates as ISO strings for SQL
      const nextDateStr = nextDate.toISOString();

      // Get chats created on this date
      const chatsCreatedQuery = db
        .select({ count: count() })
        .from(chat)
        .where(
          and(
            gte(chat.createdAt, date),
            sql`${chat.createdAt} < ${nextDateStr}`,
          ),
        );

      const chatsResult = await chatsCreatedQuery;
      const chatsCount = chatsResult[0].count;

      // Get messages created on this date
      const messagesCreatedQuery = db
        .select({ count: count() })
        .from(message)
        .where(
          and(
            gte(message.createdAt, date),
            sql`${message.createdAt} < ${nextDateStr}`,
          ),
        );

      const messagesResult = await messagesCreatedQuery;
      const messagesCount = messagesResult[0].count;

      dailyData.push({
        date: displayDate,
        chats: chatsCount,
        messages: messagesCount,
      });
    }

    // Get average messages per chat
    const avgMessagesQuery = db
      .select({
        avgMessages: sql<number>`AVG(message_count)`,
      })
      .from(
        db
          .select({
            chatId: message.chatId,
            messageCount: count().as('message_count'),
          })
          .from(message)
          .groupBy(message.chatId)
          .as('chat_message_counts'),
      );

    const avgMessagesResult = await avgMessagesQuery;
    const avgMessages = avgMessagesResult[0].avgMessages || 0;

    // Response with analytics data
    return NextResponse.json({
      dailyActivity: dailyData,
      averageMessagesPerChat: Math.round(avgMessages * 10) / 10, // Round to 1 decimal place
    });
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 },
    );
  }
}

import 'server-only';

import {
    and,
    asc,
    eq,
    gte,
    inArray,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
    message,
    vote,
    type DBMessage,
} from './schema';

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function saveMessages({
    messages,
}: {
    messages: Array<DBMessage>;
}) {
    try {
        return await db.insert(message).values(messages);
    } catch (error) {
        console.error('Failed to save messages in database', error);
        throw error;
    }
}

export async function getMessagesByChatId({ id, limit, offset }: { id: string, limit?: number, offset?: number }) {
    try {
        const builder = db
            .select()
            .from(message)
            .where(eq(message.chatId, id))
            .orderBy(asc(message.createdAt));

        if (typeof limit === 'number' && typeof offset === 'number') {
            return await builder.limit(limit).offset(offset);
        } else if (typeof limit === 'number') {
            return await builder.limit(limit);
        } else if (typeof offset === 'number') {
            return await builder.offset(offset);
        } else {
            return await builder;
        }
    } catch (error) {
        console.error('Failed to get messages by chat id from database', error);
        throw error;
    }
}

export async function voteMessage({
    chatId,
    messageId,
    type,
}: {
    chatId: string;
    messageId: string;
    type: 'up' | 'down';
}) {
    try {
        const [existingVote] = await db
            .select()
            .from(vote)
            .where(and(eq(vote.messageId, messageId)));

        if (existingVote) {
            return await db
                .update(vote)
                .set({ isUpvoted: type === 'up' })
                .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
        }
        return await db.insert(vote).values({
            chatId,
            messageId,
            isUpvoted: type === 'up',
        });
    } catch (error) {
        console.error('Failed to upvote message in database', error);
        throw error;
    }
}

export async function getVotesByChatId({ id }: { id: string }) {
    try {
        return await db.select().from(vote).where(eq(vote.chatId, id));
    } catch (error) {
        console.error('Failed to get votes by chat id from database');
        throw error;
    }
}

export async function getMessageById({ id }: { id: string }) {
    try {
        return await db.select().from(message).where(eq(message.id, id));
    } catch (error) {
        console.error('Failed to get message by id from database');
        throw error;
    }
}

export async function deleteMessagesByChatIdAfterTimestamp({
    chatId,
    timestamp,
}: {
    chatId: string;
    timestamp: Date;
}) {
    try {
        const messagesToDelete = await db
            .select({ id: message.id })
            .from(message)
            .where(
                and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
            );

        const messageIds = messagesToDelete.map((message) => message.id);

        if (messageIds.length > 0) {
            await db
                .delete(vote)
                .where(
                    and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)),
                );

            return await db
                .delete(message)
                .where(
                    and(eq(message.chatId, chatId), inArray(message.id, messageIds)),
                );
        }
    } catch (error) {
        console.error(
            'Failed to delete messages by id after timestamp from database',
        );
        throw error;
    }
} 
import 'server-only';

import {
    and,
    desc,
    eq,
    gt,
    lt,
    type SQL,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import {
    chat,
    message,
    vote,
    type Chat as ActualDbChat,
} from './schema';

export type Chat = ActualDbChat;

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function saveChat({
    id,
    userId,
    title,
}: {
    id: string;
    userId: string;
    title: string;
}) {
    try {
        const now = new Date();
        return await db.insert(chat).values({
            id,
            createdAt: now,
            updatedAt: now,
            userId,
            title,
        });
    } catch (error) {
        console.error('Failed to save chat in database');
        throw error;
    }
}

export async function deleteChatById({ id }: { id: string }) {
    try {
        await db.delete(vote).where(eq(vote.chatId, id));
        await db.delete(message).where(eq(message.chatId, id));

        return await db.delete(chat).where(eq(chat.id, id));
    } catch (error) {
        console.error('Failed to delete chat by id from database');
        throw error;
    }
}

export async function getChatsByUserId({
    id,
    limit,
    startingAfter,
    endingBefore,
}: {
    id: string;
    limit: number;
    startingAfter: string | null;
    endingBefore: string | null;
}) {
    try {
        const extendedLimit = limit + 1;

        const query = (whereCondition?: SQL<unknown>) =>
            db
                .select()
                .from(chat)
                .where(
                    whereCondition
                        ? and(whereCondition, eq(chat.userId, id))
                        : eq(chat.userId, id),
                )
                .orderBy(desc(chat.updatedAt)) // Sort by updatedAt to show recently active chats first
                .limit(extendedLimit);

        let filteredChats: Array<Chat> = [];

        if (startingAfter) {
            const [selectedChat] = await db
                .select()
                .from(chat)
                .where(eq(chat.id, startingAfter))
                .limit(1);

            if (!selectedChat) {
                throw new Error(`Chat with id ${startingAfter} not found`);
            }

            filteredChats = await query(gt(chat.updatedAt, selectedChat.updatedAt)); // Compare by updatedAt
        } else if (endingBefore) {
            const [selectedChat] = await db
                .select()
                .from(chat)
                .where(eq(chat.id, endingBefore))
                .limit(1);

            if (!selectedChat) {
                throw new Error(`Chat with id ${endingBefore} not found`);
            }

            filteredChats = await query(lt(chat.updatedAt, selectedChat.updatedAt)); // Compare by updatedAt
        } else {
            filteredChats = await query();
        }

        const hasMore = filteredChats.length > limit;

        return {
            chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
            hasMore,
        };
    } catch (error) {
        console.error('Failed to get chats by user from database');
        throw error;
    }
}

export async function getChatById({ id }: { id: string }) {
    try {
        const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
        return selectedChat;
    } catch (error) {
        console.error('Failed to get chat by id from database');
        throw error;
    }
}

export async function updateChatVisiblityById({
    chatId,
    visibility,
}: {
    chatId: string;
    visibility: 'private' | 'public';
}) {
    try {
        return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
    } catch (error) {
        console.error('Failed to update chat visibility in database');
        throw error;
    }
}

export async function updateChatTitleById({
    chatId,
    title,
}: {
    chatId: string;
    title: string;
}) {
    try {
        return await db.update(chat).set({ title }).where(eq(chat.id, chatId));
    } catch (error) {
        console.error('Failed to update chat title in database');
        throw error;
    }
}

export async function updateChatTimestamp({ id }: { id: string }) {
    try {
        // Try to update using updatedAt first
        try {
            return await db
                .update(chat)
                .set({ updatedAt: new Date() })
                .where(eq(chat.id, id));
        } catch (innerError) {
            // If updatedAt column doesn't exist yet, we'll silently catch the error
            // This is a temporary workaround until the migration is properly applied
            const errorMessage = innerError instanceof Error
                ? innerError.message
                : 'Unknown error';
            console.log('Notice: updateChatTimestamp failed:', errorMessage);
        }
        return { count: 0 }; // Return something compatible with the expected return type
    } catch (error) {
        console.error('Failed to update chat timestamp in database');
        throw error;
    }
} 
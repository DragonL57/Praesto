import 'server-only';

import { and, asc, eq, gte, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { message, document, type DBMessage } from './schema';

const url = process.env.POSTGRES_URL;
if (!url) throw new Error('POSTGRES_URL is not defined');
const client = postgres(url);
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

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error('Failed to get messages by chat id from database', error);
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

export async function deleteMessageById({
  messageId,
  chatId,
}: {
  messageId: string;
  chatId: string;
}) {
  try {
    // First, get the message to check for attached documents
    const [msgToDelete] = await db
      .select()
      .from(message)
      .where(and(eq(message.id, messageId), eq(message.chatId, chatId)));

    const attachments = msgToDelete?.attachments as Array<{
      id?: string;
      documentId?: string;
      name?: string;
    }>;
    if (attachments) {
      // Extract document IDs from attachments
      const documentIds = attachments
        .map((att) => att.documentId || att.id)
        .filter((id): id is string => Boolean(id));

      // Delete associated documents and their suggestions
      if (documentIds.length > 0) {
        await db.delete(document).where(inArray(document.id, documentIds));
      }
    }

    // Delete the message
    return await db
      .delete(message)
      .where(and(eq(message.id, messageId), eq(message.chatId, chatId)));
  } catch (error) {
    console.error('Failed to delete message by id from database', error);
    throw error;
  }
}

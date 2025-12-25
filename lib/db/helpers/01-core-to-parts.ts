import { config } from 'dotenv';
import postgres from 'postgres';
import {
  chat,
  message,
  messageDeprecated,
  vote,
  voteDeprecated,
} from '../schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import { inArray } from 'drizzle-orm';
import type { UIMessage } from 'ai';

config({
  path: '.env.local',
});

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
}

const client = postgres(process.env.POSTGRES_URL);
const db = drizzle(client);

const BATCH_SIZE = 50; // Process 10 chats at a time
const INSERT_BATCH_SIZE = 100; // Insert 100 messages at a time

type NewMessageInsert = {
  id: string;
  chatId: string;
  parts: Record<string, unknown>[];
  role: string;
  attachments: Record<string, unknown>[];
  createdAt: Date;
};

type NewVoteInsert = {
  messageId: string;
  chatId: string;
  isUpvoted: boolean;
};

async function createNewTable() {
  const chats = await db.select().from(chat);
  let processedCount = 0;

  // Process chats in batches
  for (let i = 0; i < chats.length; i += BATCH_SIZE) {
    const chatBatch = chats.slice(i, i + BATCH_SIZE);
    const chatIds = chatBatch.map((chat) => chat.id);

    // Fetch all messages and votes for the current batch of chats in bulk
    const allMessages = await db
      .select()
      .from(messageDeprecated)
      .where(inArray(messageDeprecated.chatId, chatIds));

    const allVotes = await db
      .select()
      .from(voteDeprecated)
      .where(inArray(voteDeprecated.chatId, chatIds));

    // Prepare batches for insertion
    const newMessagesToInsert: NewMessageInsert[] = [];
    const newVotesToInsert: NewVoteInsert[] = [];

    // Process each chat in the batch
    for (const chat of chatBatch) {
      processedCount++;
      console.info(`Processed ${processedCount}/${chats.length} chats`);

      // Filter messages and votes for this specific chat
      const messages = allMessages.filter((msg) => msg.chatId === chat.id);
      const votes = allVotes.filter((v) => v.chatId === chat.id);

      // Group messages into sections
      const messageSection: Array<UIMessage> = [];
      const messageSections: Array<Array<UIMessage>> = [];

      for (const message of messages) {
        const { role } = message;

        if (role === 'user' && messageSection.length > 0) {
          messageSections.push([...messageSection]);
          messageSection.length = 0;
        }

        // Cast message to Record since deprecated message schema has different type
        messageSection.push(message as unknown as UIMessage);
      }

      if (messageSection.length > 0) {
        messageSections.push([...messageSection]);
      }

      // Process each message section
      for (const section of messageSections) {
        const [userMessage, ...assistantMessages] = section;

        const [firstAssistantMessage] = assistantMessages;

        try {
          // AI SDK 5.x: appendResponseMessages was removed, manually build UI messages
          const projectedUISection: NewMessageInsert[] = [];

          // Add user message
          if (userMessage) {
            const userContent = (userMessage as { content?: string }).content || '';
            projectedUISection.push({
              id: userMessage.id,
              chatId: chat.id,
              parts: [{ type: 'text', text: userContent }],
              role: 'user',
              // Use createdAt if available on the message, otherwise use current date
              createdAt: (userMessage as { createdAt?: Date }).createdAt || new Date(),
              attachments: [],
            });
          }

          // Add assistant messages
          for (const assistantMessage of assistantMessages) {
            const msgWithContent = assistantMessage as {
              id: string;
              content?: string;
              parts?: Record<string, unknown>[];
              createdAt?: Date;
            };
            const parts =
              msgWithContent.parts ||
              (msgWithContent.content
                ? [{ type: 'text', text: msgWithContent.content }]
                : []);

            // Cast firstAssistantMessage to access createdAt (not part of UIMessage in SDK 5.x)
            const firstMsgWithCreatedAt = firstAssistantMessage as unknown as {
              createdAt?: Date;
            };
            projectedUISection.push({
              id: assistantMessage.id,
              chatId: chat.id,
              parts: parts,
              role: 'assistant',
              createdAt:
                msgWithContent.createdAt ||
                firstMsgWithCreatedAt?.createdAt ||
                new Date(),
              attachments: [],
            });
          }

          // Add messages to batch
          for (const msg of projectedUISection) {
            newMessagesToInsert.push(msg);

            if (msg.role === 'assistant') {
              const voteByMessage = votes.find((v) => v.messageId === msg.id);
              if (voteByMessage) {
                newVotesToInsert.push({
                  messageId: msg.id,
                  chatId: msg.chatId,
                  isUpvoted: voteByMessage.isUpvoted,
                });
              }
            }
          }
        } catch (error) {
          console.error(`Error processing chat ${chat.id}: ${error}`);
        }
      }
    }

    // Batch insert messages
    for (let j = 0; j < newMessagesToInsert.length; j += INSERT_BATCH_SIZE) {
      const messageBatch = newMessagesToInsert.slice(j, j + INSERT_BATCH_SIZE);
      if (messageBatch.length > 0) {
        // Ensure all required fields are present
        const validMessageBatch = messageBatch.map((msg) => ({
          id: msg.id,
          chatId: msg.chatId,
          parts: msg.parts,
          role: msg.role,
          attachments: msg.attachments,
          createdAt: msg.createdAt,
        }));

        await db.insert(message).values(validMessageBatch);
      }
    }

    // Batch insert votes
    for (let j = 0; j < newVotesToInsert.length; j += INSERT_BATCH_SIZE) {
      const voteBatch = newVotesToInsert.slice(j, j + INSERT_BATCH_SIZE);
      if (voteBatch.length > 0) {
        await db.insert(vote).values(voteBatch);
      }
    }
  }

  console.info(`Migration completed: ${processedCount} chats processed`);
}

createNewTable()
  .then(() => {
    console.info('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

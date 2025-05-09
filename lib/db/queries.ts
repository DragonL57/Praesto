import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  type SQL,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { randomBytes } from 'crypto';

import {
  user,
  chat,
  type User as ActualDbUser,
  document,
  type Suggestion,
  suggestion,
  message,
  vote,
  type DBMessage,
  type Chat as ActualDbChat,
} from './schema';
import type { ArtifactKind } from '@/components/artifact';
import {
  createCachedFunction,
  getUserCacheTag,
  getChatCacheTag,
  getMessageCacheTag,
  getDocumentCacheTag,
  getVoteCacheTag
} from '../cache';

export type User = ActualDbUser;
export type Chat = ActualDbChat;

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// Original functions
async function _getUserById(id: string): Promise<User | null> {
  try {
    const users = await db.select().from(user).where(eq(user.id, id));
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('Failed to get user by ID from database');
    throw error;
  }
}

async function _getChatById({ id }: { id: string }): Promise<Chat> {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error('Failed to get chat by id from database');
    throw error;
  }
}

async function _getMessagesByChatId({ id }: { id: string }): Promise<DBMessage[]> {
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

async function _getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error('Failed to get votes by chat id from database');
    throw error;
  }
}

async function _getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error('Failed to get document by id from database');
    throw error;
  }
}

// Initialize cached functions
// We need to call these immediately to set up the cache
let getUserById: (id: string) => Promise<User | null>;
let getChatById: ({ id }: { id: string }) => Promise<Chat>;
let getMessagesByChatId: ({ id }: { id: string }) => Promise<DBMessage[]>;
let getVotesByChatId: ({ id }: { id: string }) => Promise<{ chatId: string; messageId: string; isUpvoted: boolean; }[]>;
let getDocumentById: ({ id }: { id: string }) => Promise<{ id: string; createdAt: Date; title: string; content: string | null; kind: ArtifactKind; userId: string; }>;

// Setup cache functions
(async () => {
  const userTag = await getUserCacheTag();
  const chatTag = await getChatCacheTag();
  const messageTag = await getMessageCacheTag();
  const documentTag = await getDocumentCacheTag();
  const voteTag = await getVoteCacheTag();

  getUserById = await createCachedFunction<[string], User | null>(
    _getUserById,
    {
      revalidate: 300, // 5 minutes
      tags: [userTag]
    }
  );

  getChatById = await createCachedFunction<[{ id: string }], Chat>(
    _getChatById,
    {
      revalidate: 120, // 2 minutes
      tags: [chatTag]
    }
  );

  getMessagesByChatId = await createCachedFunction<[{ id: string }], DBMessage[]>(
    _getMessagesByChatId,
    {
      revalidate: 60, // 1 minute
      tags: [messageTag, chatTag]
    }
  );

  getVotesByChatId = await createCachedFunction<
    [{ id: string }],
    { chatId: string; messageId: string; isUpvoted: boolean; }[]
  >(
    _getVotesByChatId,
    {
      revalidate: 300, // 5 minutes
      tags: [voteTag, chatTag]
    }
  );

  getDocumentById = await createCachedFunction<
    [{ id: string }],
    { id: string; createdAt: Date; title: string; content: string | null; kind: ArtifactKind; userId: string; }
  >(
    _getDocumentById,
    {
      revalidate: 180, // 3 minutes
      tags: [documentTag]
    }
  );
})();

// Export these functions directly
export { getUserById, getChatById, getMessagesByChatId, getVotesByChatId, getDocumentById };

// The rest of the file remains unchanged...

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error('Failed to get user from database');
    throw error;
  }
}

export async function createUser(email: string, password: string, verified: boolean = false) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    // First attempt with createdAt field
    try {
      return await db.insert(user).values({
        email,
        password: hash,
        emailVerified: verified,
        createdAt: new Date()
      });
    } catch (innerError) {
      // If createdAt column doesn't exist, try without it
      const errorMessage = innerError instanceof Error
        ? innerError.message
        : 'Unknown error';

      if (errorMessage.includes('column "createdAt" does not exist')) {
        console.log('Notice: createdAt column missing, trying insert without it');
        return await db.insert(user).values({
          email,
          password: hash,
          emailVerified: verified
        });
      } else {
        // Re-throw if it's another error
        throw innerError;
      }
    }
  } catch (error) {
    console.error('Failed to create user in database', error);
    throw error;
  }
}

export async function createOAuthUser(email: string) {
  // Generate a secure random password for OAuth users
  // They won't use this password, but we need to store something in the password field
  const randomPassword = randomBytes(32).toString('hex');

  try {
    // First check if the user already exists
    const existingUsers = await getUser(email);
    if (existingUsers.length > 0) {
      // If the user exists but isn't verified, mark them as verified
      if (!existingUsers[0].emailVerified) {
        await db.update(user)
          .set({ emailVerified: true })
          .where(eq(user.id, existingUsers[0].id));
      }
      return existingUsers[0];
    }

    // Insert user directly with a raw SQL query to avoid schema issues
    // This bypasses the ORM to ensure it works regardless of column presence
    const salt = genSaltSync(10);
    const hash = hashSync(randomPassword, salt);

    // Using raw client query that only uses basic columns we know exist
    const result = await client`
      INSERT INTO "User" (
        id, email, password, "emailVerified"
      ) VALUES (
        gen_random_uuid(), ${email}, ${hash}, true
      ) RETURNING *
    `;

    if (result && result.length > 0) {
      return result[0];
    }

    throw new Error("Failed to create OAuth user with raw SQL");
  } catch (error) {
    console.error('Failed to create OAuth user in database', error);
    throw error;
  }
}

export async function updateUser(id: string, data: Partial<User>) {
  try {
    return await db.update(user)
      .set(data)
      .where(eq(user.id, id));
  } catch (error) {
    console.error('Failed to update user in database');
    throw error;
  }
}

export async function setVerificationToken(userId: string, token: string, expiryMinutes: number = 60) {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + expiryMinutes);

  try {
    return await db.update(user)
      .set({
        verificationToken: token,
        verificationTokenExpiry: expiry
      })
      .where(eq(user.id, userId));
  } catch (error) {
    console.error('Failed to set verification token');
    throw error;
  }
}

export async function verifyEmail(email: string, token: string): Promise<boolean> {
  try {
    const users = await db.select().from(user).where(
      and(
        eq(user.email, email),
        eq(user.verificationToken, token),
        gt(user.verificationTokenExpiry, new Date())
      )
    );

    if (users.length === 0) return false;

    await db.update(user)
      .set({
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null
      })
      .where(eq(user.id, users[0].id));

    return true;
  } catch (error) {
    console.error('Failed to verify email');
    throw error;
  }
}

export async function setPasswordResetToken(email: string, token: string, expiryMinutes: number = 15) {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + expiryMinutes);

  try {
    const users = await db.select().from(user).where(eq(user.email, email));
    if (users.length === 0) return false;

    await db.update(user)
      .set({
        resetPasswordToken: token,
        resetPasswordTokenExpiry: expiry
      })
      .where(eq(user.id, users[0].id));

    return true;
  } catch (error) {
    console.error('Failed to set password reset token');
    throw error;
  }
}

export async function resetPassword(email: string, token: string, newPassword: string): Promise<boolean> {
  try {
    const users = await db.select().from(user).where(
      and(
        eq(user.email, email),
        eq(user.resetPasswordToken, token),
        gt(user.resetPasswordTokenExpiry, new Date())
      )
    );

    if (users.length === 0) return false;

    const salt = genSaltSync(10);
    const hash = hashSync(newPassword, salt);

    await db.update(user)
      .set({
        password: hash,
        resetPasswordToken: null,
        resetPasswordTokenExpiry: null
      })
      .where(eq(user.id, users[0].id));

    return true;
  } catch (error) {
    console.error('Failed to reset password');
    throw error;
  }
}

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}): Promise<Chat> {
  try {
    const now = new Date();
    const newChats = await db.insert(chat).values({
      id,
      createdAt: now,
      updatedAt: now,
      userId,
      title,
    }).returning();

    // Invalidate relevant caches when a new chat is created
    const { revalidateTag } = await import('next/cache');
    await revalidateTag(await getChatCacheTag());

    if (newChats.length === 0) {
      throw new Error('Failed to save chat or retrieve it after saving.');
    }
    return newChats[0];
  } catch (error) {
    console.error('Failed to save chat in database', error);
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));
    const result = await db.delete(chat).where(eq(chat.id, id));

    // Invalidate relevant caches when a chat is deleted
    const { revalidateTag } = await import('next/cache');
    await Promise.all([
      revalidateTag(await getChatCacheTag()),
      revalidateTag(await getMessageCacheTag()),
      revalidateTag(await getVoteCacheTag())
    ]);

    return result;
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

export async function saveMessages({
  messages,
}: {
  messages: Array<DBMessage>;
}) {
  try {
    const result = await db.insert(message).values(messages);

    // If messages are added to a chat, invalidate that chat's messages cache
    if (messages.length > 0) {
      const { revalidateTag } = await import('next/cache');
      await revalidateTag(await getMessageCacheTag());
    }

    return result;
  } catch (error) {
    console.error('Failed to save messages in database', error);
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

    let result;
    if (existingVote) {
      result = await db
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    } else {
      result = await db.insert(vote).values({
        chatId,
        messageId,
        isUpvoted: type === 'up',
      });
    }

    // Invalidate vote cache when a vote is added or updated
    const { revalidateTag } = await import('next/cache');
    await revalidateTag(await getVoteCacheTag());

    return result;
  } catch (error) {
    console.error('Failed to upvote message in database', error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  try {
    const result = await db
      .insert(document)
      .values({
        id,
        title,
        kind,
        content,
        userId,
        createdAt: new Date(),
      })
      .returning();

    // Invalidate document cache when a new document is created
    const { revalidateTag } = await import('next/cache');
    await revalidateTag(await getDocumentCacheTag());

    return result;
  } catch (error) {
    console.error('Failed to save document in database');
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    await db
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await db
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
      .returning();
  } catch (error) {
    console.error(
      'Failed to delete documents by id after timestamp from database',
    );
    throw error;
  }
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Array<Suggestion>;
}) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error('Failed to save suggestions in database');
    throw error;
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error(
      'Failed to get suggestions by document version from database',
    );
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

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    const result = await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));

    // Invalidate chat cache when visibility is updated
    const { revalidateTag } = await import('next/cache');
    await revalidateTag(await getChatCacheTag());

    return result;
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
    const result = await db.update(chat).set({ title }).where(eq(chat.id, chatId));

    // Invalidate chat cache when title is updated
    const { revalidateTag } = await import('next/cache');
    await revalidateTag(await getChatCacheTag());

    return result;
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

// Function to delete old, unverified users
export async function deleteOldUnverifiedUsers(olderThan: Date): Promise<{ count: number }> {
  try {
    console.log(`[DB Query] Attempting to delete unverified users created before: ${olderThan.toISOString()}`);
    const result = await db
      .delete(user)
      .where(and(eq(user.emailVerified, false), lt(user.createdAt, olderThan)))
      .returning({ id: user.id }); // Return IDs of deleted users for counting

    console.log(`[DB Query] Successfully deleted ${result.length} old, unverified users.`);
    return { count: result.length };
  } catch (error) {
    console.error('[DB Query] Error deleting old, unverified users:', error);
    throw new Error('Failed to delete old, unverified users.');
  }
}

export async function incrementFailedLoginAttempts(userId: string): Promise<boolean> {
  try {
    const userRecord = await getUserById(userId);
    if (!userRecord) return false;

    // Get current failed attempts or default to 0
    const failedAttempts = (userRecord.failedLoginAttempts || 0) + 1;

    // Set account lock if threshold reached (5 attempts)
    const updatedFields: Partial<User> = { failedLoginAttempts: failedAttempts };

    if (failedAttempts >= 5) {
      // Lock account for 15 minutes
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + 15);
      updatedFields.accountLockedUntil = lockUntil;
    }

    await db.update(user)
      .set(updatedFields)
      .where(eq(user.id, userId));

    return true;
  } catch (error) {
    console.error('Failed to increment failed login attempts', error);
    return false;
  }
}

export async function resetFailedLoginAttempts(userId: string): Promise<boolean> {
  try {
    await db.update(user)
      .set({
        failedLoginAttempts: 0,
        accountLockedUntil: null
      })
      .where(eq(user.id, userId));
    return true;
  } catch (error) {
    console.error('Failed to reset failed login attempts', error);
    return false;
  }
}

export async function isAccountLocked(userId: string): Promise<boolean> {
  try {
    const userRecord = await getUserById(userId);
    if (!userRecord) return false;

    if (userRecord.accountLockedUntil && new Date(userRecord.accountLockedUntil) > new Date()) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to check if account is locked', error);
    return false;
  }
}

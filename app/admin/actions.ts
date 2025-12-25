'use server';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import { revalidatePath } from 'next/cache';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, inArray } from 'drizzle-orm';
import postgres from 'postgres';

import {
  user,
  chat,
  message,
  vote,
  document,
  suggestion,
} from '@/lib/db/schema';

// Database client
const client = postgres(process.env.POSTGRES_URL ?? '');
const db = drizzle(client);

// Get all users
export async function getAllUsers() {
  try {
    return await db.select().from(user);
  } catch (error) {
    console.error('Failed to get users from database', error);
    throw error;
  }
}

// Delete a user by ID
export async function deleteUser(formData: FormData) {
  const userId = formData.get('userId') as string;

  if (!userId) {
    throw new Error('User ID is required');
  }

  try {
    // Use sequential delete operations instead of a transaction

    // 1. Get all chats by this user
    const userChats = await db
      .select({ id: chat.id })
      .from(chat)
      .where(eq(chat.userId, userId));
    const chatIds = userChats.map((c) => c.id);

    // 2. Delete all votes related to user's chats
    if (chatIds.length > 0) {
      await db.delete(vote).where(inArray(vote.chatId, chatIds));
    }

    // 3. Delete all messages related to user's chats
    if (chatIds.length > 0) {
      await db.delete(message).where(inArray(message.chatId, chatIds));
    }

    // 4. Delete all chats by user
    await db.delete(chat).where(eq(chat.userId, userId));

    // 5. Get all documents by this user
    const userDocuments = await db
      .select({ id: document.id, createdAt: document.createdAt })
      .from(document)
      .where(eq(document.userId, userId));

    // 6. Delete all suggestions related to user's documents
    for (const doc of userDocuments) {
      await db.delete(suggestion).where(eq(suggestion.documentId, doc.id));
    }

    // 7. Delete all documents by user
    await db.delete(document).where(eq(document.userId, userId));

    // 8. Delete the user
    await db.delete(user).where(eq(user.id, userId));

    revalidatePath('/admin/users');
    return { success: true, message: 'User deleted successfully' };
  } catch (error) {
    console.error('Failed to delete user from database', error);
    return { success: false, message: 'Failed to delete user' };
  }
}

// Change user password
export async function changeUserPassword(formData: FormData) {
  const userId = formData.get('userId') as string;
  const newPassword = formData.get('newPassword') as string;

  if (!userId || !newPassword) {
    throw new Error('User ID and new password are required');
  }

  if (newPassword.length < 6) {
    return {
      success: false,
      message: 'Password must be at least 6 characters',
    };
  }

  try {
    const salt = genSaltSync(10);
    const hash = hashSync(newPassword, salt);

    await db.update(user).set({ password: hash }).where(eq(user.id, userId));

    return { success: true, message: 'Password changed successfully' };
  } catch (error) {
    console.error('Failed to change user password', error);
    return { success: false, message: 'Failed to change password' };
  }
}

import 'server-only';

import { genSaltSync, hashSync } from 'bcrypt-ts';
import {
    and,
    eq,
    gt,
    lt,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { randomBytes } from 'node:crypto';

import {
    user,
    type User as ActualDbUser,
} from './schema';

export type User = ActualDbUser;

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
    try {
        return await db.select().from(user).where(eq(user.email, email));
    } catch (error) {
        console.error('Failed to get user from database');
        throw error;
    }
}

export async function getUserById(id: string): Promise<User | null> {
    try {
        const users = await db.select().from(user).where(eq(user.id, id));
        return users.length > 0 ? users[0] : null;
    } catch (error) {
        console.error('Failed to get user by ID from database');
        throw error;
    }
}

export async function createUser(email: string, password: string, verified = false) {
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

export async function setVerificationToken(userId: string, token: string, expiryMinutes = 60) {
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

export async function setPasswordResetToken(email: string, token: string, expiryMinutes = 15) {
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
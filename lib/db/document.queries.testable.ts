import {
    and,
    asc,
    desc,
    eq,
    gt,
} from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
    document,
} from './schema';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export async function saveDocument({
    id,
    title,
    kind,
    content,
    userId,
}: {
    id: string;
    title: string;
    kind: string;
    content: string;
    userId: string;
}) {
    try {
        return await db
            .insert(document)
            .values({
                id,
                title,
                kind: kind as 'text' | 'code' | 'image' | 'sheet',
                content,
                userId,
                createdAt: new Date(),
            })
            .returning();
    } catch (error) {
        console.error('Failed to save document in database');
        throw error;
    }
}

export async function getDocumentsById({ id }: { id: string }) {
    try {
        const documents = await db
            .select()
            .from(document)
            .where(eq(document.id, id))
            .orderBy(asc(document.createdAt));
        return documents;
    } catch (error) {
        console.error('Failed to get documents by id from database');
        throw error;
    }
}

export async function getDocumentById({ id }: { id: string }) {
    try {
        return await db
            .select()
            .from(document)
            .where(eq(document.id, id))
            .orderBy(desc(document.createdAt))
            .limit(1);
    } catch (error) {
        console.error('Failed to get document by id from database');
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
        return await db
            .delete(document)
            .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
    } catch (error) {
        console.error('Failed to delete documents by id after timestamp');
        throw error;
    }
}

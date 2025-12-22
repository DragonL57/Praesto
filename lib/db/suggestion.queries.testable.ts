import {
    type Suggestion,
    suggestion,
} from './schema';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

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
            .where(eq(suggestion.documentId, documentId));
    } catch (error) {
        console.error('Failed to get suggestions by document version from database');
        throw error;
    }
}

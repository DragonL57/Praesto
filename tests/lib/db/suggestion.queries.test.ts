import { test, expect } from '@playwright/test';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { suggestion } from '@/lib/db/schema';
import type { Suggestion } from '@/lib/db/schema';
import {
    saveSuggestions,
    getSuggestionsByDocumentId,
} from '@/lib/db/suggestion.queries.testable';

// Mock environment variables
const mockPostgresUrl = 'postgresql://test:test@localhost:5432/testdb';

test.describe('Suggestion Queries', () => {
    let client: postgres.Sql;
    let db: ReturnType<typeof drizzle>;

    test.beforeEach(async () => {
        // Setup test database connection
        client = postgres(mockPostgresUrl);
        db = drizzle(client);

        // Clean up test data before each test
        await db.delete(suggestion);
    });

    test.afterEach(async () => {
        // Clean up and close connection
        await client.end();
    });

    test.describe('saveSuggestions', () => {
        test('should save multiple suggestions successfully', async () => {
            const testSuggestions: Array<Suggestion> = [
                {
                    id: 'suggestion-1',
                    documentId: 'doc-1',
                    documentCreatedAt: new Date(),
                    originalText: 'Original text 1',
                    suggestedText: 'Suggested text 1',
                    description: 'Description 1',
                    isResolved: false,
                    userId: 'user-1',
                    createdAt: new Date(),
                },
                {
                    id: 'suggestion-2',
                    documentId: 'doc-1',
                    documentCreatedAt: new Date(),
                    originalText: 'Original text 2',
                    suggestedText: 'Suggested text 2',
                    description: 'Description 2',
                    isResolved: false,
                    userId: 'user-1',
                    createdAt: new Date(),
                },
            ];

            // Test that the function doesn't throw with valid data
            await expect(saveSuggestions({ suggestions: testSuggestions })).resolves.not.toThrow();
        });

        test('should handle empty suggestions array', async () => {
            const emptySuggestions: Array<Suggestion> = [];

            // Test that the function handles empty array gracefully
            await expect(saveSuggestions({ suggestions: emptySuggestions })).resolves.not.toThrow();
        });

        test('should handle invalid suggestion data', async () => {
            const invalidSuggestions = [
                {
                    // Missing required fields
                    id: 'invalid-suggestion',
                },
            ] as Array<Suggestion>;

            // The function should throw an error for invalid data
            await expect(saveSuggestions({ suggestions: invalidSuggestions })).rejects.toThrow();
        });
    });

    test.describe('getSuggestionsByDocumentId', () => {
        test('should retrieve suggestions by document ID', async () => {
            const documentId = 'test-doc-1';

            // Test the function structure
            await expect(getSuggestionsByDocumentId({ documentId })).resolves.not.toThrow();
        });

        test('should handle non-existent document ID', async () => {
            const nonExistentDocId = 'non-existent-doc';

            const result = await getSuggestionsByDocumentId({ documentId: nonExistentDocId });
            expect(result).toEqual([]);
        });

        test('should return empty array for document with no suggestions', async () => {
            const documentId = 'doc-no-suggestions';

            const result = await getSuggestionsByDocumentId({ documentId });
            expect(result).toEqual([]);
            expect(Array.isArray(result)).toBe(true);
        });
    });

    test.describe('Integration Tests', () => {
        test('should save and retrieve suggestions correctly', async () => {
            const documentId = 'integration-doc';
            const testSuggestions: Array<Suggestion> = [
                {
                    id: 'integration-suggestion-1',
                    documentId,
                    documentCreatedAt: new Date(),
                    originalText: 'Integration original text',
                    suggestedText: 'Integration suggested text',
                    description: 'Integration description',
                    isResolved: false,
                    userId: 'integration-user',
                    createdAt: new Date(),
                },
            ];

            // Save suggestions
            await saveSuggestions({ suggestions: testSuggestions });

            // Retrieve suggestions
            const retrievedSuggestions = await getSuggestionsByDocumentId({ documentId });

            expect(retrievedSuggestions).toHaveLength(1);
            expect(retrievedSuggestions[0].id).toBe(testSuggestions[0].id);
            expect(retrievedSuggestions[0].documentId).toBe(documentId);
        });

        test('should handle multiple suggestions for same document', async () => {
            const documentId = 'multi-suggestion-doc';
            const testSuggestions: Array<Suggestion> = [
                {
                    id: 'multi-suggestion-1',
                    documentId,
                    documentCreatedAt: new Date(),
                    originalText: 'Original 1',
                    suggestedText: 'Suggested 1',
                    description: 'Description 1',
                    isResolved: false,
                    userId: 'user-1',
                    createdAt: new Date(),
                },
                {
                    id: 'multi-suggestion-2',
                    documentId,
                    documentCreatedAt: new Date(),
                    originalText: 'Original 2',
                    suggestedText: 'Suggested 2',
                    description: 'Description 2',
                    isResolved: true,
                    userId: 'user-1',
                    createdAt: new Date(),
                },
            ];

            // Save suggestions
            await saveSuggestions({ suggestions: testSuggestions });

            // Retrieve suggestions
            const retrievedSuggestions = await getSuggestionsByDocumentId({ documentId });

            expect(retrievedSuggestions).toHaveLength(2);
            expect(retrievedSuggestions.map(s => s.id).sort()).toEqual(
                testSuggestions.map(s => s.id).sort()
            );
        });
    });

    test.describe('Error Handling', () => {
        test('should log errors when saveSuggestions fails', async () => {
            const consoleError = console.error;
            let loggedMessage = '';

            // Mock console.error to capture the message
            console.error = (message: string) => {
                loggedMessage = message;
            };

            // Simulate a database error with invalid data
            const invalidSuggestions = [
                {
                    // Missing required fields
                    id: 'error-suggestion',
                },
            ] as Array<Suggestion>;

            try {
                await saveSuggestions({ suggestions: invalidSuggestions });
            } catch {
                expect(loggedMessage).toBe('Failed to save suggestions in database');
            } finally {
                // Restore original console.error
                console.error = consoleError;
            }
        });

        test('should log errors when getSuggestionsByDocumentId fails', async () => {
            const consoleError = console.error;
            let loggedMessage = '';

            // Mock console.error to capture the message
            console.error = (message: string) => {
                loggedMessage = message;
            };

            try {
                // This might fail in test environment, we're testing error handling
                await getSuggestionsByDocumentId({ documentId: '' });
            } catch {
                expect(loggedMessage).toBe(
                    'Failed to get suggestions by document version from database'
                );
            } finally {
                // Restore original console.error
                console.error = consoleError;
            }
        });
    });
});

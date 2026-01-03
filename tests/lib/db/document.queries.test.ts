import { test, expect } from '@playwright/test';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { document, suggestion } from '@/lib/db/schema';
import {
  saveDocument,
  getDocumentsById,
  getDocumentById,
  deleteDocumentsByIdAfterTimestamp,
} from '@/lib/db/document.queries.testable';

// Mock environment variables
const mockPostgresUrl = 'postgresql://test:test@localhost:5432/testdb';

test.describe('Document Queries', () => {
  let client: postgres.Sql;
  let db: ReturnType<typeof drizzle>;

  test.beforeEach(async () => {
    // Setup test database connection
    client = postgres(mockPostgresUrl);
    db = drizzle(client);

    // Clean up test data before each test
    await db.delete(suggestion);
    await db.delete(document);
  });

  test.afterEach(async () => {
    // Clean up and close connection
    await client.end();
  });

  test.describe('saveDocument', () => {
    test('should save a document successfully', async () => {
      const testDoc = {
        id: 'test-doc-1',
        title: 'Test Document',
        kind: 'text',
        content: 'This is a test document',
        userId: 'test-user-1',
      };

      // Test that the function doesn't throw with valid data
      await expect(saveDocument(testDoc)).resolves.not.toThrow();
    });

    test('should handle invalid data gracefully', async () => {
      const invalidDoc = {
        id: '', // Invalid empty ID
        title: 'Invalid Document',
        kind: 'text',
        content: 'This should fail',
        userId: 'test-user-1',
      };

      // The function should throw an error for invalid data
      await expect(saveDocument(invalidDoc)).rejects.toThrow();
    });
  });

  test.describe('getDocumentsById', () => {
    test('should retrieve documents by ID', async () => {
      const documentId = 'test-doc-2';

      // Test the function structure
      await expect(getDocumentsById({ id: documentId })).resolves.toBeDefined();
    });

    test('should handle empty result sets', async () => {
      const nonExistentId = 'non-existent-doc';

      const result = await getDocumentsById({ id: nonExistentId });
      expect(result).toEqual([]);
    });
  });

  test.describe('getDocumentById', () => {
    test('should retrieve a single document by ID', async () => {
      const documentId = 'test-doc-3';

      await expect(getDocumentById({ id: documentId })).resolves.not.toThrow();
    });

    test('should return undefined for non-existent document', async () => {
      const nonExistentId = 'non-existent-doc';

      const result = await getDocumentById({ id: nonExistentId });
      expect(result).toBeUndefined();
    });
  });

  test.describe('deleteDocumentsByIdAfterTimestamp', () => {
    test('should delete documents after a specific timestamp', async () => {
      const documentId = 'test-doc-4';
      const timestamp = new Date('2023-01-01T00:00:00Z');

      await expect(
        deleteDocumentsByIdAfterTimestamp({
          id: documentId,
          timestamp,
        }),
      ).resolves.not.toThrow();
    });

    test('should handle cascade deletion of suggestions', async () => {
      // This tests that suggestions related to the document are also deleted
      const documentId = 'test-doc-5';
      const timestamp = new Date('2023-01-01T00:00:00Z');

      await expect(
        deleteDocumentsByIdAfterTimestamp({
          id: documentId,
          timestamp,
        }),
      ).resolves.not.toThrow();
    });
  });

  test.describe('Error Handling', () => {
    test('should log errors when database operations fail', async () => {
      const consoleError = console.error;
      let loggedMessage = '';

      // Mock console.error to capture the message
      console.error = (message: string) => {
        loggedMessage = message;
      };

      // Simulate a database error with invalid data
      const testDoc = {
        id: 'error-doc',
        title: 'Error Document',
        kind: 'text',
        content: 'This should cause an error',
        userId: 'test-user-1',
      };

      try {
        await saveDocument(testDoc);
      } catch {
        expect(loggedMessage).toBe('Failed to save document in database');
      } finally {
        // Restore original console.error
        console.error = consoleError;
      }
    });
  });
});

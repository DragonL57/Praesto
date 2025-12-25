import { test, expect } from '@playwright/test';
import {
  cn,
  fetcher,
  getLocalStorage,
  generateUUID,
  sanitizeResponseMessages,
  getMostRecentUserMessage,
  getDocumentTimestampByIndex,
  getTrailingMessageId,
} from '@/lib/utils';
import type { Document } from '@/lib/db/schema';

test.describe('Utility Functions', () => {
  test.describe('cn', () => {
    test('should merge class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
      expect(cn('class1', null, 'class2')).toBe('class1 class2');
      expect(cn('class1', undefined, 'class2')).toBe('class1 class2');
      expect(cn('class1', '', 'class2')).toBe('class1 class2');
      expect(cn('class1', false && 'class2', 'class3')).toBe('class1 class3');
    });

    test('should handle empty input', () => {
      expect(cn()).toBe('');
      expect(cn('')).toBe('');
    });
  });

  test.describe('generateUUID', () => {
    test('should generate a valid UUID format', () => {
      const uuid = generateUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    test('should generate unique UUIDs', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });
  });

  test.describe('getLocalStorage', () => {
    test('should handle server-side environment', () => {
      // When window is undefined (server-side), should return empty array
      const result = getLocalStorage('test-key');
      expect(result).toEqual([]);
    });

    test('should handle localStorage operations', () => {
      // Mock window.localStorage for Node.js environment
      (global as any).window = {
        localStorage: {
          getItem: (_key: string) => JSON.stringify(['item1', 'item2']),
          setItem: () => { },
          removeItem: () => { },
          clear: () => { },
          key: () => null,
          length: 0,
        }
      };
      const result = getLocalStorage('test-key');
      expect(result).toEqual(['item1', 'item2']);
      // Clean up
      (global as any).window = undefined;
    });
    // Clean up
    (global as any).window = undefined;
  });
});

test.describe('getMostRecentUserMessage', () => {
  test('should return most recent user message', () => {
    const messages = [
      { role: 'assistant', content: 'Hello!' },
      { role: 'user', content: 'Hi there' },
      { role: 'assistant', content: 'How can I help?' },
      { role: 'user', content: 'I need help' },
    ] as any;

    const result = getMostRecentUserMessage(messages);
    expect(result).toEqual({ role: 'user', content: 'I need help' });
  });

  test('should return undefined for no user messages', () => {
    const messages = [
      { role: 'assistant', content: 'Hello!' },
      { role: 'assistant', content: 'How can I help?' },
    ] as any;

    const result = getMostRecentUserMessage(messages);
    expect(result).toBeUndefined();
  });

  test('should handle empty messages array', () => {
    const result = getMostRecentUserMessage([]);
    expect(result).toBeUndefined();
  });
});

test.describe('getDocumentTimestampByIndex', () => {
  test('should return timestamp for valid index', () => {
    const documents: Document[] = [
      {
        id: 'doc1',
        createdAt: new Date('2023-01-01'),
        title: 'Doc 1',
        content: 'Content 1',
        kind: 'text',
        userId: 'user1',
      },
      {
        id: 'doc2',
        createdAt: new Date('2023-01-02'),
        title: 'Doc 2',
        content: 'Content 2',
        kind: 'text',
        userId: 'user1',
      },
    ];

    const result = getDocumentTimestampByIndex(documents, 1);
    expect(result).toEqual(new Date('2023-01-02'));
  });

  test('should return current date for empty documents', () => {
    const result = getDocumentTimestampByIndex([], 0);
    const now = new Date();
    expect(result.getTime()).toBeCloseTo(now.getTime(), -3); // Within second precision
  });

  test('should return current date for index out of bounds', () => {
    const documents: Document[] = [
      {
        id: 'doc1',
        createdAt: new Date('2023-01-01'),
        title: 'Doc 1',
        content: 'Content 1',
        kind: 'text',
        userId: 'user1',
      },
    ];

    const result = getDocumentTimestampByIndex(documents, 5);
    const now = new Date();
    expect(result.getTime()).toBeCloseTo(now.getTime(), -3); // Within second precision
  });
});

test.describe('getTrailingMessageId', () => {
  test('should return ID of last assistant message', () => {
    const messages = [
      { id: 'msg1', role: 'assistant' as const, content: 'Hello' },
      { id: 'msg2', role: 'assistant' as const, content: 'Hi there' },
    ];

    const result = getTrailingMessageId({ messages });
    expect(result).toBe('msg2');
  });

  test('should return null for empty messages', () => {
    const result = getTrailingMessageId({ messages: [] });
    expect(result).toBeNull();
  });
});

test.describe('sanitizeResponseMessages', () => {
  test('should filter out empty content', () => {
    const messages = [
      {
        id: 'msg1',
        role: 'assistant' as const,
        content: [
          { type: 'text' as const, text: 'Hello' },
          { type: 'text' as const, text: '' }, // Empty text should be filtered
        ],
      },
    ];

    const result = sanitizeResponseMessages({ messages, reasoning: undefined });
    expect(result).toHaveLength(1);
    expect(result[0].content).toHaveLength(1);
    if (result[0].content[0] && typeof result[0].content[0] === 'object' && 'text' in result[0].content[0]) {
      expect((result[0].content[0] as any).text).toBe('Hello');
    }
  });

  test('should add reasoning when provided', () => {
    const messages = [
      {
        id: 'msg1',
        role: 'assistant' as const,
        content: [{ type: 'text' as const, text: 'Hello' }],
      },
    ];

    const result = sanitizeResponseMessages({
      messages,
      reasoning: 'This is my reasoning'
    });

    expect(result[0].content).toHaveLength(2);
    expect(result[0].content[1]).toEqual({
      type: 'reasoning',
      reasoning: 'This is my reasoning',
    });
  });

  test('should filter out messages with empty content', () => {
    const messages = [
      {
        id: 'msg1',
        role: 'assistant' as const,
        content: [], // Empty content should be filtered out
      },
      {
        id: 'msg2',
        role: 'assistant' as const,
        content: [{ type: 'text' as const, text: 'Hello' }],
      },
    ];

    const result = sanitizeResponseMessages({ messages, reasoning: undefined });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('msg2');
  });
});

test.describe('fetcher', () => {
  test('should handle successful responses', async () => {
    // Mock fetch for successful response
    const mockFetch = {
      fn: () => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: 'success' }),
      }),
    };
    (global as any).fetch = mockFetch.fn;

    const result = await fetcher('/api/test');
    expect(result).toEqual({ data: 'success' });
  });

  test('should handle error responses', async () => {
    // Mock fetch for error response
    const mockFetch = {
      fn: () => Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      }),
    };
    (global as any).fetch = mockFetch.fn;

    await expect(fetcher('/api/not-found')).rejects.toThrow();
  });
});
import type { LanguageModelV2Prompt } from '@ai-sdk/provider';
import { simulateReadableStream } from 'ai';
import { MockLanguageModelV2 } from 'ai/test';
import { getResponseChunksByPrompt } from '../../tests/prompts/utils';

// AI SDK 5.x: MockLanguageModelV2 uses LanguageModelV2 interface
// doGenerate returns { content, finishReason, usage, warnings }
// doStream returns { stream }

export const chatModel = new MockLanguageModelV2({
  doGenerate: async () => ({
    content: [{ type: 'text' as const, text: 'Hello, world!' }],
    finishReason: 'stop' as const,
    usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
    warnings: [],
  }),
  doStream: async ({ prompt }: { prompt: LanguageModelV2Prompt }) => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 50,
      initialDelayInMs: 100,
      chunks: getResponseChunksByPrompt(prompt),
    }),
  }),
});

export const titleModel = new MockLanguageModelV2({
  doGenerate: async () => ({
    content: [{ type: 'text' as const, text: 'This is a test title' }],
    finishReason: 'stop' as const,
    usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
    warnings: [],
  }),
  doStream: async () => ({
    stream: simulateReadableStream({
      chunkDelayInMs: 50,
      initialDelayInMs: 100,
      chunks: [
        { type: 'text-delta' as const, id: '1', delta: 'This is a test title' },
        {
          type: 'finish' as const,
          finishReason: 'stop' as const,
          usage: { inputTokens: 3, outputTokens: 10, totalTokens: 13 },
        },
      ],
    }),
  }),
});

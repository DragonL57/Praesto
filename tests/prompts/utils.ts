import type { LanguageModelV2Prompt } from '@ai-sdk/provider';

export function getResponseChunksByPrompt(_prompt: LanguageModelV2Prompt) {
  // Return a simple response based on the prompt
  return [
    { type: 'text-delta' as const, id: '1', delta: 'Hello' },
    { type: 'text-delta' as const, id: '2', delta: ', ' },
    { type: 'text-delta' as const, id: '3', delta: 'world!' },
    {
      type: 'finish' as const,
      finishReason: 'stop' as const,
      usage: { inputTokens: 5, outputTokens: 12, totalTokens: 17 },
    },
  ];
}

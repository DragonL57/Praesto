import type { LanguageModelV2StreamPart } from '@ai-sdk/provider';
import type { ModelMessage } from 'ai';
import { TEST_PROMPTS } from './basic';

let idCounter = 0;
const generatePartId = () => `part-${idCounter++}`;

export function compareMessages(
  firstMessage: ModelMessage,
  secondMessage: ModelMessage,
): boolean {
  if (firstMessage.role !== secondMessage.role) return false;

  if (
    !Array.isArray(firstMessage.content) ||
    !Array.isArray(secondMessage.content)
  ) {
    return false;
  }

  if (firstMessage.content.length !== secondMessage.content.length) {
    return false;
  }

  for (let i = 0; i < firstMessage.content.length; i++) {
    const item1 = firstMessage.content[i];
    const item2 = secondMessage.content[i];

    if (item1.type !== item2.type) return false;

    if (item1.type === 'image' && item2.type === 'image') {
      // if (item1.image.toString() !== item2.image.toString()) return false;
      // if (item1.mimeType !== item2.mimeType) return false;
    } else if (item1.type === 'text' && item2.type === 'text') {
      if (item1.text !== item2.text) return false;
    } else if (item1.type === 'tool-result' && item2.type === 'tool-result') {
      if (item1.toolCallId !== item2.toolCallId) return false;
    } else {
      return false;
    }
  }

  return true;
}

// AI SDK 5.x: V2 stream parts use 'id' and 'delta' instead of 'textDelta'
const textToDeltas = (text: string): LanguageModelV2StreamPart[] => {
  const deltas = text.split(' ').map(
    (word) =>
      ({
        type: 'text-delta',
        id: generatePartId(),
        delta: `${word} `,
      }) as LanguageModelV2StreamPart,
  );

  return deltas;
};

export const getResponseChunksByPrompt = (
  prompt: ModelMessage[],
  _isReasoningEnabled = false,
): Array<LanguageModelV2StreamPart> => {
  const recentMessage = prompt.at(-1);

  if (!recentMessage) {
    throw new Error('No recent message found!');
  }

  if (compareMessages(recentMessage, TEST_PROMPTS.USER_SKY)) {
    return [
      ...textToDeltas("It's just blue duh!"),
      {
        type: 'finish',
        finishReason: 'stop',
        usage: { inputTokens: 3, outputTokens: 10, totalTokens: 13 },
      },
    ];
  } else if (compareMessages(recentMessage, TEST_PROMPTS.USER_GRASS)) {
    return [
      ...textToDeltas("It's just green duh!"),
      {
        type: 'finish',
        finishReason: 'stop',
        usage: { inputTokens: 3, outputTokens: 10, totalTokens: 13 },
      },
    ];
  }

  // Default response
  return [
    ...textToDeltas("I'm not sure how to respond to that."),
    {
      type: 'finish',
      finishReason: 'stop',
      usage: { inputTokens: 3, outputTokens: 10, totalTokens: 13 },
    },
  ];
};

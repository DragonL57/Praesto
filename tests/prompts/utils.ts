import type { CoreMessage, LanguageModelV1StreamPart } from 'ai';
import { TEST_PROMPTS } from './basic';

export function compareMessages(
  firstMessage: CoreMessage,
  secondMessage: CoreMessage,
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

const textToDeltas = (text: string): LanguageModelV1StreamPart[] => {
  const deltas = text
    .split(' ')
    .map((char) => ({ type: 'text-delta' as const, textDelta: `${char} ` }));

  return deltas;
};

export const getResponseChunksByPrompt = (
  prompt: CoreMessage[],
  isReasoningEnabled = false,
): Array<LanguageModelV1StreamPart> => {
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
        logprobs: undefined,
        usage: { completionTokens: 10, promptTokens: 3 },
      },
    ];
  } else if (compareMessages(recentMessage, TEST_PROMPTS.USER_GRASS)) {
    return [
      ...textToDeltas("It's just green duh!"),
      {
        type: 'finish',
        finishReason: 'stop',
        logprobs: undefined,
        usage: { completionTokens: 10, promptTokens: 3 },
      },
    ];
  }

  // Default response
  return [
    ...textToDeltas("I'm not sure how to respond to that."),
    {
      type: 'finish',
      finishReason: 'stop',
      logprobs: undefined,
      usage: { completionTokens: 10, promptTokens: 3 },
    },
  ];
};

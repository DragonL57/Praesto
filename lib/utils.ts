import type {
  CoreAssistantMessage,
  CoreToolMessage,
  UIMessage,
} from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import type { Document } from '@/lib/db/schema';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ApplicationError extends Error {
  info: string;
  status: number;
}

export const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error(
      'An error occurred while fetching the data.',
    ) as ApplicationError;

    error.info = await res.json();
    error.status = res.status;

    throw error;
  }

  return res.json();
};

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined' && window.localStorage) {
    return JSON.parse(window.localStorage.getItem(key) || '[]');
  }
  return [];
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// AI SDK 5.x: Tool invocations are now in message.parts as 'tool-invocation' type parts
// The 'tool-invocation' part uses 'toolCallId' (not 'toolInvocationId')
// Tool state should be 'output-available' when result is ready
// This function updates tool invocation parts with their results
function _addToolMessageToChat({
  toolMessage,
  messages,
}: {
  toolMessage: CoreToolMessage;
  messages: Array<UIMessage>;
}): Array<UIMessage> {
  return messages.map((message) => {
    // Find tool-invocation parts in the message
    const hasToolInvocations = message.parts.some(part =>
      part.type === 'tool-invocation' || (typeof part.type === 'string' && part.type.startsWith('tool-'))
    );

    if (hasToolInvocations) {
      return {
        ...message,
        parts: message.parts.map((part) => {
          // Check if this is a tool-related part
          if (part.type !== 'tool-invocation' && !(typeof part.type === 'string' && part.type.startsWith('tool-'))) {
            return part;
          }

          // AI SDK 5.x: Tool parts use 'toolCallId' property
          const partWithToolCall = part as { toolCallId?: string };
          if (!partWithToolCall.toolCallId) return part;

          const toolResult = toolMessage.content.find(
            (tool) => tool.toolCallId === partWithToolCall.toolCallId,
          );

          if (toolResult) {
            return {
              ...part,
              state: 'output-available' as const, // AI SDK 5.x uses 'output-available' instead of 'result'
              output: toolResult.output, // AI SDK 5.x uses 'output' property
            };
          }

          return part;
        }),
      };
    }

    return message;
  }) as Array<UIMessage>;
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function sanitizeResponseMessages({
  messages,
  reasoning,
}: {
  messages: Array<ResponseMessage>;
  reasoning: string | undefined;
}) {
  const toolResultIds: Array<string> = [];

  for (const message of messages) {
    if (message.role === 'tool') {
      for (const content of message.content) {
        if (content.type === 'tool-result') {
          toolResultIds.push(content.toolCallId);
        }
      }
    }
  }

  const messagesBySanitizedContent = messages.map((message) => {
    if (message.role !== 'assistant') return message;

    if (typeof message.content === 'string') return message;

    const sanitizedContent = message.content.filter((content) =>
      content.type === 'tool-call'
        ? toolResultIds.includes(content.toolCallId)
        : content.type === 'text'
          ? content.text.length > 0
          : true,
    );

    if (reasoning) {
      // @ts-expect-error: reasoning message parts in sdk is wip
      sanitizedContent.push({ type: 'reasoning', reasoning });
    }

    return {
      ...message,
      content: sanitizedContent,
    };
  });

  return messagesBySanitizedContent.filter(
    (message) => message.content.length > 0,
  );
}

export function getMostRecentUserMessage(messages: Array<UIMessage>) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Array<Document>,
  index: number,
) {
  if (!documents || documents.length === 0) return new Date();
  if (index < 0 || index >= documents.length) return new Date();
  return documents[index].createdAt;
}

export function getTrailingMessageId({
  messages,
}: {
  messages: Array<ResponseMessage>;
}): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) return null;

  return trailingMessage.id;
}
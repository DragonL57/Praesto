/**
 * Praesto Core AI Types
 * Fully decoupled from Vercel AI SDK
 */

export type Attachment = {
  url: string;
  name?: string;
  contentType?: string;
  mediaType?: string;
};

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export type TextPart = {
  type: 'text';
  text: string;
};

export type ReasoningPart = {
  type: 'reasoning';
  text: string;
};

export type ToolCallPart = {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown> | unknown;
};

export type ToolResultPart = {
  type: 'tool-result';
  toolCallId: string;
  toolName: string;
  result: unknown;
};

export type FilePart = {
  type: 'file';
  url: string;
  filename?: string;
  contentType?: string;
};

export type MessagePart =
  | TextPart
  | ReasoningPart
  | ToolCallPart
  | ToolResultPart
  | FilePart
  | { type: string;[key: string]: unknown }; // Allow for specialized tool parts

export interface Message {
  id: string;
  role: MessageRole;
  parts: MessagePart[];
  content?: string; // Legacy/fallback support
  createdAt?: Date;
}

export type ChatStatus = 'idle' | 'submitted' | 'streaming' | 'ready' | 'error';

export interface ChatRequestOptions {
  headers?: Record<string, string>;
  body?: unknown;
}

export type SetMessagesFunction = (
  messages: Message[] | ((messages: Message[]) => Message[]),
) => void;

export type AppendFunction = (
  message: {
    role: 'user' | 'assistant';
    parts: MessagePart[];
  },
  options?: ChatRequestOptions
) => Promise<string | null | undefined>;

export type ReloadFunction = (
  options?: ChatRequestOptions
) => Promise<string | null | undefined>;

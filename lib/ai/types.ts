/**
 * Shared AI types for components
 *
 * These types help bridge the gap between different versions of the AI SDK
 * where UIMessage and Message have slight type differences.
 */
import type { UIMessage } from 'ai';

// Custom Attachment type for AI SDK 5.x compatibility
// In v5, attachments are now part of the message parts array as file parts
export type Attachment = {
  url: string;
  name?: string;
  contentType?: string;
  mediaType?: string;
};

// Type for setMessages that works with UIMessage
export type SetMessagesFunction = (
  messages: UIMessage[] | ((messages: UIMessage[]) => UIMessage[]),
) => void;

// Type for append that works with restricted message types (user/assistant only)
export type AppendFunction = (
  message: {
    role: 'user' | 'assistant';
    content: string;
    // In AI SDK 5.x, attachments are handled via parts array
    attachments?: Attachment[];
  },
) => Promise<string | null | undefined>;

// Type for reload function
export type ReloadFunction = () => Promise<string | null | undefined>;

// Chat status type for AI SDK compatibility
export type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error';

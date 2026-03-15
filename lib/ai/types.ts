import type { UIMessage } from 'ai';

/**
 * Shared AI types for components without AI SDK dependency
 */

export type Attachment = {
  url: string;
  name?: string;
  contentType?: string;
  mediaType?: string;
};

// Re-export UIMessage from AI SDK to avoid conflicts
export type { UIMessage };

// Extract UIMessagePart from UIMessage if possible, or define a compatible one
export type UIMessagePart = UIMessage['parts'][number];

// Type for setMessages that works with UIMessage
export type SetMessagesFunction = (
  messages: UIMessage[] | ((messages: UIMessage[]) => UIMessage[]),
) => void;

// Type for append that works with restricted message types (user/assistant only)
export type AppendFunction = (
  message: {
    role: 'user' | 'assistant';
    content: string;
    attachments?: Attachment[];
  },
) => Promise<string | null | undefined>;

// Type for reload function
export type ReloadFunction = () => Promise<string | null | undefined>;

// Chat status type from AI SDK or equivalent
export type ChatStatus = 'idle' | 'submitted' | 'streaming' | 'ready' | 'error';

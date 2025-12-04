/**
 * Shared AI types for components
 * 
 * These types help bridge the gap between different versions of the AI SDK
 * where UIMessage and Message have slight type differences.
 */
import type { Attachment, UIMessage } from 'ai';

// Type for setMessages that works with UIMessage
export type SetMessagesFunction = (
    messages: UIMessage[] | ((messages: UIMessage[]) => UIMessage[])
) => void;

// Type for append that works with restricted message types (user/assistant only)
export type AppendFunction = (
    message:
        | {
            role: 'user' | 'assistant';
            content: string;
            experimental_attachments?: Attachment[];
        }
) => Promise<string | null | undefined>;

// Type for reload function
export type ReloadFunction = () => Promise<string | null | undefined>;

// Chat status type for AI SDK compatibility
export type ChatStatus = 'submitted' | 'streaming' | 'ready' | 'error';

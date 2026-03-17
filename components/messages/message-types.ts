/**
 * Type definitions for message components
 * Shared across message.tsx, message-reasoning.tsx, and related components
 * Without AI SDK dependency
 */

import type {
    Message,
    MessagePart,
    AppendFunction,
    SetMessagesFunction,
    ChatStatus,
    Attachment } from '@/lib/ai/types';


// ============================================================================
// Suggestion Type
// ============================================================================

export interface Suggestion {
    title: string;
    label: string;
    action: string;
}

// ============================================================================
// Tool & Reasoning Types
// ============================================================================

export interface WebSearchResult {
    title: string;
    href: string;
    body: string;
}

export interface WebSearchData {
    results: WebSearchResult[];
    query: string;
    count: number;
}

export interface FetchedPageInfoData {
    url: string;
    query?: string | null;
}

export interface CodeExecutionData {
    code: string;
    language?: 'javascript' | 'python';
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    packages?: string[];
    state?: 'input-streaming' | 'input-available' | 'output-available' | 'output-error' | 'loading';
}

export type ReasoningContentItem =
    | string
    | { type: 'webSearch'; data: WebSearchData }
    | { type: 'fetchedPageInfo'; data: FetchedPageInfoData }
    | { type: 'codeExecution'; data: CodeExecutionData };

export interface ReasoningDetail {
    type: string;
    text?: string;
}

export interface ThinkToolResult {
    thought?: string;
}

// ============================================================================
// Enhanced Message Part Types
// ============================================================================

export type EnhancedMessagePart = MessagePart & {
    connectNext?: boolean;
    connectPrevious?: boolean;
    toolIndex?: number;
};

// ============================================================================
// Component Props Types
// ============================================================================

export interface PurePreviewMessageProps {
    chatId: string;
    message: Message;
    isLoading: boolean;
    setMessages: SetMessagesFunction;
    reload: () => Promise<string | null | undefined>;
    append: AppendFunction;
    isReadonly: boolean;
    suggestions?: Suggestion[];
    suggestionsLoading?: boolean;
    sendMessage?: (args: { text: string; attachments?: Attachment[] }) => Promise<void>;
    status?: ChatStatus;
}

export interface PreviewMessageProps
    extends Omit<PurePreviewMessageProps, 'isReadonly'> {
    isReadonly: boolean;
}

export interface MessageActionsProps {
    chatId: string;
    message: Message;
    isLoading: boolean;
    setMessages?: SetMessagesFunction;
}

// ============================================================================
// Tool Part Types
// ============================================================================

export interface ToolCallPart {
    type: string; // 'tool-<name>' or 'tool-call'
    toolName?: string;
    toolCallId?: string;
    state?: string;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
}

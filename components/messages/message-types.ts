/**
 * Type definitions for message components
 * Shared across message.tsx, message-reasoning.tsx, and related components
 */

import type { UIMessage } from 'ai';
import type { AppendFunction, SetMessagesFunction } from '@/lib/ai/types';
import type { UseChatHelpers } from '@ai-sdk/react';

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

export type ReasoningContentItem =
    | string
    | { type: 'webSearch'; data: WebSearchData }
    | { type: 'fetchedPageInfo'; data: FetchedPageInfoData };

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

export type EnhancedMessagePart = UIMessage['parts'][0] & {
    connectNext?: boolean;
    connectPrevious?: boolean;
    toolIndex?: number;
    state?: string; // for tool parts: 'input-available', 'output-available', etc.
};

// ============================================================================
// Component Props Types
// ============================================================================

export interface PurePreviewMessageProps {
    chatId: string;
    message: UIMessage;
    isLoading: boolean;
    setMessages: SetMessagesFunction;
    reload: () => Promise<string | null | undefined>;
    append: AppendFunction;
    isReadonly: boolean;
    suggestions?: Suggestion[];
    suggestionsLoading?: boolean;
    sendMessage?: UseChatHelpers<UIMessage>['sendMessage'];
    status?: 'submitted' | 'streaming' | 'ready' | 'error';
}

export interface PreviewMessageProps
    extends Omit<PurePreviewMessageProps, 'isReadonly'> {
    isReadonly: boolean;
}

export interface MessageActionsProps {
    chatId: string;
    message: UIMessage;
    isLoading: boolean;
    setMessages?: SetMessagesFunction;
}

// ============================================================================
// Tool Part Types (AI SDK 5.x compatibility)
// ============================================================================

export interface ToolCallPart {
    type: string; // 'tool-<name>' or 'dynamic-tool'
    toolName?: string;
    toolCallId?: string;
    state?: string;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
}

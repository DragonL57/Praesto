// Type for a step in the result.steps array
export interface Step {
    toolCalls?: ToolCall[];
    toolResults?: ToolResult[];
}

// Type for reasoning array elements
export type ReasoningItem = string | { text: string };

// Define file attachment interface for internal use
export interface FileAttachment {
    url: string;
    name?: string;
    contentType?: string;
    mediaType?: string;
}

// Type definitions for tool calls and results
export interface ToolCall {
    toolName: string;
    toolCallId: string;
    args?: Record<string, unknown>;
}

export interface ToolResult {
    toolName: string;
    toolCallId: string;
    result?: unknown;
}

// Define an interface for the expected 'data' object from the frontend
export interface RequestData {
    useReasoning?: boolean;
}

export interface UserTimeContext {
    date: string;
    time: string;
    dayOfWeek: string;
    timeZone: string;
}

/**
 * Extract file parts from message parts without AI SDK types
 */
import type { MessagePart, FilePart } from '../types';

export function getFilePartsFromMessage(message: { parts?: MessagePart[] } | null | undefined): FileAttachment[] {
    if (!message || !Array.isArray(message.parts)) return [];

    return message.parts
        .filter((part): part is FilePart => part.type === 'file')
        .map((part): FileAttachment => ({
            url: part.url ?? '',
            name: part.filename,
            contentType: part.contentType,
            mediaType: part.contentType ?? undefined,
        }));
}

/**
 * Utility functions for message processing
 * Helpers for tool detection, extraction, and styling
 */

import type { UIMessage } from 'ai';
import type { EnhancedMessagePart } from './message-types';

// ============================================================================
// Tool Part Detection & Extraction Helpers (AI SDK 5.x)
// ============================================================================

/**
 * Check if a part is a tool call part
 * AI SDK 5.x: Tool parts have type 'tool-<name>' or 'dynamic-tool'
 */
export const isToolPart = (part: UIMessage['parts'][0]): boolean => {
    return part.type.startsWith('tool-') || part.type === 'dynamic-tool';
};

/**
 * Extract tool name from a tool part
 */
export const extractToolName = (part: UIMessage['parts'][0]): string => {
    if (part.type === 'dynamic-tool' && 'toolName' in part) {
        return (part as { toolName: string }).toolName;
    }
    if (part.type.startsWith('tool-')) {
        return part.type.substring(5); // Remove 'tool-' prefix
    }
    return '';
};

/**
 * Get tool call ID from a tool part
 */
export const getToolCallId = (part: UIMessage['parts'][0]): string => {
    if ('toolCallId' in part) {
        return (part as { toolCallId: string }).toolCallId;
    }
    return '';
};

/**
 * Check if tool result is available
 * AI SDK 5.x: Check for 'output-available' state
 */
export const isToolResultAvailable = (part: UIMessage['parts'][0]): boolean => {
    if ('state' in part) {
        return (part as { state: string }).state === 'output-available';
    }
    return false;
};

/**
 * Get tool output/result
 */
export const getToolOutput = (
    part: UIMessage['parts'][0],
): Record<string, unknown> | undefined => {
    if ('output' in part) {
        return part.output as Record<string, unknown>;
    }
    return undefined;
};

// ============================================================================
// Styling Utilities
// ============================================================================

/**
 * Generate a consistent gradient style for user messages
 * Uses message ID hash to provide variety while remaining consistent per message
 */
export const getGradientStyle = (message: UIMessage): string => {
    // Hash function for string to number
    const hashCode = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    };

    const hash = hashCode(message.id);
    const gradientTypes = [
        // Standard horizontal gradient
        'dark:bg-gradient-to-r dark:from-blue-900/80 dark:to-zinc-800/90 bg-gradient-to-r from-blue-100/80 to-zinc-100',
        // Diagonal gradient (top-left to bottom-right)
        'dark:bg-gradient-to-br dark:from-blue-900/80 dark:to-zinc-800/90 bg-gradient-to-br from-blue-100/80 to-zinc-100',
        // Diagonal gradient (top-right to bottom-left)
        'dark:bg-gradient-to-bl dark:from-blue-900/80 dark:to-zinc-800/90 bg-gradient-to-bl from-blue-100/80 to-zinc-100',
        // Vertical gradient (top to bottom)
        'dark:bg-gradient-to-b dark:from-blue-900/80 dark:to-zinc-800/90 bg-gradient-to-b from-blue-100/80 to-zinc-100',
        // Radial gradient effect (using opacity variations)
        'dark:bg-gradient-to-r dark:from-blue-900/90 dark:via-blue-800/85 dark:to-zinc-800/80 bg-gradient-to-r from-blue-100/90 via-blue-50/85 to-zinc-100/80',
    ];

    // Use the hash to select a gradient type
    const gradientIndex = hash % gradientTypes.length;
    return gradientTypes[gradientIndex];
};

// ============================================================================
// Text Processing Utilities
// ============================================================================

/**
 * List of tool names that are handled by MessageReasoning component
 * These should not be rendered in the main message flow
 */
export const REASONING_TOOL_NAMES = [
    'think',
    'webSearch',
    'readWebsiteContent',
] as const;

/**
 * Check if a tool name is handled by reasoning
 */
export const isReasoningTool = (toolName: string): boolean => {
    return (REASONING_TOOL_NAMES as readonly string[]).includes(toolName);
};

/**
 * List of tool names that use Calendar component
 */
export const CALENDAR_TOOL_NAMES = [
    'listCalendarEvents',
    'createCalendarEvent',
    'updateCalendarEvent',
    'deleteCalendarEvent',
    'findFreeTimeSlots',
    'getCalendarEvent',
] as const;

/**
 * Check if a tool name uses Calendar component
 */
export const isCalendarTool = (toolName: string): boolean => {
    return (CALENDAR_TOOL_NAMES as readonly string[]).includes(toolName);
};

// ============================================================================
// Tool Grouping Utilities
// ============================================================================

/**
 * Check if two tool calls should be grouped together
 * Used for visual grouping of related tool calls
 */
export const shouldGroupTools = (
    currentToolName: string,
    nextToolName: string,
): boolean => {
    return (
        (currentToolName === 'webSearch' &&
            (nextToolName === 'readWebsiteContent' || nextToolName === 'webSearch')) ||
        (currentToolName === 'readWebsiteContent' &&
            nextToolName === 'readWebsiteContent')
    );
};

/**
 * Apply tool grouping logic to enhanced parts
 * Marks which parts should be visually connected
 */
export const applyToolGrouping = (
    enhancedParts: EnhancedMessagePart[],
): EnhancedMessagePart[] => {
    // First pass: Mark connections
    for (let i = 0; i < enhancedParts.length; i++) {
        const part = enhancedParts[i];
        if (isToolPart(part) && isToolResultAvailable(part)) {
            const currentToolName = extractToolName(part);

            // Check for next tool part
            let nextToolPart: EnhancedMessagePart | null = null;
            let textEncounteredNext = false;

            for (let j = i + 1; j < enhancedParts.length; j++) {
                const potentialNextPart = enhancedParts[j];
                if (
                    potentialNextPart.type === 'text' &&
                    potentialNextPart.text?.trim().length > 0
                ) {
                    textEncounteredNext = true;
                    break;
                }
                if (isToolPart(potentialNextPart) && isToolResultAvailable(potentialNextPart)) {
                    nextToolPart = potentialNextPart;
                    break;
                }
            }

            if (!textEncounteredNext && nextToolPart && isToolPart(nextToolPart)) {
                const nextToolName = extractToolName(nextToolPart);
                if (shouldGroupTools(currentToolName, nextToolName)) {
                    part.connectNext = true;
                }
            }

            // Check for previous tool part
            let prevToolPart: EnhancedMessagePart | null = null;
            let textEncounteredPrev = false;

            for (let j = i - 1; j >= 0; j--) {
                const potentialPrevPart = enhancedParts[j];
                if (
                    potentialPrevPart.type === 'text' &&
                    potentialPrevPart.text?.trim().length > 0
                ) {
                    textEncounteredPrev = true;
                    break;
                }
                if (isToolPart(potentialPrevPart) && isToolResultAvailable(potentialPrevPart)) {
                    prevToolPart = potentialPrevPart;
                    break;
                }
            }

            if (!textEncounteredPrev && prevToolPart && isToolPart(prevToolPart)) {
                const prevToolName = extractToolName(prevToolPart);
                if (shouldGroupTools(prevToolName, currentToolName)) {
                    part.connectPrevious = true;
                }
            }
        }
    }

    // Second pass: Assign group indices
    let currentGroupIndex = 0;
    for (let i = 0; i < enhancedParts.length; i++) {
        const part = enhancedParts[i];
        if (isToolPart(part) && isToolResultAvailable(part)) {
            if (part.toolIndex === -1) {
                part.toolIndex = currentGroupIndex;
                if (part.connectNext) {
                    let j = i + 1;
                    while (j < enhancedParts.length) {
                        const nextPart = enhancedParts[j];
                        if (!isToolPart(nextPart) || !isToolResultAvailable(nextPart)) {
                            j++;
                            continue;
                        }
                        if (nextPart.connectPrevious) {
                            nextPart.toolIndex = currentGroupIndex;
                            if (!nextPart.connectNext) break;
                        } else {
                            break;
                        }
                        j++;
                    }
                    currentGroupIndex++;
                } else if (!part.connectPrevious) {
                    currentGroupIndex++;
                }
            }
        }
    }

    return enhancedParts;
};

/**
 * Custom hooks for message processing
 * Handles reasoning elements extraction and message parts processing
 */

import { useMemo } from 'react';
import type { UIMessage } from 'ai';
import type {
    ReasoningContentItem,
    EnhancedMessagePart,
    ThinkToolResult,
    WebSearchData,
    WebSearchResult,
} from './message-types';
import {
    isToolPart,
    extractToolName,
    isToolResultAvailable,
    getToolOutput,
    applyToolGrouping,
} from './message-utils';

// ============================================================================
// useReasoningElements Hook
// ============================================================================

interface ReasoningElementsResult {
    reasoningElements: ReasoningContentItem[];
    indicesToFilter: Set<number>;
}

/**
 * Extract and consolidate reasoning elements from message parts
 * Handles: reasoning parts, <think> tags, Poe thinking format (>), think tool, webSearch, readWebsiteContent
 */
export function useReasoningElements(message: UIMessage): ReasoningElementsResult {
    return useMemo(() => {
        const elements: ReasoningContentItem[] = [];
        const filterIndices = new Set<number>();
        const thinkTagRegex = /<think>([\s\S]*?)<\/think>/i;

        if (!message.parts || message.parts.length === 0) {
            return { reasoningElements: elements, indicesToFilter: filterIndices };
        }

        message.parts.forEach((part, index) => {
            // a) Check for dedicated reasoning parts
            if (part.type === 'reasoning') {
                const reasoningPart = part as {
                    text?: unknown;
                    reasoningText?: unknown;
                    details?: unknown;
                };
                let content = '';

                // AI SDK 5.x uses 'text' property for reasoning
                if (typeof reasoningPart.text === 'string') {
                    content = reasoningPart.text;
                } else if (typeof reasoningPart.reasoningText === 'string') {
                    // Fallback for older format
                    content = reasoningPart.reasoningText;
                } else if (Array.isArray(reasoningPart.details)) {
                    // Fallback for details array format
                    content = (reasoningPart.details as Array<{ type: string; text?: string }>)
                        .map((detail) => {
                            return detail.type === 'text' && detail.text ? detail.text : '';
                        })
                        .join('');
                }

                if (content.trim()) {
                    elements.push(content.trim());
                    filterIndices.add(index);
                }
            }
            // b) Check for embedded <think> tags in text parts (assistant only)
            else if (
                message.role === 'assistant' &&
                part.type === 'text' &&
                typeof part.text === 'string'
            ) {
                const thinkMatch = part.text.match(thinkTagRegex);
                if (thinkMatch?.[1]) {
                    elements.push(thinkMatch[1].trim());
                    // Text part itself isn't filtered, just cleaned later
                } else {
                    // Check for Poe API thinking format (lines starting with >)
                    const lines = part.text.split('\n');
                    const thinkingLines: string[] = [];
                    const nonThinkingLines: string[] = [];
                    let inThinkingBlock = false;

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (trimmedLine.startsWith('>')) {
                            // This is a thinking line
                            inThinkingBlock = true;
                            // Remove the > prefix and any following space
                            const thinkingContent = trimmedLine.substring(1).trim();
                            if (thinkingContent) {
                                thinkingLines.push(thinkingContent);
                            }
                        } else if (!(inThinkingBlock && trimmedLine === '')) {
                            // Non-thinking line or meaningful line, end of thinking block
                            inThinkingBlock = false;
                            nonThinkingLines.push(line);
                        }
                    }

                    // If we found thinking content, add it to reasoning elements
                    if (thinkingLines.length > 0) {
                        const thinkingContent = thinkingLines.join('\n').trim();
                        if (thinkingContent) {
                            elements.push(thinkingContent);
                        }
                    }

                    // Update the text part to remove thinking content if we had thinking content
                    if (thinkingLines.length > 0) {
                        part.text = nonThinkingLines.join('\n');
                    }
                }
            }
            // c) Check for tool results to include in reasoning
            else if (isToolPart(part) && isToolResultAvailable(part)) {
                const toolName = extractToolName(part);
                const result = getToolOutput(part);

                if (result && typeof result === 'object') {
                    // i) Handle 'think' tool results
                    if (toolName === 'think') {
                        const thought = (result as ThinkToolResult).thought;
                        if (typeof thought === 'string' && thought.trim()) {
                            elements.push(thought.trim());
                            filterIndices.add(index);
                        }
                    }
                    // ii) Handle 'webSearch' tool results
                    else if (toolName === 'webSearch') {
                        const searchResult = result as {
                            results: WebSearchResult[];
                            query: string;
                            count: number;
                        };
                        if (
                            searchResult.results &&
                            searchResult.query &&
                            typeof searchResult.count === 'number'
                        ) {
                            elements.push({ type: 'webSearch', data: searchResult as WebSearchData });
                            filterIndices.add(index);
                        }
                    }
                    // iii) Handle 'readWebsiteContent' results
                    else if (toolName === 'readWebsiteContent') {
                        const webContentResult = result as {
                            content?: string;
                            url?: string;
                            query?: string;
                        };
                        if (webContentResult.url) {
                            elements.push({
                                type: 'fetchedPageInfo',
                                data: {
                                    url: webContentResult.url,
                                    query: webContentResult.query,
                                },
                            });
                            filterIndices.add(index);
                        }
                    }
                }
            }
        });

        return {
            reasoningElements: elements,
            indicesToFilter: filterIndices,
        };
    }, [message.parts, message.role]);
}

// ============================================================================
// useProcessedParts Hook
// ============================================================================

/**
 * Process message parts: filter reasoning, clean text, apply grouping
 */
export function useProcessedParts(
    message: UIMessage,
    indicesToFilter: Set<number>,
): EnhancedMessagePart[] {
    return useMemo(() => {
        const thinkTagRegexForReplace = /<think>[\s\S]*?<\/think>/i;

        // Step 1: Filter and clean parts
        const partsForMainFlow = message.parts
            ?.map((originalPart, originalIndex) => {
                if (indicesToFilter.has(originalIndex)) {
                    return null;
                }
                if (
                    message.role === 'assistant' &&
                    originalPart.type === 'text' &&
                    typeof originalPart.text === 'string'
                ) {
                    const cleanedText = originalPart.text
                        .replace(thinkTagRegexForReplace, '')
                        .trim();
                    if (cleanedText.length === 0 && message.parts.length > 1) {
                        return null;
                    }
                    return { ...originalPart, text: cleanedText };
                }
                return { ...originalPart };
            })
            .filter((part) => part !== null) as Array<UIMessage['parts'][0]>;

        // Step 2: Create enhanced parts with initial properties
        const enhancedParts = partsForMainFlow.map((part) => {
            const enhancedPart = { ...part } as EnhancedMessagePart;
            enhancedPart.connectNext = false;
            enhancedPart.connectPrevious = false;
            enhancedPart.toolIndex = -1;
            return enhancedPart;
        });

        // Step 3: Apply tool grouping logic
        return applyToolGrouping(enhancedParts);
    }, [message.parts, message.role, indicesToFilter]);
}

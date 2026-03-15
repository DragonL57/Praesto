/**
 * Custom hooks for message processing
 * Handles reasoning elements extraction and message parts processing
 * Without AI SDK dependency
 */

import { useMemo } from 'react';
import type { Message, TextPart, ReasoningPart, MessagePart } from '@/lib/ai/types';
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
export function useReasoningElements(message: Message): ReasoningElementsResult {
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
                const reasoningPart = part as ReasoningPart;
                if (reasoningPart.text?.trim()) {
                    elements.push(reasoningPart.text.trim());
                    filterIndices.add(index);
                }
            }
            // b) Check for embedded <think> tags or Poe format in text parts
            else if (
                message.role === 'assistant' &&
                part.type === 'text'
            ) {
                const textPart = part as TextPart;
                const partText = textPart.text;
                
                // Extract <think> content
                const thinkMatch = partText.match(thinkTagRegex);
                if (thinkMatch?.[1]) {
                    elements.push(thinkMatch[1].trim());
                } 
                
                // Also check for lines starting with > (Poe/reasoning style)
                const lines = partText.split('\n');
                const thinkingLines = lines
                    .filter(line => line.trim().startsWith('>'))
                    .map(line => line.trim().substring(1).trim());

                if (thinkingLines.length > 0) {
                    const thinkingContent = thinkingLines.join('\n').trim();
                    if (thinkingContent) {
                        elements.push(thinkingContent);
                    }
                }
            }
            // c) Check for tool results to include in reasoning
            else if (isToolPart(part) && isToolResultAvailable(part)) {
                const toolName = extractToolName(part);
                const result = getToolOutput(part);

                if (result && typeof result === 'object') {
                    if (toolName === 'think') {
                        const thought = (result as ThinkToolResult).thought;
                        if (typeof thought === 'string' && thought.trim()) {
                            elements.push(thought.trim());
                            filterIndices.add(index);
                        }
                    }
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
    message: Message,
    indicesToFilter: Set<number>,
): EnhancedMessagePart[] {
    return useMemo(() => {
        const thinkTagRegexForReplace = /<think>[\s\S]*?<\/think>/i;

        // Step 1: Filter and clean parts
        const partsForMainFlow = (message.parts || [])
            .map((originalPart, originalIndex) => {
                if (indicesToFilter.has(originalIndex)) {
                    return null;
                }
                
                if (
                    message.role === 'assistant' &&
                    originalPart.type === 'text'
                ) {
                    const textPart = originalPart as TextPart;
                    
                    // Remove <think> tags
                    let cleanedText = textPart.text.replace(thinkTagRegexForReplace, '');
                    
                    // Remove lines starting with >
                    const lines = cleanedText.split('\n');
                    const nonThinkingLines = lines.filter(line => !line.trim().startsWith('>'));
                    cleanedText = nonThinkingLines.join('\n').trim();

                    if (cleanedText.length === 0 && message.parts.length > 1) {
                        return null;
                    }
                    
                    return { ...originalPart, text: cleanedText } as MessagePart;
                }
                
                return { ...originalPart };
            })
            .filter((part): part is MessagePart => part !== null);

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

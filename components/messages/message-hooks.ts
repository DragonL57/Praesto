/**
 * Custom hooks for message processing
 * Handles reasoning elements extraction and message parts processing
 * Without AI SDK dependency
 */

import { useMemo } from 'react';
import type { Message, TextPart, ReasoningPart, MessagePart, ToolCallPart } from '@/lib/ai/types';
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
    getToolCallId,
    applyToolGrouping,
} from './message-utils';

// ============================================================================
// useReasoningElements Hook
// ============================================================================

interface ReasoningElementsResult {
    reasoningElements: ReasoningContentItem[];
    indicesToFilter: Set<number>;
}

interface SandboxToolArgs {
    code: string;
    language?: 'javascript' | 'python';
    packages?: string[];
}

/**
 * Extract and consolidate reasoning elements from message parts
 * Handles: reasoning parts, <think> tags, Poe thinking format (>), think tool, webSearch, readWebsiteContent, executeSandboxCode
 */
export function useReasoningElements(message: Message): ReasoningElementsResult {
    return useMemo(() => {
        const elements: ReasoningContentItem[] = [];
        const filterIndices = new Set<number>();
        const thinkTagRegex = /<think>([\s\S]*?)<\/think>/i;

        if (!message.parts || message.parts.length === 0) {
            return { reasoningElements: elements, indicesToFilter: filterIndices };
        }

        // Map to track tool calls for consolidation with results
        const toolCallMap = new Map<string, { index: number; toolName: string; args: Record<string, unknown>; state?: string }>();

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
            // c) Track tool calls for reasoning tools
            else if (part.type === 'tool-call') {
                const toolCall = part as ToolCallPart & { state?: string };
                const toolName = toolCall.toolName;
                if (toolName === 'executeSandboxCode' || toolName === 'webSearch' || toolName === 'readWebsiteContent' || toolName === 'think') {
                    toolCallMap.set(toolCall.toolCallId, { 
                        index, 
                        toolName, 
                        args: toolCall.args as Record<string, unknown>,
                        state: toolCall.state
                    });
                }
            }
            // d) Check for tool results to include in reasoning
            else if (isToolPart(part) && isToolResultAvailable(part)) {
                const toolName = extractToolName(part);
                const result = getToolOutput(part);
                const toolCallId = getToolCallId(part);
                const toolCallInfo = toolCallMap.get(toolCallId);

                if (result && typeof result === 'object') {
                    if (toolName === 'think') {
                        const thought = (result as ThinkToolResult).thought;
                        if (typeof thought === 'string' && thought.trim()) {
                            elements.push(thought.trim());
                            filterIndices.add(index);
                            if (toolCallInfo) filterIndices.add(toolCallInfo.index);
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
                            if (toolCallInfo) filterIndices.add(toolCallInfo.index);
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
                            if (toolCallInfo) filterIndices.add(toolCallInfo.index);
                        }
                    }
                    else if (toolName === 'executeSandboxCode') {
                        const executionResult = result as {
                            stdout?: string;
                            stderr?: string;
                            exitCode?: number;
                        };
                        if (toolCallInfo) {
                            const args = toolCallInfo.args as unknown as SandboxToolArgs;
                            elements.push({
                                type: 'codeExecution',
                                data: {
                                    code: args.code,
                                    language: args.language,
                                    packages: args.packages,
                                    stdout: executionResult.stdout,
                                    stderr: executionResult.stderr,
                                    exitCode: executionResult.exitCode,
                                    state: 'output-available',
                                },
                            });
                            filterIndices.add(index);
                            filterIndices.add(toolCallInfo.index);
                        }
                    }
                }
            }
        });

        // Add pending tool calls (ones without results yet)
        toolCallMap.forEach((info, _id) => {
            if (!filterIndices.has(info.index)) {
                if (info.toolName === 'executeSandboxCode') {
                    const args = info.args as unknown as SandboxToolArgs;
                    elements.push({
                        type: 'codeExecution',
                        data: {
                            code: args.code,
                            language: args.language,
                            packages: args.packages,
                            state: info.state === 'input-streaming' ? 'input-streaming' : 'input-available',
                        },
                    });
                    filterIndices.add(info.index);
                }
                // We could add webSearch here too if we want to show it while it's "Searching..."
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

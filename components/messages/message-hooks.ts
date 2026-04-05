/**
 * Custom hooks for message processing
 * Handles reasoning elements extraction and message parts processing
 * Without AI SDK dependency
 */

import { useMemo } from 'react';
import {
  isToolPart,
  extractToolName,
  isToolResultAvailable,
  getToolOutput,
  getToolCallId,
  applyToolGrouping,
  isReasoningTool,
} from './message-utils';
import type {
  Message,
  TextPart,
  ReasoningPart,
  MessagePart,
  ToolCallPart,
  ToolResultPart,
} from '@/lib/ai/types';
import type {
  ReasoningContentItem,
  EnhancedMessagePart,
  ThinkToolResult,
  WebSearchData,
  WebSearchResult,
  MergedMessagePart,
} from './message-types';
import type { CouncilAgent } from './CouncilDebate';

// ============================================================================
// Types & Interfaces
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

// ============================================================================
// useOrderedMessageParts Hook
// ============================================================================

/**
 * Hook to return message parts in order, grouping reasoning parts where they occur.
 * This ensures that if a model sends text, then reasoning, then text, they are
 * rendered in that exact sequence.
 */
export function useOrderedMessageParts(message: Message): {
  orderedParts: MergedMessagePart[];
} {
  return useMemo(() => {
    if (!message.parts || message.parts.length === 0) {
      return { orderedParts: [] };
    }

    const merged: MergedMessagePart[] = [];
    const filterIndices = new Set<number>();
    const thinkTagRegex = /<think>([\s\S]*?)<\/think>/i;
    const thinkTagRegexForReplace = /<think>[\s\S]*?<\/think>/i;

    // Map to track tool calls for consolidation with results
    const toolCallMap = new Map<
      string,
      {
        index: number;
        toolName: string;
        args: Record<string, unknown>;
        state?: string;
      }
    >();

    // We'll iterate and collect reasoning elements as they appear
    let currentReasoningGroup: ReasoningContentItem[] = [];

    const flushReasoningGroup = () => {
      if (currentReasoningGroup.length > 0) {
        merged.push({ type: 'reasoning', items: [...currentReasoningGroup] });
        currentReasoningGroup = [];
      }
    };

    // First pass to identify which tool calls correspond to which results
    // and which parts should be filtered (consumed by reasoning)
    message.parts.forEach((part, index) => {
      if (part.type === 'tool-call') {
        const toolCall = part as ToolCallPart & { state?: string };
        if (isReasoningTool(toolCall.toolName)) {
          toolCallMap.set(toolCall.toolCallId, {
            index,
            toolName: toolCall.toolName,
            args: toolCall.args as Record<string, unknown>,
            state: toolCall.state,
          });
        }
      }
    });

    // Second pass: process parts in order
    message.parts.forEach((part, index) => {
      // Skip if this part was already "consumed" (e.g. tool-call whose result we've processed)
      if (filterIndices.has(index)) return;

      // Handle dedicated reasoning part
      if (part.type === 'reasoning') {
        const reasoningPart = part as ReasoningPart;
        if (reasoningPart.text?.trim()) {
          currentReasoningGroup.push(reasoningPart.text.trim());
          filterIndices.add(index);
        }
      }
      // Handle text parts with embedded thinking
      else if (message.role === 'assistant' && part.type === 'text') {
        const textPart = part as TextPart;
        const partText = textPart.text;

        // Extract <think> content
        const thinkMatch = partText.match(thinkTagRegex);
        if (thinkMatch?.[1]) {
          // Before the reasoning, if there's text, flush previous reasoning and add text
          let cleanedText = partText.replace(thinkTagRegexForReplace, '');

          currentReasoningGroup.push(thinkMatch[1].trim());

          // Also check for lines starting with >
          const lines = cleanedText.split('\n');
          const nonThinkingLines = lines.filter(
            (line) => !line.trim().startsWith('>'),
          );
          const thinkingLines = lines
            .filter((line) => line.trim().startsWith('>'))
            .map((line) => line.trim().substring(1).trim());

          if (thinkingLines.length > 0) {
            currentReasoningGroup.push(thinkingLines.join('\n').trim());
          }

          cleanedText = nonThinkingLines.join('\n').trim();
          if (cleanedText.length > 0) {
            flushReasoningGroup();
            merged.push({
              type: 'part',
              part: { ...part, text: cleanedText } as EnhancedMessagePart,
            });
          }
        } else {
          // Check for Poe style lines
          const lines = partText.split('\n');
          const thinkingLines = lines
            .filter((line) => line.trim().startsWith('>'))
            .map((line) => line.trim().substring(1).trim());

          if (thinkingLines.length > 0) {
            currentReasoningGroup.push(thinkingLines.join('\n').trim());
            const cleanedText = lines
              .filter((line) => !line.trim().startsWith('>'))
              .join('\n')
              .trim();
            if (cleanedText.length > 0) {
              flushReasoningGroup();
              merged.push({
                type: 'part',
                part: { ...part, text: cleanedText } as EnhancedMessagePart,
              });
            }
          } else {
            // Normal text
            flushReasoningGroup();
            merged.push({
              type: 'part',
              part: { ...part } as EnhancedMessagePart,
            });
          }
        }
      }
      // Handle council-debate parts
      else if ((part as MessagePart).type === 'council-debate') {
        flushReasoningGroup();
        const councilPart = part as unknown as {
          type: 'council-debate';
          agents: CouncilAgent[];
          isComplete: boolean;
          isSynthesizing: boolean;
        };
        merged.push({
          type: 'council-debate',
          agents: councilPart.agents,
          isComplete: councilPart.isComplete,
          isSynthesizing: councilPart.isSynthesizing,
        });
        filterIndices.add(index);
      }
      // Handle Tool Call parts
      else if (part.type === 'tool-call') {
        const toolCall = part as ToolCallPart;
        if (isReasoningTool(toolCall.toolName)) {
          // It's a reasoning tool call. Check if we have a result for it.

          // Look ahead for result
          let hasResult = false;
          for (let j = index + 1; j < message.parts.length; j++) {
            const nextPart = message.parts[j];
            if (
              nextPart.type === 'tool-result' &&
              (nextPart as ToolResultPart).toolCallId === toolCall.toolCallId
            ) {
              hasResult = true;
              break;
            }
          }

          if (!hasResult) {
            // Pending reasoning tool
            if (toolCall.toolName === 'executeSandboxCode') {
              const args = toolCall.args as unknown as SandboxToolArgs;
              currentReasoningGroup.push({
                type: 'codeExecution',
                data: {
                  code: args.code,
                  language: args.language,
                  packages: args.packages,
                  state:
                    (toolCall as ToolCallPart & { state?: string }).state ===
                    'input-streaming'
                      ? 'input-streaming'
                      : 'input-available',
                },
              });
            } else if (toolCall.toolName === 'webSearch') {
              // Searching state...
            }
            filterIndices.add(index);
          }
        } else {
          // Normal tool call
          flushReasoningGroup();
          merged.push({
            type: 'part',
            part: { ...part } as EnhancedMessagePart,
          });
        }
      }
      // Handle Tool Result parts
      else if (part.type === 'tool-result') {
        const toolResult = part as ToolResultPart;
        if (isReasoningTool(toolResult.toolName)) {
          const toolCallId = toolResult.toolCallId;
          const toolCallInfo = toolCallMap.get(toolCallId);
          const result = toolResult.result;

          if (result && typeof result === 'object') {
            if (toolResult.toolName === 'think') {
              const thought = (result as ThinkToolResult).thought;
              if (typeof thought === 'string' && thought.trim()) {
                currentReasoningGroup.push(thought.trim());
              }
            } else if (toolResult.toolName === 'webSearch') {
              const searchResult = result as {
                results: WebSearchResult[];
                query: string;
                count: number;
              };
              currentReasoningGroup.push({
                type: 'webSearch',
                data: searchResult as WebSearchData,
              });
            } else if (toolResult.toolName === 'readWebsiteContent') {
              const webContentResult = result as {
                url?: string;
                query?: string;
              };
              if (webContentResult.url) {
                currentReasoningGroup.push({
                  type: 'fetchedPageInfo',
                  data: {
                    url: webContentResult.url,
                    query: webContentResult.query,
                  },
                });
              }
            } else if (
              toolResult.toolName === 'executeSandboxCode' &&
              toolCallInfo
            ) {
              const executionResult = result as {
                stdout?: string;
                stderr?: string;
                exitCode?: number;
              };
              const args = toolCallInfo.args as unknown as SandboxToolArgs;
              currentReasoningGroup.push({
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
            }
          }
          filterIndices.add(index);
          if (toolCallInfo) filterIndices.add(toolCallInfo.index);
        } else {
          // Normal tool result
          flushReasoningGroup();
          merged.push({
            type: 'part',
            part: { ...part } as EnhancedMessagePart,
          });
        }
      } else {
        // Other parts (files, etc.)
        flushReasoningGroup();
        merged.push({ type: 'part', part: { ...part } as EnhancedMessagePart });
      }
    });

    // Final flush
    flushReasoningGroup();

    // Apply tool grouping to parts
    const partsOnly = merged
      .filter(
        (m): m is { type: 'part'; part: EnhancedMessagePart } =>
          m.type === 'part',
      )
      .map((m) => m.part);

    applyToolGrouping(partsOnly);

    return { orderedParts: merged };
  }, [message.parts, message.role]);
}

// ============================================================================
// Legacy Hooks (Backward Compatibility)
// ============================================================================

/**
 * Extract and consolidate reasoning elements from message parts (Legacy)
 */
export function useReasoningElements(
  message: Message,
): ReasoningElementsResult {
  return useMemo(() => {
    const elements: ReasoningContentItem[] = [];
    const filterIndices = new Set<number>();
    const thinkTagRegex = /<think>([\s\S]*?)<\/think>/i;

    if (!message.parts || message.parts.length === 0) {
      return { reasoningElements: elements, indicesToFilter: filterIndices };
    }

    const toolCallMap = new Map<
      string,
      {
        index: number;
        toolName: string;
        args: Record<string, unknown>;
        state?: string;
      }
    >();

    message.parts.forEach((part, index) => {
      if (part.type === 'reasoning') {
        const reasoningPart = part as ReasoningPart;
        if (reasoningPart.text?.trim()) {
          elements.push(reasoningPart.text.trim());
          filterIndices.add(index);
        }
      } else if (message.role === 'assistant' && part.type === 'text') {
        const textPart = part as TextPart;
        const thinkMatch = textPart.text.match(thinkTagRegex);
        if (thinkMatch?.[1]) elements.push(thinkMatch[1].trim());

        const thinkingLines = textPart.text
          .split('\n')
          .filter((line) => line.trim().startsWith('>'))
          .map((line) => line.trim().substring(1).trim());

        if (thinkingLines.length > 0)
          elements.push(thinkingLines.join('\n').trim());
      } else if (part.type === 'tool-call') {
        const toolCall = part as ToolCallPart & { state?: string };
        if (isReasoningTool(toolCall.toolName)) {
          toolCallMap.set(toolCall.toolCallId, {
            index,
            toolName: toolCall.toolName,
            args: toolCall.args as Record<string, unknown>,
            state: toolCall.state,
          });
        }
      } else if (isToolPart(part) && isToolResultAvailable(part)) {
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
          } else if (toolName === 'webSearch') {
            const searchResult = result as {
              results: WebSearchResult[];
              query: string;
              count: number;
            };
            elements.push({
              type: 'webSearch',
              data: searchResult as WebSearchData,
            });
            filterIndices.add(index);
            if (toolCallInfo) filterIndices.add(toolCallInfo.index);
          } else if (toolName === 'readWebsiteContent') {
            const webContentResult = result as { url?: string; query?: string };
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
          } else if (toolName === 'executeSandboxCode' && toolCallInfo) {
            const executionResult = result as {
              stdout?: string;
              stderr?: string;
              exitCode?: number;
            };
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
    });

    toolCallMap.forEach((info, _id) => {
      if (
        !filterIndices.has(info.index) &&
        info.toolName === 'executeSandboxCode'
      ) {
        const args = info.args as unknown as SandboxToolArgs;
        elements.push({
          type: 'codeExecution',
          data: {
            code: args.code,
            language: args.language,
            packages: args.packages,
            state:
              info.state === 'input-streaming'
                ? 'input-streaming'
                : 'input-available',
          },
        });
        filterIndices.add(info.index);
      }
    });

    return { reasoningElements: elements, indicesToFilter: filterIndices };
  }, [message.parts, message.role]);
}

/**
 * Process message parts: filter reasoning, clean text, apply grouping (Legacy)
 */
export function useProcessedParts(
  message: Message,
  indicesToFilter: Set<number>,
): EnhancedMessagePart[] {
  return useMemo(() => {
    const thinkTagRegexForReplace = /<think>[\s\S]*?<\/think>/i;

    const partsForMainFlow = (message.parts || [])
      .map((originalPart, originalIndex) => {
        if (indicesToFilter.has(originalIndex)) return null;
        if (message.role === 'assistant' && originalPart.type === 'text') {
          const textPart = originalPart as TextPart;
          let cleanedText = textPart.text.replace(thinkTagRegexForReplace, '');
          cleanedText = cleanedText
            .split('\n')
            .filter((line) => !line.trim().startsWith('>'))
            .join('\n')
            .trim();
          if (cleanedText.length === 0 && message.parts.length > 1) return null;
          return { ...originalPart, text: cleanedText } as MessagePart;
        }
        return { ...originalPart };
      })
      .filter((part): part is MessagePart => part !== null);

    const enhancedParts = partsForMainFlow.map((part) => {
      const enhancedPart = { ...part } as EnhancedMessagePart;
      enhancedPart.connectNext = false;
      enhancedPart.connectPrevious = false;
      enhancedPart.toolIndex = -1;
      return enhancedPart;
    });

    return applyToolGrouping(enhancedParts);
  }, [message.parts, message.role, indicesToFilter]);
}

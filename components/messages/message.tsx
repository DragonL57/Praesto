'use client';

import React, { memo, useEffect, useMemo, useState } from 'react';
import cx from 'classnames';
import equal from 'fast-deep-equal';
import { RefreshCwIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useCopyToClipboard } from 'usehooks-ts';

import { Button } from '../ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { Markdown } from '../markdown';
import { MessageActions } from './message-actions';
import { MessageEditor } from './message-editor';
import { MessageReasoning } from './message-reasoning';
import { PencilEditIcon, CopyIcon } from '../icons';
import { PreviewAttachment } from '../preview-attachment';
import { Weather } from '../weather';

import { cn } from '@/lib/utils';
import { deleteTrailingMessages } from '@/app/(chat)/actions';
import type { AppendFunction, SetMessagesFunction } from '@/lib/ai/types';
import type { Vote } from '@/lib/db/schema';
import type { UIMessage } from 'ai';

// Define types needed for reasoning elements, mirroring message-reasoning.tsx
interface WebSearchResult {
  title: string;
  href: string;
  body: string;
}
interface WebSearchData {
  results: WebSearchResult[];
  query: string;
  count: number;
}

// Define data structure for Fetched Page Info (for WebsiteContent component)
interface FetchedPageInfoData {
  url: string;
  query?: string | null; // query is optional in WebsiteContentProps
  // The 'content' from readWebsiteContent result is not stored here, as WebsiteContent doesn't display it
  // 'status' for WebsiteContent will be hardcoded to 'success' when rendering
}

type ReasoningContentItem =
  | string
  | { type: 'webSearch'; data: WebSearchData }
  | { type: 'fetchedPageInfo'; data: FetchedPageInfoData };

// Re-add interface for Reasoning details
interface ReasoningDetail {
  type: string;
  text?: string;
}

// Add type for think tool result
interface ThinkToolResult {
  thought?: string;
}

// Utility function to get a variety of blue gradient styles
const getGradientStyle = (message: UIMessage): string => {
  // Use a hash of the message ID to generate a consistent gradient for each message
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
    // Standard horizontal gradient (original)
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

// Create a type for our enhanced tool parts
type EnhancedMessagePart = UIMessage['parts'][0] & {
  connectNext?: boolean;
  connectPrevious?: boolean;
  toolIndex?: number;
};

// AI SDK 5.x tool parts have state/input/output directly on the part
// Helper to check if a part is a tool call part (type starts with 'tool-' or is 'dynamic-tool')
const isToolPart = (part: UIMessage['parts'][0]): boolean => {
  return part.type.startsWith('tool-') || part.type === 'dynamic-tool';
};

// Helper to extract tool name from a tool part
const extractToolName = (part: UIMessage['parts'][0]): string => {
  if (part.type === 'dynamic-tool' && 'toolName' in part) {
    return (part as { toolName: string }).toolName;
  }
  if (part.type.startsWith('tool-')) {
    return part.type.substring(5); // Remove 'tool-' prefix
  }
  return '';
};

// Helper to get tool call ID from a tool part
const getToolCallId = (part: UIMessage['parts'][0]): string => {
  if ('toolCallId' in part) {
    return (part as { toolCallId: string }).toolCallId;
  }
  return '';
};

// Helper to check if tool result is available
const isToolResultAvailable = (part: UIMessage['parts'][0]): boolean => {
  if ('state' in part) {
    return (part as { state: string }).state === 'output-available';
  }
  return false;
};

// Helper to get tool output
const getToolOutput = (
  part: UIMessage['parts'][0],
): Record<string, unknown> | undefined => {
  if ('output' in part) {
    return part.output as Record<string, unknown>;
  }
  return undefined;
};


// Helper function to preserve line breaks in user messages
const UserTextWithLineBreaks = ({ text }: { text: string }) => {
  // Split by newlines and map each line to a paragraph
  const lines = text.split('\n');

  return (
    <>
      {lines.map((line, i) => {
        // Create a unique key that doesn't rely solely on array index
        const lineKey = `${text.substring(0, 8)}-line-${i}-${line.substring(0, 8)}`;
        return (
          <span key={lineKey} className="block whitespace-pre-wrap">
            {line || ' '}{' '}
            {/* Replace empty lines with a space to maintain height */}
          </span>
        );
      })}
    </>
  );
};

export type PurePreviewMessageProps = {
  chatId: string;
  message: UIMessage;
  vote?: Vote;
  isLoading: boolean;
  setMessages: SetMessagesFunction;
  reload: () => Promise<string | null | undefined>;
  append: AppendFunction;
  isReadonly: boolean;
};

const PurePreviewMessage = memo<PurePreviewMessageProps>(
  ({
    chatId,
    message,
    vote,
    isLoading,
    setMessages,
    reload,
    append,
    isReadonly,
  }) => {
    const [mode, setMode] = useState<'view' | 'edit'>('view');
    const [, copyFn] = useCopyToClipboard();
    const [isRetrying, setIsRetrying] = useState(false);

    // Handle copy events to preserve formatting
    const handleCopy = (event: React.ClipboardEvent<HTMLDivElement>) => {
      const selection = window.getSelection();
      if (selection?.toString()) {
        // Get selected HTML content with formatting
        const range = selection.getRangeAt(0);
        const clonedSelection = range.cloneContents();
        const div = document.createElement('div');
        div.appendChild(clonedSelection);

        // Copy the HTML content (which contains the formatting)
        const formattedHTML = div.innerHTML;

        // Create a clean HTML version that preserves formatting
        const cleanHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * {
              background-color: transparent !important;
              background-image: none !important;
              background: none !important;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
              color: initial;
            }
            pre, code {
              font-family: SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
            }
            /* Preserve formatting */
            strong { font-weight: bold; }
            em { font-style: italic; }
            h1, h2, h3, h4, h5, h6 { font-weight: bold; }
            ul { list-style-type: disc; padding-left: 20px; }
            ol { list-style-type: decimal; padding-left: 20px; }
            code span {
              background: none !important;
              background-color: transparent !important;
            }
          </style>
        </head>
        <body>${formattedHTML}</body>
        </html>
      `;

        // Set both plain text and HTML versions
        event.clipboardData.clearData();
        event.clipboardData.setData('text/plain', selection.toString());
        event.clipboardData.setData('text/html', cleanHTML);

        // Prevent the default copy behavior
        event.preventDefault();
      }
    };

    // 1. Consolidate reasoning elements (text, web search results) for MessageReasoning
    const { reasoningElements, indicesToFilter } = useMemo(() => {
      const elements: ReasoningContentItem[] = [];
      const filterIndices = new Set<number>();
      const thinkTagRegex = /<think>[\s\S]*?<\/think>/i;

      if (message.parts && message.parts.length > 0) {
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
              content = (reasoningPart.details as Array<unknown>)
                .map((detail: unknown) => {
                  const d = detail as ReasoningDetail;
                  return d.type === 'text' && d.text ? d.text : '';
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
            }
          }
          // c) Check for tool results to include in reasoning
          // AI SDK 5.x: Tool parts have type 'tool-<name>' or 'dynamic-tool' with state/output directly on part
          else if (isToolPart(part) && isToolResultAvailable(part)) {
            const toolName = extractToolName(part);
            const result = getToolOutput(part);
            if (result && typeof result === 'object') {
              // i) Handle 'think' tool results (add as text)
              if (toolName === 'think') {
                const thought = (result as ThinkToolResult).thought;
                if (typeof thought === 'string' && thought.trim()) {
                  elements.push(thought.trim());
                  filterIndices.add(index);
                }
              }
              // ii) Handle 'webSearch' tool results (add as structured data)
              else if (toolName === 'webSearch') {
                const searchResult = result as {
                  results: WebSearchResult[];
                  query: string;
                  count: number;
                }; // Type assertion
                if (
                  searchResult.results &&
                  searchResult.query &&
                  typeof searchResult.count === 'number'
                ) {
                  elements.push({ type: 'webSearch', data: searchResult });
                  filterIndices.add(index);
                }
              }
              // iii) Handle 'readWebsiteContent' results (add as FetchedPageInfoData)
              else if (toolName === 'readWebsiteContent') {
                const webContentResult = result as {
                  content?: string;
                  url?: string;
                  query?: string;
                }; // content is part of the tool output but not used by WebsiteContent
                if (webContentResult.url) {
                  // Only need URL for WebsiteContent
                  elements.push({
                    type: 'fetchedPageInfo',
                    data: {
                      url: webContentResult.url,
                      query: webContentResult.query, // Pass query if available
                    },
                  });
                  filterIndices.add(index);
                }
              }
            } // End check if result is object
          } // End check for tool result
        });
      }
      return {
        reasoningElements: elements,
        indicesToFilter: filterIndices,
      };
    }, [message.parts, message.role]);

    // 2. Prepare parts for main display: Filter out handled elements, clean text, apply grouping
    const processedParts = useMemo(() => {
      const thinkTagRegexForReplace = /<think>[\s\S]*?<\/think>/i;
      // Step 2a: Filter and clean parts
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

      // Step 2b: Apply tool grouping logic (remains the same)
      const enhancedParts = partsForMainFlow.map((part, _i) => {
        const enhancedPart = { ...part } as EnhancedMessagePart;
        enhancedPart.connectNext = false;
        enhancedPart.connectPrevious = false;
        enhancedPart.toolIndex = -1;
        return enhancedPart;
      });

      // Grouping logic (First pass: Mark connections)
      // AI SDK 5.x: Use helper functions for tool part detection
      for (let i = 0; i < enhancedParts.length; i++) {
        const part = enhancedParts[i];
        if (isToolPart(part) && isToolResultAvailable(part)) {
          const currentToolName = extractToolName(part);
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
            if (
              isToolPart(potentialNextPart) &&
              isToolResultAvailable(potentialNextPart)
            ) {
              nextToolPart = potentialNextPart;
              break;
            }
          }
          if (
            !textEncounteredNext &&
            nextToolPart &&
            isToolPart(nextToolPart)
          ) {
            const nextToolName = extractToolName(nextToolPart);
            if (
              (currentToolName === 'webSearch' &&
                (nextToolName === 'readWebsiteContent' ||
                  nextToolName === 'webSearch')) ||
              (currentToolName === 'readWebsiteContent' &&
                nextToolName === 'readWebsiteContent')
            ) {
              part.connectNext = true;
            }
          }
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
            if (
              isToolPart(potentialPrevPart) &&
              isToolResultAvailable(potentialPrevPart)
            ) {
              prevToolPart = potentialPrevPart;
              break;
            }
          }
          if (
            !textEncounteredPrev &&
            prevToolPart &&
            isToolPart(prevToolPart)
          ) {
            const prevToolName = extractToolName(prevToolPart);
            if (
              (currentToolName === 'readWebsiteContent' &&
                (prevToolName === 'webSearch' ||
                  prevToolName === 'readWebsiteContent')) ||
              (currentToolName === 'webSearch' && prevToolName === 'webSearch')
            ) {
              part.connectPrevious = true;
            }
          }
        }
      }

      // Grouping logic (Second pass: Assign group indices)
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
    }, [message.parts, message.role, indicesToFilter]); // Add indicesToFilter dependency

    const handleCopyButtonClick = async () => {
      // For assistant messages, we need to get the HTML content for proper copying
      if (message.role === 'assistant') {
        try {
          // Find the message content element
          const messageElement = document.querySelector(
            `[data-message-id="${message.id}"]`,
          );
          if (!messageElement) {
            throw new Error('Message element not found');
          }

          // Get the HTML content
          const htmlContent = messageElement.innerHTML;

          // Create a clean version for copying
          const cleanHTML = `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                * {
                  background-color: transparent !important;
                  background-image: none !important;
                  background: none !important;
                }
                body {
                  margin: 0;
                  padding: 0;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                  color: initial;
                }
                pre, code {
                  font-family: SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
                }
                /* Preserve formatting */
                strong { font-weight: bold; }
                em { font-style: italic; }
                h1, h2, h3, h4, h5, h6 { font-weight: bold; }
                ul { list-style-type: disc; padding-left: 20px; }
                ol { list-style-type: decimal; padding-left: 20px; }
              </style>
            </head>
            <body>${htmlContent}</body>
            </html>
          `;

          // Create a temporary element to extract plain text
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlContent;
          const plainText = tempDiv.textContent || tempDiv.innerText || '';

          // Copy the content with formatting
          await copyFn(plainText);

          // Try to add HTML format to clipboard (for applications that support rich text)
          try {
            const clipboardItem = new ClipboardItem({
              'text/plain': new Blob([plainText], { type: 'text/plain' }),
              'text/html': new Blob([cleanHTML], { type: 'text/html' }),
            });
            await navigator.clipboard.write([clipboardItem]);
          } catch (clipboardError) {
            // Fallback already happened with copyFn above
            console.warn(
              'Enhanced clipboard write failed, using plain text fallback:',
              clipboardError,
            );
          }

          toast.success('Copied to clipboard!');
        } catch (error) {
          console.error('Failed to copy formatted text:', error);
          // Fallback to the original method
          fallbackCopy();
        }
      } else {
        // For user messages, use the original method
        fallbackCopy();
      }
    };

    // Fallback copy method for user messages or when the enhanced copy fails
    const fallbackCopy = async () => {
      // User messages typically have one text part.
      // Find the first text part to ensure we get the content.
      const userTextPart = message.parts?.find((part) => part.type === 'text');
      // Ensure the 'text' property exists and is a string.
      const textToCopy =
        userTextPart && typeof userTextPart.text === 'string'
          ? userTextPart.text
          : null;

      if (textToCopy?.trim()) {
        try {
          await copyFn(textToCopy.trim());
          toast.success('Copied to clipboard!');
        } catch (error) {
          toast.error('Failed to copy text.');
          console.error('Failed to copy text: ', error);
        }
      } else {
        toast.error("There's no text to copy!");
      }
    };

    const handleRetry = async () => {
      if (message.role === 'user' && reload && setMessages) {
        setIsRetrying(true);
        try {
          // 1. Delete trailing messages from DB (and associated votes)
          await deleteTrailingMessages({ id: message.id });

          // 2. Update client-side messages state
          setMessages((prevMessages) => {
            const messageIndex = prevMessages.findIndex(
              (m) => m.id === message.id,
            );
            if (messageIndex !== -1) {
              // Keep messages up to and including the current user message
              return prevMessages.slice(0, messageIndex + 1);
            }
            return prevMessages; // Should not happen if message.id is valid
          });

          // 3. Trigger a new generation from the AI
          await reload();
        } catch (error) {
          console.error('Failed to retry message:', error);
          toast.error('Failed to retry. Please try again.');
        } finally {
          setIsRetrying(false);
        }
      }
    };

    const isUserMessage = message.role === 'user';

    /* FIXME(@ai-sdk-upgrade-v5): The `experimental_attachments` property has been replaced with the parts array. Please manually migrate following https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0#attachments--file-parts */
    return (
      <div
        data-testid={`message-${message.role}`}
        className="w-full mx-auto max-w-3xl px-4 group/message transition-opacity duration-300 ease-in-out"
        data-role={message.role}
      >
        {/* 3. Render MessageReasoning with the consolidated elements */}
        {message.role === 'assistant' &&
          (isLoading ||
            (reasoningElements && reasoningElements.length > 0)) && (
            <MessageReasoning
              content={reasoningElements || []}
              isLoading={isLoading}
              hasResponseStarted={
                // Phase 2 has started if there's any visible text or tool results from the assistant
                processedParts.some((part) => {
                  // Check for text content
                  if (
                    part.type === 'text' &&
                    typeof part.text === 'string' &&
                    part.text.trim().length > 0
                  ) {
                    return true;
                  }
                  // AI SDK 5.x: Check for tool results that aren't reasoning tools
                  if (
                    isToolPart(part) &&
                    isToolResultAvailable(part) &&
                    !['think', 'webSearch', 'readWebsiteContent'].includes(
                      extractToolName(part),
                    )
                  ) {
                    return true;
                  }
                  return false;
                })
              }
            />
          )}
        <div
          className={cn(
            'flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl',
            {
              'w-full': mode === 'edit',
              'group-data-[role=user]/message:w-fit': mode !== 'edit',
            },
          )}
        >
          <div className="flex flex-col gap-1 w-full">
            {/* AI SDK 5.x: Attachments are now file parts in message.parts */}
            {(() => {
              const fileParts = message.parts.filter(
                (part) => part.type === 'file',
              ) as Array<{ type: 'file'; url: string; mediaType: string }>;
              if (fileParts.length === 0) return null;
              return (
                <div
                  data-testid={`message-attachments`}
                  className="flex flex-row justify-end gap-2"
                >
                  {fileParts.map((filePart) => (
                    <PreviewAttachment
                      key={filePart.url}
                      attachment={{
                        url: filePart.url,
                        contentType: filePart.mediaType,
                        name: filePart.url.split('/').pop() || 'file',
                      }}
                    />
                  ))}
                </div>
              );
            })()}

            {(() => {
              const toolGroups: { [key: number]: EnhancedMessagePart[] } = {};
              processedParts.forEach((part) => {
                // AI SDK 5.x: Tool parts have state directly on the part
                if (
                  isToolPart(part) &&
                  isToolResultAvailable(part) &&
                  part.toolIndex !== undefined &&
                  part.toolIndex >= 0
                ) {
                  if (!toolGroups[part.toolIndex])
                    toolGroups[part.toolIndex] = [];
                  toolGroups[part.toolIndex].push(part);
                }
              });

              return processedParts.map((part, index) => {
                const { type } = part;
                const key = `message-${message.id}-part-${index}`;

                // A: Render non-tool-result parts
                if (!isToolPart(part) || !isToolResultAvailable(part)) {
                  if (type === 'text') {
                    if (part.text?.trim().length === 0) return null;
                    if (mode === 'view') {
                      return (
                        <div
                          key={key}
                          className="flex flex-row gap-2 items-start"
                        >
                          <div
                            data-testid="message-content"
                            data-message-id={message.id}
                            onCopy={handleCopy}
                            className={cn('flex flex-col gap-0 flex-1 w-full', {
                              [`${getGradientStyle(message)} dark:text-zinc-100 text-zinc-900 px-4 py-3 rounded-2xl transition-all duration-300`]:
                                message.role === 'user',
                              'text-foreground': message.role === 'assistant',
                            })}
                          >
                            {message.role === 'user' ? (
                              <div className="whitespace-pre-wrap break-words text-sm">
                                {part.text && (
                                  <UserTextWithLineBreaks text={part.text} />
                                )}
                              </div>
                            ) : (
                              part.text && (
                                <Markdown baseHeadingLevel={2} append={append}>
                                  {part.text}
                                </Markdown>
                              )
                            )}
                          </div>
                        </div>
                      );
                    }
                    if (mode === 'edit') {
                      return (
                        <div
                          key={key}
                          className="flex flex-row gap-2 items-start"
                        >
                          <div className="size-8" />
                          <MessageEditor
                            key={message.id}
                            message={message}
                            setMode={setMode}
                            setMessages={setMessages}
                            reload={reload}
                          />
                        </div>
                      );
                    }
                  }
                  if (
                    isToolPart(part) &&
                    'state' in part &&
                    (part as { state: string }).state === 'input-available'
                  ) {
                    // AI SDK 5.x: Tool call state is 'input-available' (previously 'call')
                    const toolName = extractToolName(part);
                    const toolCallId = getToolCallId(part);

                    // Only render tool calls NOT handled by reasoning (think, webSearch, readWebsiteContent)
                    if (
                      ['think', 'webSearch', 'readWebsiteContent'].includes(
                        toolName,
                      )
                    )
                      return null;

                    // Render other tool calls (Weather, Document, etc.)
                    return (
                      <div
                        key={toolCallId}
                        className={cx({
                          skeleton: ['getWeather'].includes(toolName),
                        })}
                      >
                        {toolName === 'getWeather' ? (
                          <Weather />
                        ) : null}{' '}
                        {/* Other non-reasoning tool calls rendered here */}
                      </div>
                    );
                  }
                  return null;
                }

                // B: Render tool results (grouped or standalone)
                // Skip if part of a group but not the first item OR if handled by reasoning
                if (
                  part.toolIndex !== undefined &&
                  part.toolIndex >= 0 &&
                  toolGroups[part.toolIndex]?.[0] !== part
                ) {
                  return null;
                }
                if (!isToolPart(part)) return null;

                // AI SDK 5.x: Get tool name from type or toolName property
                const toolNameForResult = extractToolName(part);
                // Skip rendering tools handled by MessageReasoning
                if (
                  ['think', 'webSearch', 'readWebsiteContent'].includes(
                    toolNameForResult,
                  )
                ) {
                  return null;
                }

                // Check if it's a group (for tools NOT handled by reasoning)
                const isGroup =
                  part.toolIndex !== undefined &&
                  part.toolIndex >= 0 &&
                  toolGroups[part.toolIndex]?.length > 1;

                if (isGroup) {
                  const toolIdx = part.toolIndex;
                  if (toolIdx === undefined || !toolGroups[toolIdx])
                    return null;
                  const currentToolGroup = toolGroups[toolIdx];
                  return (
                    <div
                      key={`tool-group-${part.toolIndex}`}
                      className="border-[1.5px] border-border rounded-xl mb-0 overflow-hidden"
                    >
                      {currentToolGroup.map(
                        (groupPart: EnhancedMessagePart) => {
                          if (!isToolPart(groupPart)) return null;
                          const groupToolName = extractToolName(groupPart);
                          const groupToolCallId = getToolCallId(groupPart);
                          const _res = getToolOutput(groupPart) || {};
                          if (
                            [
                              'think',
                              'webSearch',
                              'readWebsiteContent',
                            ].includes(groupToolName)
                          )
                            return null;
                          return (
                            <div key={groupToolCallId} className="border-0">
                              {/* Render grouped non-reasoning tools like Weather, Docs etc. if they can be grouped */}
                              {/* Example: if (groupToolName === 'getWeather') return <Weather ...inGroup={true}/>; */}
                              {/* Placeholder for now */}
                              <pre>Grouped: {groupToolName} Result</pre>
                            </div>
                          );
                        },
                      )}
                    </div>
                  );
                } else {
                  // Render Standalone Tool Result (for tools NOT handled by reasoning)
                  // AI SDK 5.x: Properties are directly on the part
                  const toolName = extractToolName(part);
                  const toolCallId = getToolCallId(part);
                  const result = getToolOutput(part) || {};

                  // Final check: Ensure it's not a reasoning-handled tool
                  if (
                    ['think', 'webSearch', 'readWebsiteContent'].includes(
                      toolName,
                    )
                  )
                    return null;

                  // Render standalone results for Weather, Docs, YouTube, etc.
                  return (
                    <div
                      key={toolCallId}
                      className="border-[1.5px] border-border rounded-xl mb-0 relative"
                    >
                      {toolName === 'getWeather' ? (
                        <Weather
                          weatherAtLocation={
                            result as unknown as Parameters<
                              typeof Weather
                            >[0]['weatherAtLocation']
                          }
                        />
                      ) : (
                        <pre>{JSON.stringify(result, null, 2)}</pre>
                      )}
                    </div>
                  );
                }
              });
            })()}

            {!isReadonly && message.role === 'assistant' && (
              <div className="flex justify-start mt-1">
                <MessageActions
                  key={`action-${message.id}`}
                  chatId={chatId}
                  message={message}
                  vote={vote}
                  isLoading={isLoading}
                />
              </div>
            )}

            {/* Silence line indicator for memory updates - shown for both user and assistant messages */}
            {message.parts && Array.isArray(message.parts) && message.parts.some((part: any) =>
              part.type === 'data' &&
              part.data?.type === 'memory-update'
            ) && (
              <div className="flex justify-center mt-2 mb-1">
                <div className="text-xs text-muted-foreground/60 italic">
                  Memory updated
                </div>
              </div>
            )}
          </div>
        </div>
        {/* NEW EDIT BUTTON LOCATION FOR USER MESSAGES */}
        {isUserMessage && mode !== 'edit' && !isReadonly && (
          <div className="flex justify-end items-center gap-1 mt-1 opacity-0 group-hover/message:opacity-100 transition-opacity duration-200">
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-muted-foreground opacity-0 group-hover/message:opacity-100 transition-opacity duration-200"
                    onClick={handleRetry}
                    disabled={isRetrying}
                  >
                    {isRetrying ? (
                      <div className="flex items-center justify-center size-4">
                        <svg
                          className="animate-spin size-4 text-blue-500"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      </div>
                    ) : (
                      <RefreshCwIcon className="size-4" />
                    )}
                    <span className="sr-only">Retry generation</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center">
                  Retry generation
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider delayDuration={0}>
              {/* COPY BUTTON */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    data-testid="message-copy-button"
                    variant="ghost"
                    className="px-2 h-fit rounded-full text-muted-foreground opacity-0 group-hover/message:opacity-100 mr-1"
                    onClick={handleCopyButtonClick}
                  >
                    <CopyIcon />
                    <span className="sr-only">Copy message</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy message</TooltipContent>
              </Tooltip>

              {/* EDIT BUTTON */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    data-testid="message-edit-button"
                    variant="ghost"
                    className="px-2 h-fit rounded-full text-muted-foreground opacity-0 group-hover/message:opacity-100"
                    onClick={() => {
                      setMode('edit');
                    }}
                  >
                    <PencilEditIcon />
                    <span className="sr-only">Edit message</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit message</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    );
  },
);

PurePreviewMessage.displayName = 'PurePreviewMessage';

export interface PreviewMessageProps
  extends Omit<PurePreviewMessageProps, 'isReadonly'> {
  isReadonly: boolean;
}

// Re-memoize PurePreviewMessage with the new append prop
const MemoizedPurePreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    return (
      prevProps.chatId === nextProps.chatId &&
      equal(prevProps.message, nextProps.message) && // Use deep equal for message object
      equal(prevProps.vote, nextProps.vote) && // Deep equal for vote
      prevProps.isLoading === nextProps.isLoading &&
      prevProps.setMessages === nextProps.setMessages &&
      prevProps.reload === nextProps.reload &&
      prevProps.append === nextProps.append &&
      prevProps.isReadonly === nextProps.isReadonly
    );
  },
);

// Use the memoized version in PreviewMessage
export const PreviewMessage: React.FC<PreviewMessageProps> = (props) => {
  return <MemoizedPurePreviewMessage {...props} />;
};

PreviewMessage.displayName = 'PreviewMessage';

export const ThinkingMessage = () => {
  const [currentDisplay] = useState({
    text: 'Thinking, wait a bit...',
    iconType: 'spinner' as 'spinner' | 'tick' | 'chevron',
  });
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Example of how you might change display state over time
    // const timer1 = setTimeout(() => setCurrentDisplay({ text: 'Analyzing...', iconType: 'spinner' }), 2000);
    // const timer2 = setTimeout(() => setCurrentDisplay({ text: 'Almost there...', iconType: 'tick' }), 5000);
    // return () => { clearTimeout(timer1); clearTimeout(timer2); };

    // Cleanup for exiting animation
    return () => {
      setIsExiting(true);
    };
  }, []);

  return (
    <div
      className={`w-full mx-auto max-w-3xl px-4 thinking-message-wrapper ${isExiting ? 'exiting' : ''}`}
    >
      <div
        className={`flex flex-row gap-2 items-center w-full cursor-pointer py-1.5 pr-1.5 pl-[6px] rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all duration-200 ${currentDisplay.iconType === 'spinner' ? 'my-1' : 'my-0.5'} group stable-height-container`}
      >
        {currentDisplay.iconType === 'spinner' ? (
          <div className="flex items-center justify-center size-4">
            <svg
              className="animate-spin size-4 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : currentDisplay.iconType === 'tick' ? (
          <div className="flex items-center justify-center size-4 text-green-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2.5"
              stroke="currentColor"
              className="size-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        ) : (
          <div className="size-4 flex items-center justify-center text-zinc-400 dark:text-zinc-500 transition-transform duration-200 rotate-180 group-hover:text-blue-500 dark:group-hover:text-blue-400">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="size-4"
            >
              <path
                d="M8.71005 11.71L11.3001 14.3C11.6901 14.69 12.3201 14.69 12.7101 14.3L15.3001 11.71C15.9301 11.08 15.4801 10 14.5901 10H9.41005C8.52005 10 8.08005 11.08 8.71005 11.71Z"
                fill="currentColor"
              />
            </svg>
          </div>
        )}
        <div
          className={`font-medium text-sm ${currentDisplay.iconType === 'spinner' ? 'text-blue-600 dark:text-blue-400' : currentDisplay.iconType === 'tick' ? 'text-green-600 dark:text-green-400' : 'text-zinc-600 dark:text-zinc-400'} group-hover:text-zinc-800 dark:group-hover:text-zinc-300 transition-colors duration-200 grow text-left min-w-0`}
        >
          {currentDisplay.text}
        </div>
      </div>
    </div>
  );
};

// Skeleton loader for message
export function MessageSkeleton() {
  return (
    <div className="w-full mx-auto max-w-3xl px-4 my-2">
      <div className="flex flex-row gap-2 items-center w-full py-3 px-4 rounded-xl bg-muted animate-pulse">
        <div className="flex-1">
          <div className="h-4 bg-gray-300 dark:bg-zinc-700 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-200 dark:bg-zinc-800 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

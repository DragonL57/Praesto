'use client';

import React, { memo, useState, useMemo, useEffect } from 'react';
import type { UIMessage } from 'ai';
import cx from 'classnames';
import type { Vote } from '@/lib/db/schema';
import { DocumentToolCall, DocumentToolResult } from '../document';
import { PencilEditIcon, CopyIcon } from '../icons';
import { RefreshCwIcon } from 'lucide-react';
import { Markdown } from '../markdown';
import { MessageActions } from './message-actions';
import { PreviewAttachment } from '../preview-attachment';
import { Weather } from '../weather';
import { YouTubeTranscript } from '../youtube-transcript';
import equal from 'fast-deep-equal';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger , TooltipProvider } from '../ui/tooltip';
import { MessageEditor } from './message-editor';
import { DocumentPreview } from '../document-preview';
import type { UseChatHelpers } from '@ai-sdk/react';
import { MessageReasoning } from './message-reasoning';
import { useCopyToClipboard } from 'usehooks-ts';
import { toast } from 'sonner';
import { deleteTrailingMessages } from '@/app/(chat)/actions';

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

// Helper function to extract video ID from YouTube URL or ID
function extractVideoId(urlOrId: string): string {
  // Handle direct video IDs
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) {
    return urlOrId;
  }

  const youtubeRegex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = urlOrId.match(youtubeRegex);
  return match ? match[1] : urlOrId;
}

// Utility function to get a variety of blue gradient styles
const getGradientStyle = (message: UIMessage): string => {
  // Use a hash of the message ID to generate a consistent gradient for each message
  const hashCode = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
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
  // Properly type toolInvocation to avoid TypeScript errors
  toolInvocation?: {
    toolName: string;
    toolCallId: string;
    state: string;
    args?: Record<string, unknown>;
    result?: Record<string, unknown>;
  };
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

export interface PurePreviewMessageProps {
  chatId: string;
  message: UIMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  append: UseChatHelpers['append'];
  isReadonly: boolean;
}

const PurePreviewMessage = memo<PurePreviewMessageProps>(
  ({ chatId, message, vote, isLoading, setMessages, reload, append, isReadonly }) => {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
    const [, copyFn] = useCopyToClipboard();
    const [isRetrying, setIsRetrying] = useState(false);

  // 1. Consolidate reasoning elements (text, web search results) for MessageReasoning
  const { reasoningElements, indicesToFilter } = useMemo(() => {
    const elements: ReasoningContentItem[] = [];
    const filterIndices = new Set<number>();
    const thinkTagRegex = new RegExp('<think>([\\s\\S]*?)<\\/think>', 'i');

    if (message.parts && message.parts.length > 0) {
      message.parts.forEach((part, index) => {
        // a) Check for dedicated reasoning parts
        if (part.type === 'reasoning') {
        const potentialReasoningPart = part as { reasoning?: unknown, details?: unknown };
          let content = '';
        if (typeof potentialReasoningPart.reasoning === 'string') {
            content = potentialReasoningPart.reasoning;
          } else if (Array.isArray(potentialReasoningPart.details)) {
            content = (potentialReasoningPart.details as Array<unknown>)
              .map((detail: unknown) => {
                const d = detail as ReasoningDetail;
                return d.type === 'text' && d.text ? d.text : '';
              }).join('');
          }
          if (content.trim()) {
            elements.push(content.trim());
            filterIndices.add(index);
          }
        }
        // b) Check for embedded <think> tags in text parts (assistant only)
        else if (message.role === 'assistant' && part.type === 'text' && typeof part.text === 'string') {
          const thinkMatch = part.text.match(thinkTagRegex);
          if (thinkMatch && thinkMatch[1]) {
            elements.push(thinkMatch[1].trim());
            // Text part itself isn't filtered, just cleaned later
          }
        }
        // c) Check for tool results to include in reasoning
        else if (part.type === 'tool-invocation' && part.toolInvocation?.state === 'result') {
          const { toolName, result } = part.toolInvocation;
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
              const searchResult = result as { results: WebSearchResult[]; query: string; count: number; }; // Type assertion
              if (searchResult.results && searchResult.query && typeof searchResult.count === 'number') {
                elements.push({ type: 'webSearch', data: searchResult });
                filterIndices.add(index);
              }
            }
            // iii) Handle 'readWebsiteContent' results (add as FetchedPageInfoData)
            else if (toolName === 'readWebsiteContent') {
              const webContentResult = result as { content?: string; url?: string, query?: string }; // content is part of the tool output but not used by WebsiteContent
              if (webContentResult.url) { // Only need URL for WebsiteContent
                elements.push({
                  type: 'fetchedPageInfo',
                  data: {
                    url: webContentResult.url,
                    query: webContentResult.query, // Pass query if available
                  }
                });
                filterIndices.add(index);
              }
            }
          } // End check if result is object
        } // End check for tool-invocation result
      });
    }
    return {
      reasoningElements: elements,
      indicesToFilter: filterIndices
    };
  }, [message.parts, message.role]);

  // 2. Prepare parts for main display: Filter out handled elements, clean text, apply grouping
  const processedParts = useMemo(() => {
    const thinkTagRegexForReplace = new RegExp('<think>[\\s\\S]*?<\\/think>', 'i');
    // Step 2a: Filter and clean parts
    const partsForMainFlow = message.parts
      ?.map((originalPart, originalIndex) => {
        if (indicesToFilter.has(originalIndex)) {
          return null;
        }
        if (message.role === 'assistant' && originalPart.type === 'text' && typeof originalPart.text === 'string') {
          const cleanedText = originalPart.text.replace(thinkTagRegexForReplace, '').trim();
          if (cleanedText.length === 0 && message.parts.length > 1) {
            return null;
          }
          return { ...originalPart, text: cleanedText };
        }
        return { ...originalPart };
      })
      .filter(part => part !== null) as Array<UIMessage['parts'][0]>;
    
    // Step 2b: Apply tool grouping logic (remains the same)
    const enhancedParts = partsForMainFlow.map((part, _i) => {
      const enhancedPart = { ...part } as EnhancedMessagePart;
      enhancedPart.connectNext = false;
      enhancedPart.connectPrevious = false;
      enhancedPart.toolIndex = -1;
      return enhancedPart;
    });

    // Grouping logic (First pass: Mark connections - unchanged)
    for (let i = 0; i < enhancedParts.length; i++) {
      const part = enhancedParts[i];
      if (part.type === 'tool-invocation' && part.toolInvocation?.state === 'result') { // Add safe navigation
        const currentToolName = part.toolInvocation.toolName;
        let nextToolPart: EnhancedMessagePart | null = null;
        let textEncounteredNext = false;
        for (let j = i + 1; j < enhancedParts.length; j++) {
          const potentialNextPart = enhancedParts[j];
          if (potentialNextPart.type === 'text' && potentialNextPart.text?.trim().length > 0) { 
            textEncounteredNext = true; break;
          }
          if (potentialNextPart.type === 'tool-invocation' && potentialNextPart.toolInvocation && potentialNextPart.toolInvocation.state === 'result') {
            nextToolPart = potentialNextPart; break;
          }
        }
        if (!textEncounteredNext && nextToolPart && nextToolPart.type === 'tool-invocation' && nextToolPart.toolInvocation) { 
          const nextToolName = nextToolPart.toolInvocation.toolName;
          if ((currentToolName === 'webSearch' && (nextToolName === 'readWebsiteContent' || nextToolName === 'webSearch')) ||
              (currentToolName === 'readWebsiteContent' && nextToolName === 'readWebsiteContent')) {
            part.connectNext = true;
          }
        }
        let prevToolPart: EnhancedMessagePart | null = null;
        let textEncounteredPrev = false;
        for (let j = i - 1; j >= 0; j--) {
          const potentialPrevPart = enhancedParts[j];
          if (potentialPrevPart.type === 'text' && potentialPrevPart.text?.trim().length > 0) { 
            textEncounteredPrev = true; break;
          }
          if (potentialPrevPart.type === 'tool-invocation' && potentialPrevPart.toolInvocation && potentialPrevPart.toolInvocation.state === 'result') {
            prevToolPart = potentialPrevPart; break;
          }
        }
        if (!textEncounteredPrev && prevToolPart && prevToolPart.type === 'tool-invocation' && prevToolPart.toolInvocation) { 
          const prevToolName = prevToolPart.toolInvocation.toolName;
          if ((currentToolName === 'readWebsiteContent' && (prevToolName === 'webSearch' || prevToolName === 'readWebsiteContent')) ||
              (currentToolName === 'webSearch' && prevToolName === 'webSearch')) {
            part.connectPrevious = true;
          }
        }
      }
    }
    
    // Grouping logic (Second pass: Assign group indices - unchanged)
    let currentGroupIndex = 0;
    for (let i = 0; i < enhancedParts.length; i++) {
      const part = enhancedParts[i];
       if (part.type === 'tool-invocation' && part.toolInvocation && part.toolInvocation.state === 'result') {
        if (part.toolIndex === -1) {
          part.toolIndex = currentGroupIndex;
          if (part.connectNext) {
            let j = i + 1;
            while (j < enhancedParts.length) {
              const nextPart = enhancedParts[j];
               if (nextPart.type !== 'tool-invocation' || !nextPart.toolInvocation || nextPart.toolInvocation.state !== 'result') { j++; continue; }
              if (nextPart.connectPrevious) {
                nextPart.toolIndex = currentGroupIndex;
                 if (!nextPart.connectNext) break;
               } else { break; }
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

    const handleCopy = async () => {
      // User messages typically have one text part.
      // Find the first text part to ensure we get the content.
      const userTextPart = message.parts?.find(part => part.type === 'text');
      // Ensure the 'text' property exists and is a string.
      const textToCopy = (userTextPart && typeof userTextPart.text === 'string') ? userTextPart.text : null;

      if (textToCopy && textToCopy.trim()) {
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
          setMessages(prevMessages => {
            const messageIndex = prevMessages.findIndex(m => m.id === message.id);
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

  return (
    <div
      data-testid={`message-${message.role}`}
      className="w-full mx-auto max-w-3xl px-4 group/message transition-opacity duration-300 ease-in-out"
      data-role={message.role}
    >
      {/* 3. Render MessageReasoning with the consolidated elements */}
      {message.role === 'assistant' && (isLoading || (reasoningElements && reasoningElements.length > 0)) && (
        <MessageReasoning 
          content={reasoningElements || []} 
          isLoading={isLoading} 
          hasResponseStarted={
            // Phase 2 has started if there's any visible text or tool results from the assistant
            processedParts.some(part => {
              // Check for text content
              if (part.type === 'text' && 
                  typeof part.text === 'string' && 
                  part.text.trim().length > 0) {
                return true;
              }
              // Check for tool results that aren't reasoning tools
              if (part.type === 'tool-invocation' && 
                  part.toolInvocation?.state === 'result' && 
                  part.toolInvocation.toolName && 
                  !['think', 'webSearch', 'readWebsiteContent'].includes(part.toolInvocation.toolName)) {
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
          {message.experimental_attachments && (
            <div
              data-testid={`message-attachments`}
              className="flex flex-row justify-end gap-2"
            >
              {message.experimental_attachments.map((attachment) => (
                <PreviewAttachment
                  key={attachment.url}
                  attachment={attachment}
                />
              ))}
            </div>
          )}

          {(() => {
            const toolGroups: { [key: number]: EnhancedMessagePart[] } = {};
            processedParts.forEach((part) => {
              if (part.type === 'tool-invocation' && 
                  part.toolInvocation && 
                  part.toolInvocation.state === 'result' && 
                  part.toolIndex !== undefined && 
                  part.toolIndex >= 0) {
                if (!toolGroups[part.toolIndex]) toolGroups[part.toolIndex] = [];
                toolGroups[part.toolIndex].push(part);
              }
            });

            return processedParts.map((part, index) => {
              const { type } = part;
              const key = `message-${message.id}-part-${index}`;

              // A: Render non-tool-result parts
              if (type !== 'tool-invocation' || part.toolInvocation?.state !== 'result') {
                if (type === 'text') {
                  if (part.text?.trim().length === 0) return null; 
                  if (mode === 'view') {
                    return (
                      <div key={key} className="flex flex-row gap-2 items-start">
                        <div
                          data-testid="message-content"
                          className={cn('flex flex-col gap-0 flex-1 w-full', {
                            [`${getGradientStyle(message)} dark:text-zinc-100 text-zinc-900 px-4 py-3 rounded-2xl transition-all duration-300`]:
                              message.role === 'user',
                            'text-foreground': message.role === 'assistant'
                          })}
                        >
                          {message.role === 'user' ? (
                            <div className="whitespace-pre-wrap break-words">
                              <UserTextWithLineBreaks text={part.text!} />
                            </div>
                          ) : (
                            <Markdown baseHeadingLevel={2} append={append}>{part.text!}</Markdown>
                          )}
                        </div>
                      </div>
                    );
                  }
                  if (mode === 'edit') {
                    return (
                      <div key={key} className="flex flex-row gap-2 items-start">
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
                if (type === 'tool-invocation' && part.toolInvocation?.state === 'call') {
                  const { toolInvocation } = part;
                   if (!toolInvocation) return null; 
                   const { toolName, toolCallId, args } = toolInvocation;
                   // Only render tool calls NOT handled by reasoning (think, webSearch, readWebsiteContent)
                   if (['think', 'webSearch', 'readWebsiteContent'].includes(toolName)) return null;
                   
                   // Render other tool calls (Weather, Document, etc.)
                  return (
                     <div key={toolCallId} className={cx({ skeleton: ['getWeather'].includes(toolName) })} >
                       {toolName === 'getWeather' ? ( <Weather />
                       ) : toolName === 'createDocument' ? ( <DocumentPreview isReadonly={isReadonly} args={args} />
                       ) : toolName === 'updateDocument' ? ( <DocumentToolCall type="update" args={args} isReadonly={isReadonly} />
                       ) : toolName === 'requestSuggestions' ? ( <DocumentToolCall type="request-suggestions" args={args} isReadonly={isReadonly} />
                       ) : null} { /* Other non-reasoning tool calls rendered here */ }
                    </div>
                  );
                }
                return null;
              }

              // B: Render tool results (grouped or standalone)
              // Skip if part of a group but not the first item OR if handled by reasoning
              if (part.toolIndex !== undefined && part.toolIndex >= 0 && toolGroups[part.toolIndex]?.[0] !== part) {
                return null;
              }
              if (!part.toolInvocation) return null; 
                
              // Skip rendering tools handled by MessageReasoning
              const toolNameForResult = part.toolInvocation.toolName;
              if (['think', 'webSearch', 'readWebsiteContent'].includes(toolNameForResult)) {
                          return null;
                        }
                        
              // Check if it's a group (for tools NOT handled by reasoning)
              const isGroup = part.toolIndex !== undefined && part.toolIndex >= 0 && toolGroups[part.toolIndex]?.length > 1;
              
              if (isGroup) {
                 const currentToolGroup = toolGroups[part.toolIndex!]; 
                 if (!currentToolGroup) return null; 
                 return (
                   <div key={`tool-group-${part.toolIndex}`} className="border-[1.5px] border-border rounded-xl mb-0 overflow-hidden"> 
                     {currentToolGroup.map((groupPart: EnhancedMessagePart) => { 
                       if (groupPart.type !== 'tool-invocation' || !groupPart.toolInvocation) return null; 
                       const inv = groupPart.toolInvocation;
                       const _res = inv.result || {}; 
                       if (['think', 'webSearch', 'readWebsiteContent'].includes(inv.toolName)) return null;
                        return (
                         <div key={inv.toolCallId} className="border-0"> 
                           { /* Render grouped non-reasoning tools like Weather, Docs etc. if they can be grouped */ }
                           {/* Example: if (inv.toolName === 'getWeather') return <Weather ...inGroup={true}/>; */}
                           {/* Placeholder for now */}
                           <pre>Grouped: {inv.toolName} Result</pre> 
                          </div>
                        );
                      })}
                    </div>
                  );
              } else {
                // Render Standalone Tool Result (for tools NOT handled by reasoning)
                const { toolInvocation } = part;
                const { toolName, toolCallId } = toolInvocation;
                const result = toolInvocation.result || {};
                
                // Final check: Ensure it's not a reasoning-handled tool
                if (['think', 'webSearch', 'readWebsiteContent'].includes(toolName)) return null;
                
                // Render standalone results for Weather, Docs, YouTube, etc.
                return (
                  <div key={toolCallId} className={cx({ 'border-[1.5px] border-border rounded-xl mb-0': !['getYoutubeTranscript', 'updateDocument', 'createDocument', 'requestSuggestions'].includes(toolName) }, 'relative')} >
                    {toolName === 'getWeather' ? ( <Weather weatherAtLocation={result} />
                    ) : toolName === 'createDocument' ? ( <DocumentPreview isReadonly={isReadonly} result={result} />
                    ) : toolName === 'updateDocument' ? ( <DocumentToolResult type="update" result={result} isReadonly={isReadonly} />
                    ) : toolName === 'requestSuggestions' ? ( <DocumentToolResult type="request-suggestions" result={result} isReadonly={isReadonly} />
                    ) : toolName === 'getYoutubeTranscript' ? ( <YouTubeTranscript transcript={result} videoId={extractVideoId(String(toolInvocation.args?.urlOrId))} title={String(toolInvocation.args?.urlOrId)} hasTimestamps={!toolInvocation.args?.combineAll} urlOrId={String(toolInvocation.args?.urlOrId)} languages={toolInvocation.args?.languages as string[] | undefined} />
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
                        <svg className="animate-spin size-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
                    onClick={handleCopy}
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
  }
  );

PurePreviewMessage.displayName = 'PurePreviewMessage';

export interface PreviewMessageProps extends Omit<PurePreviewMessageProps, 'isReadonly'> {
  isReadonly: boolean;
}

// Re-memoize PurePreviewMessage with the new append prop
const MemoizedPurePreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    return (
      prevProps.chatId === nextProps.chatId &&
      equal(prevProps.message, nextProps.message) && // Use deep equal for message object
      equal(prevProps.vote, nextProps.vote) &&         // Deep equal for vote
      prevProps.isLoading === nextProps.isLoading &&
      prevProps.setMessages === nextProps.setMessages &&
      prevProps.reload === nextProps.reload &&
      prevProps.append === nextProps.append &&
      prevProps.isReadonly === nextProps.isReadonly
    );
  }
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
    <div className={`w-full mx-auto max-w-3xl px-4 thinking-message-wrapper ${isExiting ? 'exiting' : ''}`}>
      <div 
        className={`flex flex-row gap-2 items-center w-full cursor-pointer py-1.5 pr-1.5 pl-[6px] rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all duration-200 ${currentDisplay.iconType === 'spinner' ? 'my-1' : 'my-0.5'} group stable-height-container`}
      >
        {currentDisplay.iconType === 'spinner' ? (
          <div className="flex items-center justify-center size-4">
            <svg className="animate-spin size-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : currentDisplay.iconType === 'tick' ? (
          <div className="flex items-center justify-center size-4 text-green-500">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="size-4 flex items-center justify-center text-zinc-400 dark:text-zinc-500 transition-transform duration-200 rotate-180 group-hover:text-blue-500 dark:group-hover:text-blue-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-4">
              <path d="M8.71005 11.71L11.3001 14.3C11.6901 14.69 12.3201 14.69 12.7101 14.3L15.3001 11.71C15.9301 11.08 15.4801 10 14.5901 10H9.41005C8.52005 10 8.08005 11.08 8.71005 11.71Z" fill="currentColor"/>
            </svg>
          </div>
        )}
        <div className={`font-medium text-sm ${currentDisplay.iconType === 'spinner' ? 'text-blue-600 dark:text-blue-400' : currentDisplay.iconType === 'tick' ? 'text-green-600 dark:text-green-400' : 'text-zinc-600 dark:text-zinc-400'} group-hover:text-zinc-800 dark:group-hover:text-zinc-300 transition-colors duration-200 grow text-left min-w-0`}>
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
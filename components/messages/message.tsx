'use client';

import React, { memo, useState, useMemo } from 'react';
import type { UIMessage } from 'ai';
import cx from 'classnames';
// Removing framer-motion animations
// import { AnimatePresence, motion } from 'framer-motion';
import type { Vote } from '@/lib/db/schema';
import { DocumentToolCall, DocumentToolResult } from '../document';
import { PencilEditIcon, WebpageLoadingIcon } from '../icons';
import { Markdown } from '../markdown';
import { MessageActions } from './message-actions';
import { PreviewAttachment } from '../preview-attachment';
import { Weather } from '../weather';
import { WebSearch } from '../web-search';
import { WebsiteContent } from '../website-content';
import { YouTubeTranscript } from '../youtube-transcript';
import { Think } from '../think';
import equal from 'fast-deep-equal';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { MessageEditor } from './message-editor';
import { DocumentPreview } from '../document-preview';
import type { UseChatHelpers } from '@ai-sdk/react';
import ShinyText from '../shiny-text';

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

function ThinkIcon({
  size = 16,
  className,
}: { size?: number; className?: string }) {
  return (
    <svg
      height={size}
      width={size}
      viewBox="0 0 24 24"
      className={cn('stroke-current', className)}
      strokeWidth="2"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  );
}

const PurePreviewMessage = ({
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  reload,
  isReadonly,
}: {
  chatId: string;
  message: UIMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  isReadonly: boolean;
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  // Process message parts to detect consecutive tool invocations
  const processedParts = useMemo(() => {
    const allParts = message.parts || [];
    
    // Add a property to identify the start of a group
    const enhancedParts = allParts.map((part, _i) => {
      const enhancedPart = { ...part } as EnhancedMessagePart;
      enhancedPart.connectNext = false;
      enhancedPart.connectPrevious = false;
      enhancedPart.toolIndex = -1; // Initialize with -1 (not part of a group)
      
      return enhancedPart;
    });

    // First pass: Mark connections between tools
    for (let i = 0; i < enhancedParts.length; i++) {
      const part = enhancedParts[i];
      
      // Only process tool invocation results
      if (part.type === 'tool-invocation' && part.toolInvocation.state === 'result') {
        const currentToolName = part.toolInvocation.toolName;

        // Find the *next* tool invocation result, stopping if text is encountered
        let nextToolPart: EnhancedMessagePart | null = null;
        let textEncounteredNext = false;
        for (let j = i + 1; j < enhancedParts.length; j++) {
          const potentialNextPart = enhancedParts[j];
          // Stop if we hit meaningful text
          if (potentialNextPart.type === 'text' && potentialNextPart.text.trim().length > 0) {
            textEncounteredNext = true;
            break;
          }
          // If it's a tool result, we found it
          if (potentialNextPart.type === 'tool-invocation' && 'toolInvocation' in potentialNextPart && potentialNextPart.toolInvocation.state === 'result') {
            nextToolPart = potentialNextPart;
            break;
          }
        }

        // Connect if a next tool was found AND no text was encountered before it
        if (!textEncounteredNext && nextToolPart && nextToolPart.type === 'tool-invocation' && 'toolInvocation' in nextToolPart) {
          const nextToolName = nextToolPart.toolInvocation.toolName;
          if ((currentToolName === 'webSearch' && nextToolName === 'readWebsiteContent') ||
              (currentToolName === 'readWebsiteContent' && nextToolName === 'readWebsiteContent') ||
              (currentToolName === 'think' && (nextToolName === 'webSearch' || nextToolName === 'readWebsiteContent')) ||
              ((currentToolName === 'webSearch' || currentToolName === 'readWebsiteContent') && nextToolName === 'think')) {
            part.connectNext = true;
          }
        }

        // Find the *previous* tool invocation result, stopping if text is encountered
        let prevToolPart: EnhancedMessagePart | null = null;
        let textEncounteredPrev = false;
        for (let j = i - 1; j >= 0; j--) {
          const potentialPrevPart = enhancedParts[j];
           // Stop if we hit meaningful text
          if (potentialPrevPart.type === 'text' && potentialPrevPart.text.trim().length > 0) {
            textEncounteredPrev = true;
            break;
          }
          // If it's a tool result, we found it
          if (potentialPrevPart.type === 'tool-invocation' && 'toolInvocation' in potentialPrevPart && potentialPrevPart.toolInvocation.state === 'result') {
            prevToolPart = potentialPrevPart;
            break;
          }
        }

        // Connect if a previous tool was found AND no text was encountered before it
        if (!textEncounteredPrev && prevToolPart && prevToolPart.type === 'tool-invocation' && 'toolInvocation' in prevToolPart) {
          const prevToolName = prevToolPart.toolInvocation.toolName;
          if ((currentToolName === 'readWebsiteContent' &&
              (prevToolName === 'webSearch' || prevToolName === 'readWebsiteContent')) ||
              (currentToolName === 'think' && 
              (prevToolName === 'webSearch' || prevToolName === 'readWebsiteContent')) ||
              ((currentToolName === 'webSearch' || currentToolName === 'readWebsiteContent') && 
              prevToolName === 'think')) {
            part.connectPrevious = true;
          }
        }
      }
    }
    
    // Second pass: Assign group indices to connected tool parts
    let currentGroupIndex = 0;
    for (let i = 0; i < enhancedParts.length; i++) {
      const part = enhancedParts[i];
      
      if (part.type === 'tool-invocation' && part.toolInvocation.state === 'result') {
        // If this is a tool and not already part of a group
        if (part.toolIndex === -1) {
          // Start a new group
          part.toolIndex = currentGroupIndex;
          
          // If this connects to next ones, mark them as part of the same group
          if (part.connectNext) {
            let j = i + 1;
            while (j < enhancedParts.length) {
              const nextPart = enhancedParts[j];
              
              // Skip non-tool or non-result parts
              if (nextPart.type !== 'tool-invocation' || nextPart.toolInvocation.state !== 'result') {
                j++;
                continue;
              }
              
              // If this part connects to the previous, add it to the group
              if (nextPart.connectPrevious) {
                nextPart.toolIndex = currentGroupIndex;
                
                // If this doesn't connect to the next, we're done with this group
                if (!nextPart.connectNext) {
                  break;
                }
              } else {
                // If this doesn't connect to the previous, we're done with this group
                break;
              }
              
              j++;
            }
            
            // Increment the group index for the next group
            currentGroupIndex++;
          } else if (!part.connectPrevious) {
            // If this is a standalone tool (doesn't connect in either direction)
            currentGroupIndex++;
          }
        }
      }
    }

    return enhancedParts;
  }, [message.parts]);

  return (
    <div
      data-testid={`message-${message.role}`}
      className="w-full mx-auto max-w-3xl px-4 group/message transition-opacity duration-300 ease-in-out"
      data-role={message.role}
    >
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
            // Group the parts by their tool groups
            const toolGroups: { [key: number]: EnhancedMessagePart[] } = {};
            
            // Collect all tool invocation results into groups
            processedParts.forEach((part) => {
              if (part.type === 'tool-invocation' && 
                  part.toolInvocation.state === 'result' && 
                  part.toolIndex !== undefined && 
                  part.toolIndex >= 0) {
                
                if (!toolGroups[part.toolIndex]) {
                  toolGroups[part.toolIndex] = [];
                }
                
                toolGroups[part.toolIndex].push(part);
              }
            });

            // Render the parts, wrapping grouped ones in a container
            return processedParts.map((part, index) => {
              const { type } = part;
              const key = `message-${message.id}-part-${index}`;

              // For non-tool parts or tool calls, render normally
              if (type !== 'tool-invocation' || part.toolInvocation.state !== 'result') {
                if (type === 'text') {
                  if (mode === 'view') {
                    return (
                      <div key={key} className="flex flex-row gap-2 items-start">
                        {message.role === 'user' && !isReadonly && (
                          <div className="self-center">
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
                          </div>
                        )}

                        <div
                          data-testid="message-content"
                          className={cn('flex flex-col gap-0 flex-1 w-full', {
                            'dark:bg-zinc-800/90 bg-zinc-100 dark:text-zinc-100 text-zinc-900 px-4 py-3 rounded-2xl':
                              message.role === 'user',
                            'text-foreground': message.role === 'assistant'
                          })}
                        >
                          {message.role === 'user' ? (
                            <div className="whitespace-pre-wrap break-words">
                              <UserTextWithLineBreaks text={part.text} />
                            </div>
                          ) : (
                            <Markdown baseHeadingLevel={2}>{part.text}</Markdown>
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

                if (type === 'tool-invocation' && part.toolInvocation.state === 'call') {
                  const { toolInvocation } = part;
                  const { toolName, toolCallId } = toolInvocation;
                  const { args } = toolInvocation;

                  return (
                    <div
                      key={toolCallId}
                      className={cx({
                        skeleton: ['getWeather'].includes(toolName),
                      })}
                    >
                      {toolName === 'getWeather' ? (
                        <Weather />
                      ) : toolName === 'createDocument' ? (
                        <DocumentPreview isReadonly={isReadonly} args={args} />
                      ) : toolName === 'updateDocument' ? (
                        <DocumentToolCall
                          type="update"
                          args={args}
                          isReadonly={isReadonly}
                        />
                      ) : toolName === 'requestSuggestions' ? (
                        <DocumentToolCall
                          type="request-suggestions"
                          args={args}
                          isReadonly={isReadonly}
                        />
                      ) : toolName === 'readWebsiteContent' ? (
                        <div className="flex flex-col gap-4 w-full bg-background border rounded-xl p-4 mb-2">
                          <div className="flex gap-2 items-center text-sm text-muted-foreground">
                            <WebpageLoadingIcon size={16} />
                            <span>
                              Reading webpage{' '}
                              <span className="font-medium">{args.url}</span>
                            </span>
                          </div>
                          <div className="flex items-center justify-center p-4">
                            <ShinyText>Getting content from webpage...</ShinyText>
                          </div>
                        </div>
                      ) : toolName === 'think' ? (
                        <div className="flex flex-col gap-4 w-full bg-background border rounded-xl p-4 mb-2">
                          <div className="flex gap-2 items-center text-sm text-muted-foreground">
                            <ThinkIcon size={16} />
                            <span>
                              Structured thinking in progress...
                            </span>
                          </div>
                          <div className="flex items-center justify-center p-4">
                            <ShinyText>Organizing thoughts and analyzing the problem...</ShinyText>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                }

                return null;
              }

              // For tool results that aren't part of a group or are the first in their group, render them
              if (part.toolIndex === undefined || part.toolIndex < 0 || 
                  !toolGroups[part.toolIndex] || 
                  toolGroups[part.toolIndex][0] === part) {
                
                const { toolInvocation } = part;
                const { toolName, toolCallId } = toolInvocation;
                const { result } = toolInvocation;
                
                // If this is the first part of a group with multiple parts, wrap them all
                if (part.toolIndex !== undefined && part.toolIndex >= 0 && 
                    toolGroups[part.toolIndex] && toolGroups[part.toolIndex].length > 1) {
                  
                  // This is a grouped tool set, render a container with all tools in the group
                  return (
                    <div key={`tool-group-${part.toolIndex}`} className="border-[1.5px] border-border rounded-xl mb-0 overflow-hidden">
                      {toolGroups[part.toolIndex].map((groupPart) => {
                        // Use type assertion to ensure toolInvocation is properly typed
                        if (groupPart.type !== 'tool-invocation' || !groupPart.toolInvocation) {
                          return null;
                        }
                        
                        const toolInvocation = groupPart.toolInvocation;
                        const toolName = toolInvocation.toolName;
                        const toolCallId = toolInvocation.toolCallId;
                        const result = toolInvocation.result || {};
                        
                        return (
                          <div key={toolCallId} className="border-0">
                            {toolName === 'webSearch' ? (
                              <WebSearch
                                results={result.results}
                                query={result.query}
                                count={result.count}
                                connectNext={groupPart.connectNext}
                                inGroup={true}
                              />
                            ) : toolName === 'readWebsiteContent' ? (
                              <WebsiteContent
                                url={result.url}
                                content={result.content}
                                query={result.query}
                                status={result.status}
                                error={result.error}
                                source={result.source}
                                fallbackError={result.fallbackError}
                                connectPrevious={groupPart.connectPrevious}
                                connectNext={groupPart.connectNext}
                                inGroup={true}
                              />
                            ) : toolName === 'think' ? (
                              <Think
                                thought={result.thought}
                                connectPrevious={groupPart.connectPrevious}
                                connectNext={groupPart.connectNext}
                                inGroup={true}
                              />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  );
                }
                
                // This is a standalone tool, render it normally
                return (
                  <div key={toolCallId}>
                    {toolName === 'getWeather' ? (
                      <Weather weatherAtLocation={result} />
                    ) : toolName === 'createDocument' ? (
                      <DocumentPreview
                        isReadonly={isReadonly}
                        result={result}
                      />
                    ) : toolName === 'updateDocument' ? (
                      <DocumentToolResult
                        type="update"
                        result={result}
                        isReadonly={isReadonly}
                      />
                    ) : toolName === 'requestSuggestions' ? (
                      <DocumentToolResult
                        type="request-suggestions"
                        result={result}
                        isReadonly={isReadonly}
                      />
                    ) : toolName === 'webSearch' ? (
                      <WebSearch
                        results={result.results}
                        query={result.query}
                        count={result.count}
                        connectNext={part.connectNext}
                      />
                    ) : toolName === 'readWebsiteContent' ? (
                      <WebsiteContent
                        url={result.url}
                        content={result.content}
                        query={result.query}
                        status={result.status}
                        error={result.error}
                        source={result.source}
                        fallbackError={result.fallbackError}
                        connectPrevious={part.connectPrevious}
                        connectNext={part.connectNext}
                      />
                    ) : toolName === 'getYoutubeTranscript' ? (
                      <YouTubeTranscript
                        transcript={result}
                        videoId={extractVideoId(toolInvocation.args.urlOrId)}
                        title={toolInvocation.args.urlOrId}
                        hasTimestamps={!toolInvocation.args.combineAll}
                        urlOrId={toolInvocation.args.urlOrId}
                        languages={toolInvocation.args.languages}
                      />
                    ) : toolName === 'think' ? (
                      <Think
                        thought={result.thought}
                        connectPrevious={part.connectPrevious}
                        connectNext={part.connectNext}
                      />
                    ) : (
                      <pre>{JSON.stringify(result, null, 2)}</pre>
                    )}
                  </div>
                );
              }
              
              // For tools that are part of a group but not the first one, skip them as they're rendered with the first one
              return null;
            });
          })()}

          {!isReadonly && (
            <MessageActions
              key={`action-${message.id}`}
              chatId={chatId}
              message={message}
              vote={vote}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.message.id !== nextProps.message.id) return false;
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
    if (!equal(prevProps.vote, nextProps.vote)) return false;

    return true;
  },
);

export const ThinkingMessage = () => {
  const role = 'assistant';

  return (
    <div
      data-testid="message-assistant-loading"
      className="w-full mx-auto max-w-3xl px-4 group/message opacity-80 transition-opacity duration-300 ease-in-out"
      data-role={role}
    >
      <div className="flex gap-4 w-full">
        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-col gap-4 text-muted-foreground">
            <ShinyText>Thinking, wait a bit...</ShinyText>
          </div>
        </div>
      </div>
    </div>
  );
};
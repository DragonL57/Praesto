'use client';

import React, { memo, useState, useMemo } from 'react';
import type { UIMessage } from 'ai';
import cx from 'classnames';
// Removing framer-motion animations
// import { AnimatePresence, motion } from 'framer-motion';
import type { Vote } from '@/lib/db/schema';
import { DocumentToolCall, DocumentToolResult } from './document';
import { PencilEditIcon, WebpageLoadingIcon } from './icons';
import { Markdown } from './markdown';
import { MessageActions } from './message-actions';
import { PreviewAttachment } from './preview-attachment';
import { Weather } from './weather';
import { WebSearch } from './web-search';
import { WebsiteContent } from './website-content';
import { YouTubeTranscript } from './youtube-transcript';
import equal from 'fast-deep-equal';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { MessageEditor } from './message-editor';
import { DocumentPreview } from './document-preview';
import type { UseChatHelpers } from '@ai-sdk/react';
import ShinyText from './shiny-text';

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

    return allParts.map((part, i) => {
      const enhancedPart = { ...part } as EnhancedMessagePart;
      enhancedPart.connectNext = false;
      enhancedPart.connectPrevious = false;

      // Only process tool invocation results
      if (enhancedPart.type === 'tool-invocation' && enhancedPart.toolInvocation.state === 'result') {
        const currentToolName = enhancedPart.toolInvocation.toolName;

        // Find the *next* tool invocation result, stopping if text is encountered
        let nextToolPart: EnhancedMessagePart | null = null;
        let textEncounteredNext = false;
        for (let j = i + 1; j < allParts.length; j++) {
          const potentialNextPart = allParts[j];
          // Stop if we hit meaningful text
          if (potentialNextPart.type === 'text' && potentialNextPart.text.trim().length > 0) {
            textEncounteredNext = true;
            break;
          }
          // If it's a tool result, we found it
          if (potentialNextPart.type === 'tool-invocation' && 'toolInvocation' in potentialNextPart && potentialNextPart.toolInvocation.state === 'result') {
            nextToolPart = potentialNextPart as EnhancedMessagePart;
            break;
          }
        }

        // Connect if a next tool was found AND no text was encountered before it
        if (!textEncounteredNext && nextToolPart && nextToolPart.type === 'tool-invocation' && 'toolInvocation' in nextToolPart) {
          const nextToolName = nextToolPart.toolInvocation.toolName;
          if ((currentToolName === 'webSearch' && nextToolName === 'readWebsiteContent') ||
              (currentToolName === 'readWebsiteContent' && nextToolName === 'readWebsiteContent')) {
            enhancedPart.connectNext = true;
          }
        }

        // Find the *previous* tool invocation result, stopping if text is encountered
        let prevToolPart: EnhancedMessagePart | null = null;
        let textEncounteredPrev = false;
        for (let j = i - 1; j >= 0; j--) {
          const potentialPrevPart = allParts[j];
           // Stop if we hit meaningful text
          if (potentialPrevPart.type === 'text' && potentialPrevPart.text.trim().length > 0) {
            textEncounteredPrev = true;
            break;
          }
          // If it's a tool result, we found it
          if (potentialPrevPart.type === 'tool-invocation' && 'toolInvocation' in potentialPrevPart && potentialPrevPart.toolInvocation.state === 'result') {
            prevToolPart = potentialPrevPart as EnhancedMessagePart;
            break;
          }
        }

        // Connect if a previous tool was found AND no text was encountered before it
        if (!textEncounteredPrev && prevToolPart && prevToolPart.type === 'tool-invocation' && 'toolInvocation' in prevToolPart) {
          const prevToolName = prevToolPart.toolInvocation.toolName;
          if (currentToolName === 'readWebsiteContent' &&
              (prevToolName === 'webSearch' || prevToolName === 'readWebsiteContent')) {
            enhancedPart.connectPrevious = true;
          }
        }
      }
      return enhancedPart;
    });
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
        <div className="flex flex-col gap-4 w-full">
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

          {processedParts.map((part, index) => {
            const { type } = part;
            const key = `message-${message.id}-part-${index}`;

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

            if (type === 'tool-invocation') {
              const { toolInvocation } = part;
              const { toolName, toolCallId, state } = toolInvocation;

              if (state === 'call') {
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
                            <span className="font-medium">{args.url}</span>...
                          </span>
                        </div>
                        <div className="flex items-center justify-center p-4">
                          <div className="animate-spin rounded-full size-6 border-y-2 border-primary" />
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              }

              if (state === 'result') {
                const { result } = toolInvocation;

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
                    ) : (
                      <pre>{JSON.stringify(result, null, 2)}</pre>
                    )}
                  </div>
                );
              }
            }

            return null;
          })}

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
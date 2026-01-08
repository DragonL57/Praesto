'use client';

/**
 * Main message component (refactored for modularity)
 * Orchestrates all message sub-components
 */

import React, { memo, useEffect, useState } from 'react';
import equal from 'fast-deep-equal';
import { useCopyToClipboard } from 'usehooks-ts';

import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

// Import types
import type { PurePreviewMessageProps, PreviewMessageProps } from './message-types';

// Import hooks
import { useReasoningElements, useProcessedParts } from './message-hooks';

// Import utilities
import {
  isToolPart,
  extractToolName,
  isToolResultAvailable,
  isReasoningTool,
} from './message-utils';

// Import sub-components
import { MessageReasoning } from './message-reasoning';
import { MessageActions } from './message-actions';
import { MessageEditor } from './message-editor';
import { MessageContent } from './message-content';
import { MessageAttachments } from './message-attachments';
import { MessageUserActions } from './message-user-actions';
import { ToolCallSkeleton } from './message-tools';
import { SuggestedActions } from '../suggested-actions';

// ============================================================================
// Main Message Component
// ============================================================================

const PurePreviewMessage = memo<PurePreviewMessageProps>(
  ({ chatId, message, isLoading, setMessages, reload, append, isReadonly, suggestions, suggestionsLoading, sendMessage, status }) => {
    const [mode, setMode] = useState<'view' | 'edit'>('view');
    const [_copyFn] = useCopyToClipboard();
    const [isRetrying, setIsRetrying] = useState(false);
    const [shouldShowButtons, setShouldShowButtons] = useState(false);
    const isMobile = useIsMobile();

    // Extract reasoning elements and process parts using hooks
    const { reasoningElements, indicesToFilter } = useReasoningElements(message);
    const processedParts = useProcessedParts(message, indicesToFilter);

    // Effect to handle button visibility
    useEffect(() => {
      if (isMobile) {
        const timer = setTimeout(() => setShouldShowButtons(true), 300);
        return () => clearTimeout(timer);
      } else {
        setShouldShowButtons(false);
      }
    }, [isMobile, message.id]);

    // Handle copy events to preserve formatting
    const handleCopy = (event: React.ClipboardEvent<HTMLDivElement>) => {
      const selection = window.getSelection();
      if (selection?.toString()) {
        const range = selection.getRangeAt(0);
        const clonedSelection = range.cloneContents();
        const div = document.createElement('div');
        div.appendChild(clonedSelection);

        const formattedHTML = div.innerHTML;
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

        event.clipboardData.clearData();
        event.clipboardData.setData('text/plain', selection.toString());
        event.clipboardData.setData('text/html', cleanHTML);
        event.preventDefault();
      }
    };

    const isUserMessage = message.role === 'user';

    return (
      <div
        data-testid={`message-${message.role}`}
        className="w-full mx-auto max-w-3xl px-2 md:px-4 group/message transition-opacity duration-300 ease-in-out"
        data-role={message.role}
        style={{
          maxWidth: 'min(100%, 48rem)',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
        }}
      >
        {/* Render MessageReasoning for assistant messages */}
        {message.role === 'assistant' &&
          (isLoading || (reasoningElements && reasoningElements.length > 0)) && (
            <MessageReasoning
              content={reasoningElements || []}
              isLoading={isLoading}
              hasResponseStarted={processedParts.some((part) => {
                if (
                  part.type === 'text' &&
                  typeof part.text === 'string' &&
                  part.text.trim().length > 0
                ) {
                  return true;
                }
                if (
                  isToolPart(part) &&
                  isToolResultAvailable(part) &&
                  !isReasoningTool(extractToolName(part))
                ) {
                  return true;
                }
                return false;
              })}
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
          style={{
            maxWidth: message.role === 'user' ? 'min(100%, 42rem)' : '100%',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
          }}
        >
          <div className="flex flex-col gap-1 w-full">
            {/* Render attachments */}
            <MessageAttachments message={message} />

            {/* Render message parts */}
            {processedParts.map((part, index) => {
              const key = `message-${message.id}-part-${index}`;

              // Render text parts
              if (part.type === 'text' && part.text?.trim().length > 0) {
                if (mode === 'view') {
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      <MessageContent
                        message={message}
                        text={part.text}
                        messageId={message.id}
                        onCopy={handleCopy}
                        append={append}
                      />
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

              // Render tool call skeletons (input-available state)
              if (
                isToolPart(part) &&
                'state' in part &&
                (part as { state: string }).state === 'input-available'
              ) {
                const toolName = extractToolName(part);
                const toolCallId = 'toolCallId' in part ? (part as { toolCallId: string }).toolCallId : '';

                // Skip reasoning tools
                if (isReasoningTool(toolName)) return null;

                return (
                  <ToolCallSkeleton
                    key={key}
                    toolName={toolName}
                    toolCallId={toolCallId}
                    toolIndex={part.toolIndex}
                    messageId={message.id}
                  />
                );
              }

              return null;
            })}

            {/* Render suggestions inside the message if provided */}
            {!isReadonly && (suggestions || suggestionsLoading) && sendMessage && message.role === 'assistant' && status !== 'streaming' && (
              <div data-exclude-from-copy="true" className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <SuggestedActions
                  chatId={chatId}
                  _messages={[message]}
                  suggestions={suggestions}
                  isLoading={suggestionsLoading}
                  sendMessage={sendMessage}
                />
              </div>
            )}

            {/* Render assistant message actions */}
            {!isReadonly && message.role === 'assistant' && (
              <div className="flex justify-start mt-1">
                <MessageActions
                  key={`action-${message.id}`}
                  chatId={chatId}
                  message={message}
                  isLoading={isLoading}
                  setMessages={setMessages}
                />
              </div>
            )}
          </div>
        </div>

        {/* Render user message actions */}
        {isUserMessage && mode !== 'edit' && !isReadonly && (
          <MessageUserActions
            message={message}
            chatId={chatId}
            setMode={setMode}
            setMessages={setMessages}
            reload={reload}
            shouldShowButtons={shouldShowButtons}
            isMobile={isMobile}
            isRetrying={isRetrying}
            setIsRetrying={setIsRetrying}
          />
        )}
      </div>
    );
  },
);

PurePreviewMessage.displayName = 'PurePreviewMessage';

// ============================================================================
// Memoized Export
// ============================================================================

const MemoizedPurePreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    return (
      prevProps.chatId === nextProps.chatId &&
      equal(prevProps.message, nextProps.message) &&
      prevProps.isLoading === nextProps.isLoading &&
      equal(prevProps.suggestions, nextProps.suggestions) &&
      prevProps.suggestionsLoading === nextProps.suggestionsLoading &&
      prevProps.setMessages === nextProps.setMessages &&
      prevProps.reload === nextProps.reload &&
      prevProps.append === nextProps.append &&
      prevProps.isReadonly === nextProps.isReadonly
    );
  },
);

export const PreviewMessage: React.FC<PreviewMessageProps> = (props) => {
  return <MemoizedPurePreviewMessage {...props} />;
};

PreviewMessage.displayName = 'PreviewMessage';

// ============================================================================
// ThinkingMessage Component
// ============================================================================

export const ThinkingMessage = () => {
  const [currentDisplay] = useState({
    text: 'Thinking, wait a bit...',
    iconType: 'spinner' as 'spinner' | 'tick' | 'chevron',
  });
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
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

// ============================================================================
// MessageSkeleton Component
// ============================================================================

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

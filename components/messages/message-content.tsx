/**
 * Message content rendering component
 * Handles text display for both user and assistant messages
 */

import React from 'react';
import type { UIMessage } from 'ai';
import { cn } from '@/lib/utils';
import { Markdown } from '../markdown';
import { UserTextWithLineBreaks } from './user-text';
import { getGradientStyle } from './message-utils';
import type { AppendFunction } from '@/lib/ai/types';

interface MessageContentProps {
  message: UIMessage;
  text: string;
  messageId: string;
  onCopy?: (event: React.ClipboardEvent<HTMLDivElement>) => void;
  append: AppendFunction;
}

/**
 * Renders message text content with appropriate styling and formatting
 */
export const MessageContent: React.FC<MessageContentProps> = ({
  message,
  text,
  messageId,
  onCopy,
  append,
}) => {
  const isUserMessage = message.role === 'user';

  return (
    <div
      data-testid="message-content"
      data-message-id={messageId}
      onCopy={onCopy}
      className={cn('flex flex-col gap-0 flex-1 w-full', {
        [`${getGradientStyle(message)} dark:text-zinc-100 text-zinc-900 px-3 py-2 md:px-4 md:py-3 rounded-2xl transition-all duration-300`]:
          isUserMessage,
        'text-foreground': !isUserMessage,
      })}
      style={{
        maxWidth: '100%',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        hyphens: 'auto',
      }}
    >
      {isUserMessage ? (
        <div
          className="whitespace-pre-wrap break-words text-sm"
          style={{
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            hyphens: 'auto',
            maxWidth: '100%',
          }}
        >
          <UserTextWithLineBreaks text={text} />
        </div>
      ) : (
        <Markdown baseHeadingLevel={2} append={append}>
          {text}
        </Markdown>
      )}
    </div>
  );
};

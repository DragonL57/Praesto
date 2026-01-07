/**
 * Message user actions component
 * Handles edit, copy, delete, and retry actions for user messages
 */

import React from 'react';
import type { UIMessage } from 'ai';
import { useCopyToClipboard } from 'usehooks-ts';
import { toast } from 'sonner';
import { RefreshCwIcon } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { CopyIcon, PencilEditIcon, TrashIcon } from '../icons';
import { deleteMessage, deleteTrailingMessages } from '@/lib/actions/chat';
import type { SetMessagesFunction } from '@/lib/ai/types';

interface MessageUserActionsProps {
  message: UIMessage;
  chatId: string;
  setMode: (mode: 'view' | 'edit') => void;
  setMessages: SetMessagesFunction;
  reload: () => Promise<string | null | undefined>;
  shouldShowButtons: boolean;
  isMobile: boolean;
  isRetrying: boolean;
  setIsRetrying: (value: boolean) => void;
}

/**
 * Action buttons for user messages (edit, copy, delete, retry)
 */
export const MessageUserActions: React.FC<MessageUserActionsProps> = ({
  message,
  chatId,
  setMode,
  setMessages,
  reload,
  shouldShowButtons,
  isMobile,
  isRetrying,
  setIsRetrying,
}) => {
  const [, copyFn] = useCopyToClipboard();

  const handleCopy = async () => {
    const userTextPart = message.parts?.find((part) => part.type === 'text');
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
        // 1. Delete trailing messages from DB
        await deleteTrailingMessages({ id: message.id });

        // 2. Update client-side messages state
        setMessages((prevMessages) => {
          const messageIndex = prevMessages.findIndex((m) => m.id === message.id);
          if (messageIndex !== -1) {
            return prevMessages.slice(0, messageIndex + 1);
          }
          return prevMessages;
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

  const handleDelete = async () => {
    try {
      await deleteMessage({ id: message.id, chatId });
      setMessages((prevMessages) => prevMessages.filter((m) => m.id !== message.id));
      toast.success('Message deleted.');
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message. Please try again.');
    }
  };

  const buttonClasses = `p-2 md:px-2 h-fit rounded-full text-muted-foreground transition-opacity duration-200 ${
    isMobile
      ? shouldShowButtons
        ? 'opacity-100'
        : 'opacity-0'
      : 'opacity-0 group-hover/message:opacity-100'
  }`;

  return (
    <div
      className={`flex justify-end items-center gap-1 mt-1 transition-opacity duration-200 ${
        isMobile
          ? shouldShowButtons
            ? 'opacity-100'
            : 'opacity-0'
          : 'opacity-0 group-hover/message:opacity-100'
      }`}
    >
      <TooltipProvider delayDuration={200}>
        {/* Retry Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full text-muted-foreground size-9 md:size-8 transition-opacity duration-200 ${buttonClasses}`}
              onClick={handleRetry}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <div className="flex items-center justify-center size-[18px] md:size-4">
                  <svg
                    className="animate-spin size-[18px] md:size-4 text-blue-500"
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
                <RefreshCwIcon className="size-[18px] md:size-4" />
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
        {/* Copy Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="message-copy-button"
              variant="ghost"
              className={`${buttonClasses} mr-1`}
              onClick={handleCopy}
            >
              <CopyIcon size={18} />
              <span className="sr-only">Copy message</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy message</TooltipContent>
        </Tooltip>

        {/* Edit Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="message-edit-button"
              variant="ghost"
              className={buttonClasses}
              onClick={() => setMode('edit')}
            >
              <PencilEditIcon size={18} />
              <span className="sr-only">Edit message</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit message</TooltipContent>
        </Tooltip>

        {/* Delete Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="message-delete-button"
              variant="ghost"
              className={buttonClasses}
              onClick={handleDelete}
            >
              <TrashIcon size={18} />
              <span className="sr-only">Delete message</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete message</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

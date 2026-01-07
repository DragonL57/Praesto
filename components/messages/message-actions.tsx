import type { UIMessage } from 'ai';
import { useCopyToClipboard } from 'usehooks-ts';

import { useIsMobile } from '@/hooks/use-mobile';

import { CopyIcon, TrashIcon } from '../icons';
import { Button } from '../ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { memo, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { deleteMessage } from '@/lib/actions/chat';
import type { SetMessagesFunction } from '@/lib/ai/types';

export function PureMessageActions({
  chatId,
  message,
  isLoading,
  setMessages,
}: {
  chatId: string;
  message: UIMessage;
  isLoading: boolean;
  setMessages?: SetMessagesFunction;
}) {
  const [_, copyToClipboard] = useCopyToClipboard();
  const [shouldShowButtons, setShouldShowButtons] = useState(false);
  const isMobile = useIsMobile();

  // Effect to handle button visibility
  useEffect(() => {
    if (isMobile) {
      // On mobile, always show buttons after a short delay with fade-in
      const timer = setTimeout(() => {
        setShouldShowButtons(true);
      }, 300); // 300ms delay for fade-in effect

      return () => clearTimeout(timer);
    } else {
      // On desktop, buttons remain hover-dependent (controlled by CSS)
      setShouldShowButtons(false);
    }
  }, [isMobile, message.id]); // Re-run when message changes

  if (isLoading) return null;
  if (message.role === 'user') return null;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-row">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className={`p-2 md:px-2 h-fit rounded-full text-muted-foreground mr-1 transition-opacity duration-200 ${
                isMobile
                  ? shouldShowButtons
                    ? 'opacity-100'
                    : 'opacity-0'
                  : 'opacity-0 group-hover/message:opacity-100'
              }`}
              variant="ghost"
              onClick={async () => {
                const textFromParts = message.parts
                  ?.filter((part) => part.type === 'text')
                  .map((part) => part.text)
                  .join('\n')
                  .trim();

                if (!textFromParts) {
                  toast.error("There's no text to copy!");
                  return;
                }

                await copyToClipboard(textFromParts);
                toast.success('Copied to clipboard!');
              }}
            >
              <CopyIcon size={18} />
              <span className="sr-only">Copy message text</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="message-delete-button"
              className={`p-2 md:px-2 h-fit rounded-full text-muted-foreground transition-opacity duration-200 ${
                isMobile
                  ? shouldShowButtons
                    ? 'opacity-100'
                    : 'opacity-0'
                  : 'opacity-0 group-hover/message:opacity-100'
              }`}
              variant="ghost"
              onClick={async () => {
                try {
                  await deleteMessage({ id: message.id, chatId });

                  // Update client-side messages state immediately
                  if (setMessages) {
                    setMessages((prevMessages) =>
                      prevMessages.filter((m) => m.id !== message.id),
                    );
                  }

                  toast.success('Message deleted.');
                } catch (error) {
                  console.error('Failed to delete message:', error);
                  toast.error('Failed to delete message. Please try again.');
                }
              }}
            >
              <TrashIcon size={18} />
              <span className="sr-only">Delete message</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete message</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;

    return true;
  },
);

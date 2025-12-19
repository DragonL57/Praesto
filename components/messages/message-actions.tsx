import type { UIMessage } from 'ai';
import { useSWRConfig } from 'swr';
import { useCopyToClipboard } from 'usehooks-ts';

import type { Vote } from '@/lib/db/schema';
import { useIsMobile } from '@/hooks/use-mobile';

import { CopyIcon, ThumbDownIcon, ThumbUpIcon, TrashIcon } from '../icons';
import { Button } from '../ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { memo, useEffect, useState } from 'react';
import equal from 'fast-deep-equal';
import { toast } from 'sonner';
import { deleteMessage } from '@/app/(chat)/actions';
import type { SetMessagesFunction } from '@/lib/ai/types';

export function PureMessageActions({
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
}: {
  chatId: string;
  message: UIMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages?: SetMessagesFunction;
}) {
  const { mutate } = useSWRConfig();
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
                isMobile ? (shouldShowButtons ? 'opacity-100' : 'opacity-0') : 'opacity-0 group-hover/message:opacity-100'
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
              data-testid="message-upvote"
              className={`p-2 md:px-2 h-fit rounded-full text-muted-foreground mr-1 transition-opacity duration-200 ${
                isMobile ? (shouldShowButtons ? 'opacity-100' : 'opacity-0') : 'opacity-0 group-hover/message:opacity-100'
              }`}
              disabled={vote?.isUpvoted}
              variant="ghost"
              onClick={async () => {
                const upvote = fetch('/api/vote', {
                  method: 'PATCH',
                  body: JSON.stringify({
                    chatId,
                    messageId: message.id,
                    type: 'up',
                  }),
                });

                toast.promise(upvote, {
                  loading: 'Upvoting Response...',
                  success: () => {
                    mutate<Array<Vote>>(
                      `/api/vote?chatId=${chatId}`,
                      (currentVotes) => {
                        if (!currentVotes) return [];

                        const votesWithoutCurrent = currentVotes.filter(
                          (vote) => vote.messageId !== message.id,
                        );

                        return [
                          ...votesWithoutCurrent,
                          {
                            chatId,
                            messageId: message.id,
                            isUpvoted: true,
                          },
                        ];
                      },
                      { revalidate: false },
                    );

                    return 'Upvoted Response!';
                  },
                  error: 'Failed to upvote response.',
                });
              }}
            >
              <ThumbUpIcon size={18} />
              <span className="sr-only">Upvote response</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Upvote Response</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="message-downvote"
              className={`p-2 md:px-2 h-fit rounded-full text-muted-foreground transition-opacity duration-200 ${
                isMobile ? (shouldShowButtons ? 'opacity-100' : 'opacity-0') : 'opacity-0 group-hover/message:opacity-100'
              }`}
              variant="ghost"
              disabled={vote && !vote.isUpvoted}
              onClick={async () => {
                const downvote = fetch('/api/vote', {
                  method: 'PATCH',
                  body: JSON.stringify({
                    chatId,
                    messageId: message.id,
                    type: 'down',
                  }),
                });

                toast.promise(downvote, {
                  loading: 'Downvoting Response...',
                  success: () => {
                    mutate<Array<Vote>>(
                      `/api/vote?chatId=${chatId}`,
                      (currentVotes) => {
                        if (!currentVotes) return [];

                        const votesWithoutCurrent = currentVotes.filter(
                          (vote) => vote.messageId !== message.id,
                        );

                        return [
                          ...votesWithoutCurrent,
                          {
                            chatId,
                            messageId: message.id,
                            isUpvoted: false,
                          },
                        ];
                      },
                      { revalidate: false },
                    );

                    return 'Downvoted Response!';
                  },
                  error: 'Failed to downvote response.',
                });
              }}
            >
              <ThumbDownIcon size={18} />
              <span className="sr-only">Downvote response</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Downvote Response</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              data-testid="message-delete-button"
              className={`p-2 md:px-2 h-fit rounded-full text-muted-foreground transition-opacity duration-200 ${
                isMobile ? (shouldShowButtons ? 'opacity-100' : 'opacity-0') : 'opacity-0 group-hover/message:opacity-100'
              }`}
              variant="ghost"
              onClick={async () => {
                try {
                  await deleteMessage({ id: message.id, chatId });
                  
                  // Update client-side messages state immediately
                  if (setMessages) {
                    setMessages((prevMessages) =>
                      prevMessages.filter((m) => m.id !== message.id)
                    );
                  }
                  
                  toast.success('Message deleted.');
                  // Revalidate votes to remove the deleted message
                  mutate(`/api/vote?chatId=${chatId}`);
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
    if (!equal(prevProps.vote, nextProps.vote)) return false;
    if (prevProps.isLoading !== nextProps.isLoading) return false;

    return true;
  },
);

import { memo } from 'react';
import equal from 'fast-deep-equal';

import type { Vote } from '@/lib/db/schema';
import type { UIMessage } from 'ai';
import type { UIArtifact } from './artifact';
import type { UseChatHelpers } from '@ai-sdk/react';

import { PreviewMessage } from './messages/message';
import { useScrollToBottom } from './use-scroll-to-bottom';
import { ScrollToBottomButton } from './scroll-to-bottom-button';

interface ArtifactMessagesProps {
  chatId: string;
  status: UseChatHelpers['status'];
  votes: Array<Vote> | undefined;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  isReadonly: boolean;
  artifactStatus: UIArtifact['status'];
  isPanelVisible?: boolean;
}

function PureArtifactMessages({
  chatId,
  status,
  votes,
  messages,
  setMessages,
  reload,
  isReadonly,
  isPanelVisible,
}: ArtifactMessagesProps) {
  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  return (
    <div
      ref={messagesContainerRef}
      className="flex flex-col gap-4 size-full items-center overflow-y-scroll overflow-x-hidden px-4 pt-20 relative max-w-full"
    >
      {messages.map((message, index) => (
        <PreviewMessage
          chatId={chatId}
          key={message.id}
          message={message}
          isLoading={status === 'streaming' && index === messages.length - 1}
          vote={
            votes
              ? votes.find((vote) => vote.messageId === message.id)
              : undefined
          }
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
        />
      ))}

      <div
        ref={messagesEndRef}
        className="shrink-0 min-w-[24px] min-h-[24px]"
      />
      
      {messages.length > 2 && !isPanelVisible && (
        <ScrollToBottomButton 
          containerRef={messagesContainerRef}
          endRef={messagesEndRef}
          isArtifactOpen={isPanelVisible}
        />
      )}
    </div>
  );
}

function areEqual(
  prevProps: ArtifactMessagesProps,
  nextProps: ArtifactMessagesProps,
) {
  if (
    prevProps.artifactStatus === 'streaming' &&
    nextProps.artifactStatus === 'streaming'
  )
    return true;

  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.status && nextProps.status) return false;
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  if (!equal(prevProps.votes, nextProps.votes)) return false;

  return true;
}

export const ArtifactMessages = memo(PureArtifactMessages, areEqual);

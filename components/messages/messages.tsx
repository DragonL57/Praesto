import type { UIMessage } from 'ai';
import { PreviewMessage, ThinkingMessage } from './message';
import { memo, useEffect, useRef } from 'react';
import type { Vote } from '@/lib/db/schema';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@ai-sdk/react';
// Removing framer-motion for better performance
// import { motion, AnimatePresence } from 'framer-motion';

interface MessagesProps {
  chatId: string;
  status: UseChatHelpers['status'];
  votes: Array<Vote> | undefined;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
  isReadonly: boolean;
  isArtifactVisible: boolean;
  messagesContainerRef?: React.RefObject<HTMLDivElement>;
  messagesEndRef?: React.RefObject<HTMLDivElement>;
}

function PureMessages({
  chatId,
  status,
  votes,
  messages,
  setMessages,
  reload,
  isReadonly,
  messagesContainerRef: externalContainerRef,
  messagesEndRef: externalEndRef,
}: MessagesProps) {
  // Use external refs if provided, otherwise create our own
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const internalEndRef = useRef<HTMLDivElement>(null);
  
  const containerRef = externalContainerRef || internalContainerRef;
  const endRef = externalEndRef || internalEndRef;
  
  const prevMessagesLengthRef = useRef<number>(messages.length);
  const isStreamingRef = useRef<boolean>(status === 'streaming');
  const lastUserMessageIdRef = useRef<string | null>(null); // Ref for the last user message ID

  // Only scroll to bottom when messages are added or when streaming starts/continues
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

    // 1. Handle new user message: scroll it to the top
    if (lastMessage && lastMessage.role === 'user' && lastMessage.id !== lastUserMessageIdRef.current) {
      const userMessageElement = document.querySelector(`[data-message-id="${lastMessage.id}"]`);
      if (userMessageElement) {
        requestAnimationFrame(() => {
          userMessageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
      lastUserMessageIdRef.current = lastMessage.id;
      // After scrolling user message, update prevMessagesLength and isStreamingRef and exit
      prevMessagesLengthRef.current = messages.length;
      isStreamingRef.current = status === 'streaming';
      return;
    }

    // 2. Handle AI streaming or other new messages (scroll to bottom)
    const end = endRef.current;
    if (end) {
      // Original conditions for scrolling to bottom, excluding the new user message case handled above
      const shouldScrollToBottom =
        (messages.length > prevMessagesLengthRef.current && (!lastMessage || lastMessage.role !== 'user' || lastMessage.id === lastUserMessageIdRef.current)) || // New non-user message or same user message
        (status === 'streaming' && !isStreamingRef.current) || // Streaming just started
        (status === 'streaming' && isStreamingRef.current);    // Continued streaming

      if (shouldScrollToBottom) {
        requestAnimationFrame(() => {
          end.scrollIntoView({ behavior: 'smooth', block: 'end' });
        });
      }
    }

    prevMessagesLengthRef.current = messages.length;
    isStreamingRef.current = status === 'streaming';
  }, [messages, status, containerRef, endRef]); // Ensure `messages` object itself is a dependency

  // Check if there are any visible elements that would require scrolling
  const hasVisibleContent = messages.length > 0 || (status === 'submitted' && messages.length > 0);

  return (
    <div
      className={`absolute inset-0 flex flex-col w-full ${hasVisibleContent ? 'scrollbar-thin scrollbar-thumb-muted-foreground/50 hover:scrollbar-thumb-muted-foreground scrollbar-track-transparent' : 'scrollbar-none'}`}
      style={{
        overflowY: hasVisibleContent ? 'auto' : 'hidden',
        overflowX: 'hidden',
        right: '0px',
        scrollbarGutter: hasVisibleContent ? 'stable' : 'auto',
      }}
      ref={containerRef}
    >
      <div className="flex flex-col min-w-0 gap-3 p-4 md:px-0 md:max-w-3xl md:mx-auto w-full">
        {messages.map((message, index) => (
          <div
            key={message.id}
            data-message-id={message.id} // Add data-message-id for selection
            className="transition-opacity duration-300 ease-in-out"
          >
            <PreviewMessage
              chatId={chatId}
              message={message}
              isLoading={
                status === 'streaming' && messages.length - 1 === index
              }
              vote={
                votes
                  ? votes.find((vote) => vote.messageId === message.id)
                  : undefined
              }
              setMessages={setMessages}
              reload={reload}
              isReadonly={isReadonly}
            />
          </div>
        ))}

        {status === 'submitted' &&
          messages.length > 0 &&
          messages[messages.length - 1].role === 'user' && (
            <div className="transition-opacity duration-300 ease-in-out">
              <ThinkingMessage />
            </div>
          )}

        {hasVisibleContent && (
          <div
            ref={endRef}
            className="shrink-0 min-w-[24px] min-h-[24px]"
          />
        )}
      </div>
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.isArtifactVisible && nextProps.isArtifactVisible) return true;

  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.status && nextProps.status) return false;
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  if (!equal(prevProps.messages, nextProps.messages)) return false;
  if (!equal(prevProps.votes, nextProps.votes)) return false;

  return true;
});

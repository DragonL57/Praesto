import type { UIMessage } from 'ai';
import { PreviewMessage, ThinkingMessage } from './message';
import { Greeting } from './greeting';
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
}

function PureMessages({
  chatId,
  status,
  votes,
  messages,
  setMessages,
  reload,
  isReadonly,
}: MessagesProps) {
  // Instead of using the useScrollToBottom hook which is too sensitive,
  // we'll implement a more selective scrolling mechanism
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef<number>(messages.length);
  const isStreamingRef = useRef<boolean>(status === 'streaming');

  // Only scroll to bottom when messages are added or when streaming starts/continues
  useEffect(() => {
    const container = messagesContainerRef.current;
    const end = messagesEndRef.current;

    if (container && end) {
      const shouldScrollToBottom =
        messages.length > prevMessagesLengthRef.current || // New message added
        (status === 'streaming' && !isStreamingRef.current) || // Streaming just started
        (status === 'streaming' && isStreamingRef.current); // Continued streaming

      if (shouldScrollToBottom) {
        // Use requestAnimationFrame for smoother scrolling
        requestAnimationFrame(() => {
          end.scrollIntoView({ behavior: 'smooth', block: 'end' });
        });
      }
    }

    prevMessagesLengthRef.current = messages.length;
    isStreamingRef.current = status === 'streaming';
  }, [messages.length, status]);

  return (
    <div
      className="absolute inset-0 flex flex-col w-full"
      style={{
        overflowY: 'auto',
        overflowX: 'hidden',
        right: '0px',
        scrollbarWidth: 'thin',
        scrollbarGutter: 'stable',
      }}
      ref={messagesContainerRef}
    >
      <div className="flex flex-col min-w-0 gap-3 p-4 md:px-0 md:max-w-3xl md:mx-auto w-full">
        {messages.length === 0 && <Greeting />}

        {messages.map((message, index) => (
          <div
            key={message.id}
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

        <div
          ref={messagesEndRef}
          className="shrink-0 min-w-[24px] min-h-[24px]"
        />
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

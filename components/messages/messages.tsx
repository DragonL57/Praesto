import type { UIMessage } from 'ai';
import { PreviewMessage, ThinkingMessage } from './message';
import { memo, useEffect, useRef, useState, useMemo } from 'react';
import type { Vote } from '@/lib/db/schema';
import equal from 'fast-deep-equal';
import { AnimatePresence } from 'framer-motion';
import type {
  SetMessagesFunction,
  AppendFunction,
  ChatStatus,
} from '@/lib/ai/types';
// Removing framer-motion for better performance
// import { motion, AnimatePresence } from 'framer-motion';

interface MessagesProps {
  chatId: string;
  status: ChatStatus;
  votes: Array<Vote> | undefined;
  messages: Array<UIMessage>;
  setMessages: SetMessagesFunction;
  reload: () => Promise<string | null | undefined>;
  append: AppendFunction;
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
  append,
  isReadonly,
  messagesContainerRef: externalContainerRef,
  messagesEndRef: externalEndRef,
}: MessagesProps) {
  // Use external refs if provided, otherwise create our own
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const internalEndRef = useRef<HTMLDivElement>(null);

  const containerRef = externalContainerRef || internalContainerRef;
  const endRef = externalEndRef || internalEndRef;

  // Wrap reload to ensure it returns a promise
  const wrappedReload = useMemo(
    () => async () => {
      const result = await reload();
      return result;
    },
    [reload],
  );

  const prevMessagesLengthRef = useRef<number>(messages.length);
  const isStreamingRef = useRef<boolean>(status === 'streaming');
  const lastUserMessageIdRef = useRef<string | null>(null); // Ref for the last user message ID
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false); // New state

  // Effect to detect user scroll and update userHasScrolledUp state
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const SCROLL_UP_THRESHOLD = 100; // Pixels from bottom to consider "scrolled up"
    let scrollTimeout: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      // Debounce scroll event slightly to avoid excessive state updates
      scrollTimeout = setTimeout(() => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const distanceScrolledFromBottom =
          scrollHeight - clientHeight - scrollTop;

        if (distanceScrolledFromBottom > SCROLL_UP_THRESHOLD) {
          if (!userHasScrolledUp) setUserHasScrolledUp(true);
        } else {
          // If user is close to the bottom (e.g., within 5px), consider them "at bottom"
          if (userHasScrolledUp && distanceScrolledFromBottom < 5) {
            setUserHasScrolledUp(false);
          }
        }
      }, 50);
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      container.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef, userHasScrolledUp]); // Added userHasScrolledUp to dependencies to re-evaluate if needed (e.g. for the if !userHasScrolledUp check)

  // Only scroll to bottom when messages are added or when streaming starts/continues
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const lastMessage =
      messages.length > 0 ? messages[messages.length - 1] : null;

    if (
      lastMessage &&
      lastMessage.role === 'user' &&
      lastMessage.id !== lastUserMessageIdRef.current
    ) {
      const userMessageElement = document.querySelector(
        `[data-message-id="${lastMessage.id}"]`,
      );
      if (userMessageElement) {
        requestAnimationFrame(() => {
          userMessageElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        });
      }
      lastUserMessageIdRef.current = lastMessage.id;
      setUserHasScrolledUp(false); // Reset user scroll state when new user message is sent
      prevMessagesLengthRef.current = messages.length;
      isStreamingRef.current = status === 'streaming';
      return;
    }

    const end = endRef.current;
    if (end) {
      const shouldScrollToBottom =
        (messages.length > prevMessagesLengthRef.current &&
          (!lastMessage ||
            lastMessage.role !== 'user' ||
            lastMessage.id === lastUserMessageIdRef.current)) ||
        (status === 'streaming' && !isStreamingRef.current) ||
        (status === 'streaming' && isStreamingRef.current);

      if (shouldScrollToBottom && !userHasScrolledUp) {
        // Modified condition
        requestAnimationFrame(() => {
          end.scrollIntoView({ behavior: 'smooth', block: 'end' });
        });
      }
    }

    prevMessagesLengthRef.current = messages.length;
    isStreamingRef.current = status === 'streaming';
  }, [messages, status, containerRef, endRef, userHasScrolledUp]); // Added userHasScrolledUp to dependencies

  // Check if there are any visible elements that would require scrolling
  const hasVisibleContent =
    messages.length > 0 || (status === 'submitted' && messages.length > 0);

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
              reload={wrappedReload}
              append={append}
              isReadonly={isReadonly}
            />
          </div>
        ))}

        <AnimatePresence>
          {status === 'submitted' &&
            messages.length > 0 &&
            messages[messages.length - 1].role === 'user' && (
              <div
                key="thinking-message-wrapper"
                className="thinking-message-wrapper mb-3 animate-fadeIn"
                style={{ position: 'relative' }}
              >
                <ThinkingMessage />
              </div>
            )}
        </AnimatePresence>

        {hasVisibleContent && (
          <div ref={endRef} className="shrink-0 min-w-[24px] min-h-[24px]" />
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

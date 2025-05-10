import type { UIMessage } from 'ai';
import { PreviewMessage, ThinkingMessage } from './message';
import { memo, useEffect, useRef, useMemo } from 'react';
import type { Vote } from '@/lib/db/schema';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@ai-sdk/react';

// Virtual list threshold - above this message count we'll use windowing
const VIRTUALIZATION_THRESHOLD = 15;

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

  // Only scroll to bottom when messages are added or when streaming starts/continues
  useEffect(() => {
    const container = containerRef.current;
    const end = endRef.current;

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
  }, [messages.length, status, containerRef, endRef]);

  // Check if there are any visible elements that would require scrolling
  const hasVisibleContent = messages.length > 0 || (status === 'submitted' && messages.length > 0);
  
  // Optimize message rendering for large conversations
  const messagesToRender = useMemo(() => {
    // For small conversations, render all messages
    if (messages.length <= VIRTUALIZATION_THRESHOLD) {
      return messages;
    }
    
    // For large conversations, only render the last 15 messages
    // This significantly improves performance in long conversations
    return messages.slice(-VIRTUALIZATION_THRESHOLD);
  }, [messages]);
  
  // Track if messages were trimmed for rendering
  const messagesTrimmed = messages.length > VIRTUALIZATION_THRESHOLD;

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
        {/* If messages were trimmed, show a load more button */}
        {messagesTrimmed && (
          <div className="text-center text-xs text-muted-foreground py-2">
            <button 
              className="text-blue-500 hover:underline" 
              onClick={() => {
                // When clicked, route to the chat page with the chat ID
                window.location.href = `/chat/${chatId}`;
              }}
            >
              {messages.length - VIRTUALIZATION_THRESHOLD} earlier messages hidden. Click to view full conversation.
            </button>
          </div>
        )}
      
        {messagesToRender.map((message, index) => {
          // Calculate the actual index in the full message array
          const actualIndex = messagesTrimmed 
            ? messages.length - VIRTUALIZATION_THRESHOLD + index 
            : index;
            
          // Is this the last message and is it streaming?
          const isLastAndStreaming = status === 'streaming' && messages.length - 1 === actualIndex;
          
          return (
            <div
              key={message.id}
              className="transition-opacity duration-300 ease-in-out"
            >
              <PreviewMessage
                chatId={chatId}
                message={message}
                isLoading={isLastAndStreaming}
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
          );
        })}

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
  // Special case: if both have artifact visible, no need to re-render
  if (prevProps.isArtifactVisible && nextProps.isArtifactVisible) return true;

  // Fast change detection for status changes
  if (prevProps.status !== nextProps.status) return false;
  
  // Messages length is a quick check before the deep equal
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  
  // Only do expensive deep equals if absolutely necessary
  // For large message arrays, this can be very expensive
  // Only check the last message if the counts are the same
  if (prevProps.messages.length > 0 && !equal(
    prevProps.messages[prevProps.messages.length - 1],
    nextProps.messages[nextProps.messages.length - 1]
  )) {
    return false;
  }
  
  // Check votes only if they're loaded
  if (prevProps.votes && nextProps.votes && !equal(prevProps.votes, nextProps.votes)) {
    return false;
  }

  // Otherwise, no need to re-render
  return true;
});

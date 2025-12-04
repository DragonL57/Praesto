'use client';

import type { Attachment, UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useState, useRef, useMemo } from 'react';
import useSWR from 'swr';
import { fetcher, generateUUID } from '@/lib/utils';
import { Messages } from '../messages/messages';
import type { VisibilityType } from '../visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { toast } from 'sonner';
import { SharedChatHeader } from './shared-chat-header';
import { SharedArtifact } from './shared-artifact';
import type { Vote } from '@/lib/db/schema';
import type {
  SetMessagesFunction,
  AppendFunction,
  ChatStatus,
} from '@/lib/ai/types';

export function SharedChat({
  id,
  initialMessages,
  selectedChatModel,
  _selectedVisibilityType,
  isReadonly,
}: {
  id: string;
  initialMessages: Array<UIMessage>;
  selectedChatModel: string;
  _selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  // Create refs for message container and end element
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    status,
    stop,
    reload,
  } = useChat({
    id,
    body: {
      id,
      selectedChatModel: selectedChatModel,
      userTimeContext: {
        date: new Date().toDateString(),
        time: new Date().toTimeString().split(' ')[0],
        dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    },
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onError: () => {
      toast.error('An error occurred, please try again!');
    },
  });

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  // Wrap setMessages to match custom type
  const wrappedSetMessages = useMemo<SetMessagesFunction>(
    () => (msgs) => {
      // Cast through unknown to avoid direct type incompatibility
      setMessages(msgs as unknown as Parameters<typeof setMessages>[0]);
    },
    [setMessages],
  );

  // Wrap append to match custom type
  const wrappedAppend = useMemo<AppendFunction>(
    () => async (message) => {
      return append(message as unknown as Parameters<typeof append>[0]);
    },
    [append],
  );

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background w-full">
        <SharedChatHeader />

        <div className="flex-1 overflow-hidden relative w-full">
          <Messages
            chatId={id}
            status={status as ChatStatus}
            votes={votes}
            messages={messages}
            setMessages={wrappedSetMessages}
            reload={reload}
            append={wrappedAppend}
            isReadonly={isReadonly}
            isArtifactVisible={isArtifactVisible}
            messagesContainerRef={messagesContainerRef}
            messagesEndRef={messagesEndRef}
          />
        </div>
      </div>

      <SharedArtifact
        chatId={id}
        _input={input}
        _setInput={setInput}
        _handleSubmit={handleSubmit}
        status={status as ChatStatus}
        stop={stop}
        _attachments={attachments}
        _setAttachments={setAttachments}
        append={wrappedAppend}
        messages={messages}
        setMessages={wrappedSetMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
      />
    </>
  );
}

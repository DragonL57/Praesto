'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useMemo, useRef } from 'react';
import { toast } from 'sonner';

import type { ChatStatus, SetMessagesFunction } from '@/lib/ai/types';
import { generateUUID } from '@/lib/utils';
import { Messages } from '../messages/messages';
import type { VisibilityType } from '../visibility-selector';
import { SharedChatHeader } from './shared-chat-header';

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

  const { messages, setMessages, status } = useChat({
    id,
    transport: new DefaultChatTransport({
      api: '/api/chat/chat',
      body: {
        id,
        selectedChatModel: selectedChatModel,
        userTimeContext: {
          date: new Date().toDateString(),
          time: new Date().toTimeString().split(' ')[0],
          dayOfWeek: new Date().toLocaleDateString('en-US', {
            weekday: 'long',
          }),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
    }),
    messages: initialMessages,
    generateId: generateUUID,
    onError: () => {
      toast.error('An error occurred, please try again!');
    },
  });

  // Wrap setMessages to match custom type
  const wrappedSetMessages = useMemo<SetMessagesFunction>(
    () => (msgs) => {
      // Cast through unknown to avoid direct type incompatibility
      setMessages(msgs as unknown as Parameters<typeof setMessages>[0]);
    },
    [setMessages],
  );

  // Empty implementations for required props
  const reload = async (): Promise<string | null | undefined> => null;
  const append = async (): Promise<string | null | undefined> => null;

  return (
    <div className="flex flex-col min-w-0 h-dvh bg-background w-full">
      <SharedChatHeader />

      <div className="flex-1 overflow-hidden relative w-full">
        <Messages
          chatId={id}
          status={status as ChatStatus}
          messages={messages}
          setMessages={wrappedSetMessages}
          reload={reload}
          append={append}
          isReadonly={isReadonly}
          isArtifactVisible={false}
          messagesContainerRef={messagesContainerRef}
          messagesEndRef={messagesEndRef}
        />
      </div>
    </div>
  );
}

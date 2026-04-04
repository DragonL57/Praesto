'use client';

import { useRef } from 'react';

import type { Message, ChatStatus } from '@/lib/ai/types';
import { usePraestoChat } from '@/hooks/use-praesto-chat';
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
  initialMessages: Array<Message>;
  selectedChatModel: string;
  _selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  // Create refs for message container and end element
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, setMessages, status, reload, append } = usePraestoChat({
    id,
    initialMessages,
    body: {
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
  });

  return (
    <div className="flex flex-col min-w-0 h-dvh bg-background w-full">
      <SharedChatHeader />

      <div className="flex-1 overflow-hidden relative w-full">
        <Messages
          chatId={id}
          status={status as ChatStatus}
          messages={messages}
          setMessages={setMessages}
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


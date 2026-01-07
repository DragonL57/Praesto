'use client';

import { DefaultChatTransport, type UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { unstable_serialize } from 'swr/infinite';
import { useLocalStorage } from 'usehooks-ts';
import { toast } from 'sonner';

import { ChatHeader } from '@/components/chat-header';
import { InputSkeleton, MultimodalInput } from './multimodal-input';
import { Messages } from './messages/messages';
import { getChatHistoryPaginationKey } from '@/components/sidebar';
import { DEFAULT_CHAT_MODEL_ID } from '@/lib/ai/providers';
import { fetcher, generateUUID } from '@/lib/utils';

import type {
  AppendFunction,
  Attachment,
  SetMessagesFunction,
} from '@/lib/ai/types';
import type { Vote } from '@/lib/db/schema';
import type { VisibilityType } from './visibility-selector';

export function Chat({
  id,
  initialMessages,
  selectedChatModel: initialSelectedChatModelFromServer,
  selectedVisibilityType,
  isReadonly,
}: {
  id: string;
  initialMessages: Array<UIMessage>;
  selectedChatModel: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const { mutate } = useSWRConfig();

  const [globallySelectedModelId, setGloballySelectedModelId] = useLocalStorage(
    'chat-model',
    () => initialSelectedChatModelFromServer || DEFAULT_CHAT_MODEL_ID,
  );

  useEffect(() => {
    if (
      initialSelectedChatModelFromServer &&
      initialSelectedChatModelFromServer !== globallySelectedModelId
    ) {
      setGloballySelectedModelId(initialSelectedChatModelFromServer);
    }
  }, [
    initialSelectedChatModelFromServer,
    globallySelectedModelId,
    setGloballySelectedModelId,
  ]);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Manage input state manually (AI SDK 5.x change)
  const [input, setInput] = useState('');

  const chatHelpers = useChat({
    id,

    transport: new DefaultChatTransport({
      api: '/api/chat/chat',
      body: {
        id,
        selectedChatModel: globallySelectedModelId,
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

    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },

    onError: (error) => {
      console.error('[Chat Component useChat onError]', error);
      toast.error(
        'An error occurred, please try again! Check the browser console for more details.',
      );
    },
  });

  // Extract and type-cast helpers for component compatibility
  const {
    messages: rawMessages,
    setMessages: rawSetMessages,
    sendMessage,
    status,
    stop,
    regenerate,
  } = chatHelpers;

  // Create handleSubmit wrapper for compatibility
  const _handleSubmit = (e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.();
    if (input.trim()) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  // Create reload wrapper for compatibility
  const reload = async (): Promise<string | null | undefined> => {
    await regenerate();
    return null;
  };

  // Ensure messages have the required parts field for UIMessage compatibility
  const messages = useMemo(
    () =>
      rawMessages.map((msg) => ({
        ...msg,
        parts: msg.parts ?? [],
      })) as UIMessage[],
    [rawMessages],
  );

  // Type-safe setMessages wrapper with useMemo to create stable reference
  const setMessages = useMemo<SetMessagesFunction>(
    () =>
      (
        messagesOrUpdater:
          | UIMessage[]
          | ((messages: UIMessage[]) => UIMessage[]),
      ) => {
        if (typeof messagesOrUpdater === 'function') {
          rawSetMessages((prev) =>
            messagesOrUpdater(
              prev.map((m) => ({
                ...m,
                parts: m.parts ?? [],
              })) as UIMessage[],
            ),
          );
        } else {
          rawSetMessages(messagesOrUpdater);
        }
      },
    [rawSetMessages],
  );

  // Type-safe append wrapper with useMemo
  const append = useMemo<AppendFunction>(
    () =>
      async (message: {
        role: 'user' | 'assistant';
        content: string;
      }): Promise<string | null | undefined> => {
        await sendMessage({ text: message.content });
        return null;
      },
    [sendMessage],
  );

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);

  return (
    <div className="flex flex-col min-w-0 h-dvh bg-background w-full">
      <ChatHeader
        chatId={id}
        selectedModelId={globallySelectedModelId}
        selectedVisibilityType={selectedVisibilityType}
        isReadonly={isReadonly}
      />

      <div
        className={`flex-1 flex flex-col ${messages.length === 0 ? 'justify-center' : 'justify-between'}`}
      >
        <div
          className={`overflow-hidden relative w-full ${messages.length > 0 ? 'flex-1' : ''}`}
        >
          <Messages
            chatId={id}
            status={status}
            votes={votes}
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

        <div className={`shrink-0 ${messages.length === 0 ? 'pb-[15vh]' : ''}`}>
          <form className="flex flex-col mx-auto px-4 bg-background pb-0 w-full md:max-w-3xl relative">
            {!isReadonly && (
              <MultimodalInput
                chatId={id}
                input={input}
                setInput={setInput}
                sendMessage={sendMessage}
                status={status}
                stop={stop}
                attachments={attachments}
                setAttachments={setAttachments}
                messages={messages}
                setMessages={setMessages}
                append={append}
                messagesContainerRef={messagesContainerRef}
                messagesEndRef={messagesEndRef}
              />
            )}
            {isReadonly && <InputSkeleton />}
          </form>
          {messages.length > 0 && (
            <div className="text-center text-xs text-white-500 mt-0">
              UniTaskAI can make mistake, double-check the info
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

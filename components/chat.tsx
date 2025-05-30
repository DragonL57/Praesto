'use client';

import type { Attachment, Message as UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useLocalStorage } from 'usehooks-ts';
import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, generateUUID } from '@/lib/utils';
import { Artifact } from './artifact';
import { MultimodalInput, InputSkeleton } from './multimodal-input';
import { Messages } from './messages/messages';
import type { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { toast } from 'sonner';
import { unstable_serialize } from 'swr/infinite';
import { getChatHistoryPaginationKey } from '@/components/sidebar';
import { DEFAULT_CHAT_MODEL_ID } from '@/lib/ai/models';

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
    () => initialSelectedChatModelFromServer || DEFAULT_CHAT_MODEL_ID
  );

  useEffect(() => {
    if (initialSelectedChatModelFromServer && initialSelectedChatModelFromServer !== globallySelectedModelId) {
      setGloballySelectedModelId(initialSelectedChatModelFromServer);
    }
  }, [initialSelectedChatModelFromServer, globallySelectedModelId, setGloballySelectedModelId]);

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
      selectedChatModel: globallySelectedModelId,
      userTimeContext: {
        date: new Date().toDateString(),
        time: new Date().toTimeString().split(' ')[0],
        dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    },
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      console.error('[Chat Component useChat onError]', error);
      toast.error('An error occurred, please try again! Check the browser console for more details.');
    },
  });

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background w-full">
        <ChatHeader
          chatId={id}
          selectedModelId={globallySelectedModelId}
          selectedVisibilityType={selectedVisibilityType}
          isReadonly={isReadonly}
        />

        <div className={`flex-1 flex flex-col ${messages.length === 0 ? 'justify-center' : 'justify-between'}`}>
          <div className={`overflow-hidden relative w-full ${messages.length > 0 ? 'flex-1' : ''}`}>
            <Messages
              chatId={id}
              status={status}
              votes={votes}
              messages={messages}
              setMessages={setMessages}
              reload={reload}
              append={append}
              isReadonly={isReadonly}
              isArtifactVisible={isArtifactVisible}
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
                  handleSubmit={handleSubmit}
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

      <Artifact
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        append={append}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        votes={votes}
        isReadonly={isReadonly}
        isPanelVisible={isArtifactVisible}
      />
    </>
  );
}

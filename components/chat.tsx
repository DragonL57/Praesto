'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useSWRConfig } from 'swr';
import { unstable_serialize } from 'swr/infinite';
import { useLocalStorage } from 'usehooks-ts';
import { toast } from 'sonner';

import { ChatHeader } from '@/components/chat-header';
import { InputSkeleton, MultimodalInput } from './multimodal-input';
import { Messages } from './messages/messages';
import { ThinkingSidebar } from './messages/ThinkingSidebar';
import { ThinkingProvider, useThinking } from '@/lib/contexts/thinking';
import { buildThinkingItems } from './messages/MessageThinkingTrigger';
import { useOrderedMessageParts } from './messages/message-hooks';
import { getChatHistoryPaginationKey } from '@/components/sidebar';
import { DEFAULT_CHAT_MODEL_ID } from '@/lib/ai/models';
import { buildUserTimeContext } from '@/lib/ai/context';
import { usePraestoChat } from '@/hooks/use-praesto-chat';

import type { Message, Attachment, ChatStatus } from '@/lib/ai/types';
import type { VisibilityType } from './visibility-selector';

interface Suggestion {
  title: string;
  label: string;
  action: string;
}

export function Chat({
  id,
  initialMessages = [],
  selectedChatModel: initialSelectedChatModelFromServer,
  selectedVisibilityType,
  isReadonly,
}: {
  id: string;
  initialMessages?: Array<Message>;
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

  // State for suggestions
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // State for council mode
  const [councilMode, setCouncilMode] = useState(true);

  const {
    messages,
    setMessages,
    input,
    setInput,
    append,
    reload,
    stop,
    status,
    sendMessage,
  } = usePraestoChat({
    id,
    initialMessages,
    body: {
      selectedChatModel: globallySelectedModelId,
      userTimeContext: buildUserTimeContext(),
      councilMode,
    },
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      console.error('[Chat Component usePraestoChat onError]', error);
      toast.error(
        'An error occurred, please try again! Check the browser console for more details.',
      );
    },
  });

  // Track which message ID we last fetched suggestions for
  const lastFetchedSuggestionsMessageIdRef = useRef<string | null>(null);

  // Fetch suggestions when status changes from streaming to ready
  const prevStatusRef = useRef<ChatStatus>(status);
  useEffect(() => {
    let isMounted = true;

    const fetchSuggestions = async () => {
      const lastMessage = messages[messages.length - 1];
      const isTransitioningToReady =
        prevStatusRef.current === 'streaming' && status === 'ready';

      if (
        !isReadonly &&
        isTransitioningToReady &&
        lastMessage &&
        lastMessage.role === 'assistant' &&
        lastMessage.id !== lastFetchedSuggestionsMessageIdRef.current
      ) {
        setSuggestionsLoading(true);
        lastFetchedSuggestionsMessageIdRef.current = lastMessage.id;

        try {
          const response = await fetch('/api/chat/generate-suggestions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messages }),
          });

          if (!isMounted) return;

          if (response.ok) {
            const newSuggestions = await response.json();
            if (Array.isArray(newSuggestions) && newSuggestions.length > 0) {
              setSuggestions(newSuggestions);
            } else {
              setSuggestions([]);
            }
          } else {
            setSuggestions([]);
          }
        } catch (error) {
          console.error('[Chat] Failed to fetch suggestions:', error);
          if (isMounted) setSuggestions([]);
        } finally {
          if (isMounted) setSuggestionsLoading(false);
        }
      }
    };

    fetchSuggestions();
    prevStatusRef.current = status;

    return () => {
      isMounted = false;
    };
  }, [status, messages, isReadonly]);

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);

  // Wrap the hook's sendMessage to match the UI components' expected signature
  const sendMessageForUI = async (args: {
    text: string;
    attachments?: Attachment[];
  }) => {
    if (args.attachments && args.attachments.length > 0) {
      const parts = [
        { type: 'text', text: args.text },
        ...args.attachments.map((a) => ({
          type: 'file',
          url: a.url,
          filename: a.name,
          contentType: a.contentType,
        })),
      ];
      await append({ role: 'user', parts });
    } else {
      await sendMessage({ text: args.text });
    }
  };
  return (
    <ThinkingProvider>
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
              messages={messages}
              setMessages={setMessages}
              reload={reload}
              append={append}
              isReadonly={isReadonly}
              isArtifactVisible={false}
              messagesContainerRef={messagesContainerRef}
              messagesEndRef={messagesEndRef}
              suggestions={suggestions}
              suggestionsLoading={suggestionsLoading}
              sendMessage={sendMessageForUI}
            />
          </div>

          <div
            className={`shrink-0 ${messages.length === 0 ? 'pb-[15vh]' : ''}`}
          >
            <div className="flex flex-col mx-auto px-4 bg-background pb-0 w-full md:max-w-3xl relative">
              {!isReadonly && (
                <MultimodalInput
                  chatId={id}
                  input={input}
                  setInput={setInput}
                  sendMessage={sendMessageForUI}
                  status={status}
                  stop={stop}
                  attachments={attachments}
                  setAttachments={setAttachments}
                  messages={messages}
                  setMessages={setMessages}
                  append={append}
                  messagesContainerRef={messagesContainerRef}
                  messagesEndRef={messagesEndRef}
                  councilMode={councilMode}
                  onCouncilModeChange={setCouncilMode}
                />
              )}
              {isReadonly && <InputSkeleton />}
            </div>
            {messages.length > 0 && (
              <div className="text-center text-xs text-white-500 mt-0">
                UniTaskAI can make mistake, double-check the info
              </div>
            )}
          </div>
        </div>
        <ThinkingSidebarWrapper messages={messages} />
      </div>
    </ThinkingProvider>
  );
}

function ThinkingSidebarWrapper({ messages }: { messages: Array<Message> }) {
  const { isSynthesizing, isOpen, close } = useThinking();

  // Build items from the latest assistant message reactively
  const latestAssistantMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        return messages[i];
      }
    }
    return null;
  }, [messages]);

  const { orderedParts } = useOrderedMessageParts(
    latestAssistantMessage ||
      ({ role: 'assistant', parts: [], id: '' } as unknown as Message),
  );

  const items = useMemo(() => {
    if (!latestAssistantMessage) return [];
    return buildThinkingItems(latestAssistantMessage, orderedParts);
  }, [latestAssistantMessage, orderedParts]);

  if (!isOpen) return null;
  return (
    <ThinkingSidebar
      items={items}
      isSynthesizing={isSynthesizing}
      onClose={close}
    />
  );
}

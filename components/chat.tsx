'use client';

import type { Attachment, UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useLocalStorage } from 'usehooks-ts';
import { ChatHeader } from '@/components/chat-header';
import type { Vote } from '@/lib/db/schema';
import { fetcher, generateUUID } from '@/lib/utils';
import { DEFAULT_PERSONA_ID } from '@/lib/ai/personas';
import { Artifact } from './artifact';
import { MultimodalInput } from './multimodal-input';
import { Messages } from './messages/messages';
import type { VisibilityType } from './visibility-selector';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { toast } from 'sonner';
import { unstable_serialize } from 'swr/infinite';
import { getChatHistoryPaginationKey } from './sidebar-history';

export function Chat({
  id,
  initialMessages,
  selectedChatModel,
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

  // Get the selected persona from localStorage
  const [selectedPersonaId] = useLocalStorage('selected-persona-id', DEFAULT_PERSONA_ID);
  // Track when persona changes to avoid unnecessary reloads
  const [prevPersonaId, setPrevPersonaId] = useState(selectedPersonaId);
  
  // Track the model separately to avoid re-initializing the chat when the model changes
  const [currentModel, setCurrentModel] = useLocalStorage('current-chat-model', selectedChatModel);
  const [prevModel, setPrevModel] = useState(currentModel);

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
      selectedChatModel: currentModel, // Use our tracked model instead of the prop
      personaId: selectedPersonaId, // Send the selected persona ID to the API
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
    onError: () => {
      toast.error('An error occurred, please try again!');
    },
  });

  // Update currentModel when selectedChatModel changes from props
  useEffect(() => {
    if (selectedChatModel !== currentModel) {
      setCurrentModel(selectedChatModel);
    }
  }, [selectedChatModel, currentModel, setCurrentModel]);

  // Handle model changes similar to persona changes
  useEffect(() => {
    // Only reload if model changed AND we have messages AND we're not currently generating
    if (currentModel !== prevModel && messages.length > 0 && status === 'ready') {
      // Save the new model ID to prevent duplicate reloads
      setPrevModel(currentModel);
      
      // Wait a bit before reloading to avoid race conditions
      const timeoutId = setTimeout(() => {
        reload();
      }, 300);
      
      return () => clearTimeout(timeoutId);
    } else if (currentModel !== prevModel) {
      // Update the model without reloading if we don't have messages yet or are busy
      setPrevModel(currentModel);
    }
  }, [currentModel, prevModel, reload, messages.length, status]);

  // Much safer approach to handling persona changes - only reload when necessary
  // and only when the chat is idle (status === 'ready')
  useEffect(() => {
    // Only reload if persona changed AND we have messages AND we're not currently in the middle of generating
    if (selectedPersonaId !== prevPersonaId && messages.length > 0 && status === 'ready') {
      // Save the new persona ID to prevent duplicate reloads
      setPrevPersonaId(selectedPersonaId);
      
      // Wait a bit before reloading to avoid race conditions
      const timeoutId = setTimeout(() => {
        reload();
      }, 300);
      
      return () => clearTimeout(timeoutId);
    } else if (selectedPersonaId !== prevPersonaId) {
      // Update the ID without reloading if we don't have messages yet or are busy
      setPrevPersonaId(selectedPersonaId);
    }
  }, [selectedPersonaId, prevPersonaId, reload, messages.length, status]);

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  return (
    <>
      <div className="flex flex-col min-w-0 h-dvh bg-background w-full">
        <ChatHeader
          chatId={id}
          selectedModelId={selectedChatModel}
          selectedVisibilityType={selectedVisibilityType}
          isReadonly={isReadonly}
        />

        <div className="flex-1 overflow-hidden relative w-full">
          <Messages
            chatId={id}
            status={status}
            votes={votes}
            messages={messages}
            setMessages={setMessages}
            reload={reload}
            isReadonly={isReadonly}
            isArtifactVisible={isArtifactVisible}
            messagesContainerRef={messagesContainerRef}
            messagesEndRef={messagesEndRef}
          />
        </div>

        <div className="shrink-0">
          <form className="flex flex-col mx-auto px-4 bg-background pb-0 w-full md:max-w-3xl relative">
            {/* Input component */}
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
          </form>
          <div className="text-center text-xs text-gray-500 mt-0">
            UniTaskAI can make mistake, double-check the info
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
      />
    </>
  );
}
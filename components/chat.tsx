'use client';

import type { Attachment, Message as UIMessage } from 'ai';
import { useChat } from '@ai-sdk/react';
import { useState, useRef, useEffect, useMemo, memo } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useLocalStorage } from 'usehooks-ts';
import { useModelStorage } from '@/hooks/use-model-storage';
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

// Optimize renders by memoizing input component
const MemoizedMultimodalInput = memo(MultimodalInput);

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
  const [currentModel, setCurrentModel] = useModelStorage('current-chat-model', selectedChatModel);
  const [prevModel, setPrevModel] = useState(currentModel);

  // Create refs for message container and end element
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Memoize static values to prevent unnecessary re-renders
  const userTimeContext = useMemo(() => ({
    date: new Date().toDateString(),
    time: new Date().toTimeString().split(' ')[0],
    dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  }), []);

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
      selectedChatModel: currentModel,
      personaId: selectedPersonaId,
      userTimeContext
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

  // Update currentModel when selectedChatModel changes from props
  useEffect(() => {
    if (selectedChatModel !== currentModel) {
      setCurrentModel(selectedChatModel);
    }
  }, [selectedChatModel, currentModel, setCurrentModel]);

  // Combine model and persona change handlers into one optimized useEffect
  useEffect(() => {
    // Only take action if something changed and we're not already processing
    const modelChanged = currentModel !== prevModel;
    const personaChanged = selectedPersonaId !== prevPersonaId;
    
    if (!modelChanged && !personaChanged) return;
    
    // Always update the tracking variables to prevent redundant processing
    if (modelChanged) setPrevModel(currentModel);
    if (personaChanged) setPrevPersonaId(selectedPersonaId);
    
    // Only reload if we have messages and we're in ready state
    if (messages.length > 0 && status === 'ready') {
      const timeoutId = setTimeout(() => {
        reload();
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [currentModel, prevModel, selectedPersonaId, prevPersonaId, reload, messages.length, status]);

  // Only fetch votes when really needed - memoize the SWR key
  const votesKey = useMemo(() => 
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null
  , [messages.length, id]);
  
  const { data: votes } = useSWR<Array<Vote>>(votesKey, fetcher, {
    revalidateOnFocus: false, // Prevent unnecessary fetches when window regains focus
    revalidateIfStale: false
  });

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  return (
    <div className="contents">
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
          {!isReadonly && (
            <form className="flex flex-col mx-auto px-4 bg-background pb-0 w-full md:max-w-3xl relative">
              <MemoizedMultimodalInput
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
            </form>
          )}
          <div className="text-center text-xs text-white-500 mt-0">
            UniTaskAI can make mistake, double-check the info
          </div>
        </div>
      </div>

      {/* Only render the Artifact component when it's actually needed */}
      {isArtifactVisible && (
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
      )}
    </div>
  );
}
'use client';

import { useState, useCallback, useRef } from 'react';
import type { Message, ChatStatus, ChatRequestOptions, MessagePart } from '@/lib/ai/types';
import { generateUUID } from '@/lib/utils';
import { StreamProtocol } from '@/lib/ai/chat/stream-protocol';

interface UsePraestoChatProps {
  id: string;
  initialMessages?: Message[];
  body?: any;
  onFinish?: (message: Message) => void;
  onError?: (error: Error) => void;
}

/**
 * usePraestoChat
 * A custom hook to manage the chat state and handle the streaming response 
 * from the Praesto Chat API.
 */
export function usePraestoChat({
  id,
  initialMessages = [],
  body,
  onFinish,
  onError,
}: UsePraestoChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<ChatStatus>('ready');

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Stop the current generation
   */
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus('ready');
    setIsLoading(false);
  }, []);

  /**
   * Core function to append a new message and trigger the API
   */
  const append = useCallback(
    async (
      {
        role,
        parts,
        id: existingId,
        createdAt: existingCreatedAt
      }: {
        role: 'user' | 'assistant';
        parts: MessagePart[];
        id?: string;
        createdAt?: Date
      },
      options?: ChatRequestOptions
    ) => {
      const userMessageId = existingId || generateUUID();
      const assistantMessageId = generateUUID();

      const userMessage: Message = {
        id: userMessageId,
        role,
        parts,
        createdAt: existingCreatedAt || new Date(),
      };

      // 1. Update UI with user message immediately
      // If it's an existing ID, we replace the last message, otherwise append
      setMessages((prev) => {
        const lastIdx = prev.findIndex(m => m.id === userMessageId);
        if (lastIdx !== -1) {
          const newMessages = [...prev];
          newMessages[lastIdx] = userMessage;
          return newMessages;
        }
        return [...prev, userMessage];
      });

      setStatus('submitted');
      setIsLoading(true);

      // Create AbortController for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      let result: string | null | undefined;
      try {
        // ... (fetch logic remains same but sends updated messages)
        const currentMessages = [...messages];
        const existingIdx = currentMessages.findIndex(m => m.id === userMessageId);

        let messagesToSend: Message[];
        if (existingIdx !== -1) {
          // Truncate everything after the target message
          messagesToSend = [...currentMessages.slice(0, existingIdx), userMessage];
        } else {
          messagesToSend = [...currentMessages, userMessage];
        }

        const response = await fetch('/api/chat/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
          body: JSON.stringify({
            id,
            messages: messagesToSend,
            ...body,
            ...options?.body,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Failed to fetch response');
        }

        if (!response.body) {
          throw new Error('Response body is empty');
        }

        // 3. Handle the streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessageParts: MessagePart[] = [];
        let done = false;

        setStatus('streaming');

        // Create the initial assistant message in UI
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: 'assistant',
            parts: [],
            createdAt: new Date(),
          },
        ]);

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              const part = StreamProtocol.parse(line);
              if (!part) continue;

              const { type, data } = part;

              // Handle different stream part types
              if (type === 'text') {
                assistantMessageParts = updateOrAddTextPart(assistantMessageParts, data);
              } else if (type === 'reasoning') {
                assistantMessageParts = updateOrAddReasoningPart(assistantMessageParts, data);
              } else if (type === 'tool-call') {
                assistantMessageParts.push({
                  type: 'tool-call',
                  toolCallId: data.toolCallId,
                  toolName: data.toolName,
                  args: data.args,
                  state: 'input-available',
                } as any);
              } else if (type === 'tool-result') {
                assistantMessageParts.push({
                  type: 'tool-result',
                  toolCallId: data.toolCallId,
                  toolName: data.toolName,
                  result: data.result,
                  state: 'output-available',
                } as any);
              } else if (type === 'error') {
                throw new Error(data || 'Stream Error');
              } else if (type === 'metadata') {
                console.log('[usePraestoChat] Received metadata:', data);
                if (data.title && onFinish) {
                  // If we got a title, it's a new chat, we might want to trigger a refresh
                  // We can't easily trigger the SWR mutate here without access to it, 
                  // but we can at least log it or handle it if we add a dedicated callback.
                }
              }

              // Update the assistant message in state
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastIdx = newMessages.length - 1;
                if (newMessages[lastIdx].id === assistantMessageId) {
                  newMessages[lastIdx] = {
                    ...newMessages[lastIdx],
                    parts: [...assistantMessageParts],
                  };
                }
                return newMessages;
              });
            }
          }
        }

        // 4. Wrap up
        const finalAssistantMessage: Message = {
          id: assistantMessageId,
          role: 'assistant',
          parts: assistantMessageParts,
          createdAt: new Date(),
        };

        if (onFinish) {
          onFinish(finalAssistantMessage);
        }
        result = assistantMessageId;

      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.log('Fetch aborted');
        } else {
          console.error('[usePraestoChat Error]', error);
          setStatus('error');
          if (onError) onError(error);
        }
        result = null;
      } finally {
        setIsLoading(false);
        setStatus((prev) => (prev === 'streaming' || prev === 'submitted' ? 'ready' : prev));
        abortControllerRef.current = null;
      }
      return result;
    },
    [id, messages, body, onFinish, onError]
  );

  /**
   * Send a simple text message
   */
  const sendMessage = useCallback(
    async ({ text }: { text: string }) => {
      const parts: MessagePart[] = [{ type: 'text', text }];
      return await append({ role: 'user', parts });
    },
    [append]
  );

  /**
   * Reload the last user message
   */
  const reload = useCallback(async () => {
    const lastUserMessageIdx = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserMessageIdx === -1) return;

    const actualIdx = messages.length - 1 - lastUserMessageIdx;
    const lastUserMessage = messages[actualIdx];

    // Truncate the UI state to just before this message
    // (append will handle replacing/updating the message itself)
    setMessages((prev) => prev.slice(0, actualIdx));

    return await append({
      role: 'user',
      parts: lastUserMessage.parts,
      id: lastUserMessage.id,
      createdAt: lastUserMessage.createdAt,
    });
  }, [messages, append]);

  return {
    messages,
    setMessages,
    input,
    setInput,
    append,
    reload,
    stop,
    status,
    isLoading,
    sendMessage,
  };
}

// Helper: Update or add a text part in the parts array
function updateOrAddTextPart(parts: MessagePart[], text: string): MessagePart[] {
  const lastPart = parts.length > 0 ? parts[parts.length - 1] : null;
  if (lastPart && lastPart.type === 'text') {
    (lastPart as any).text += text;
    return [...parts];
  }
  return [...parts, { type: 'text', text }];
}

// Helper: Update or add a reasoning part in the parts array
function updateOrAddReasoningPart(parts: MessagePart[], text: string): MessagePart[] {
  const lastPart = parts.length > 0 ? parts[parts.length - 1] : null;
  if (lastPart && lastPart.type === 'reasoning') {
    (lastPart as any).text += text;
    return [...parts];
  }
  return [...parts, { type: 'reasoning', text }];
}

'use client';

import { useState, useCallback, useRef } from 'react';
import type { Message, ChatStatus, ChatRequestOptions, MessagePart } from '@/lib/ai/types';
import { generateUUID } from '@/lib/utils';
import { StreamProtocol } from '@/lib/ai/chat/stream-protocol';

interface UsePraestoChatProps {
  id: string;
  initialMessages?: Message[];
  body?: unknown;
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

        const mergedBody: Record<string, unknown> = {
          id,
          messages: messagesToSend,
          ...(typeof body === 'object' && body ? (body as Record<string, unknown>) : {}),
          ...(typeof options?.body === 'object' && options?.body ? (options.body as Record<string, unknown>) : {}),
        };

        const response = await fetch('/api/chat/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
          body: JSON.stringify(mergedBody),
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
        let buffer = '';

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

        while (true) {
          const { value, done: readerDone } = await reader.read();
          
          if (value) {
            buffer += decoder.decode(value, { stream: true });
          }

          const lines = buffer.split('\n');
          // Keep the last partial line in the buffer
          buffer = lines.pop() || '';

          if (lines.length > 0) {
            for (const line of lines) {
              if (!line.trim()) continue;
              const part = StreamProtocol.parse(line);
              if (!part) continue;

              const { type, data } = part;

              // Handle different stream part types with runtime type checks
              if (type === 'text') {
                const textValue = typeof data === 'string' ? data : (data as Record<string, unknown>)?.text;
                if (typeof textValue === 'string') {
                  assistantMessageParts = updateOrAddTextPart([...assistantMessageParts], textValue);
                }
              } else if (type === 'reasoning') {
                const reasoningValue = typeof data === 'string' ? data : (data as Record<string, unknown>)?.text;
                if (typeof reasoningValue === 'string') {
                  assistantMessageParts = updateOrAddReasoningPart([...assistantMessageParts], reasoningValue);
                }
              } else if (type === 'tool-call') {
                if (typeof data === 'object' && data) {
                  const d = data as Record<string, unknown>;
                  const toolCallId = typeof d.toolCallId === 'string' ? d.toolCallId : generateUUID();
                  const toolName = typeof d.toolName === 'string' ? d.toolName : 'unknown';
                  const args = (d.args as Record<string, unknown> | undefined) ?? {};
                  assistantMessageParts = [...assistantMessageParts, {
                    type: 'tool-call',
                    toolCallId,
                    toolName,
                    args,
                  }];
                }
              } else if (type === 'tool-result') {
                if (typeof data === 'object' && data) {
                  const d = data as Record<string, unknown>;
                  const toolCallId = typeof d.toolCallId === 'string' ? d.toolCallId : generateUUID();
                  const toolName = typeof d.toolName === 'string' ? d.toolName : 'unknown';
                  const resultValue = d.result as unknown;
                  assistantMessageParts = [...assistantMessageParts, {
                    type: 'tool-result',
                    toolCallId,
                    toolName,
                    result: resultValue,
                  }];
                }
              } else if (type === 'error') {
                const errMsg = typeof data === 'string'
                  ? data
                  : (typeof data === 'object' && data
                    ? (typeof (data as Record<string, unknown>).message === 'string' ? (data as Record<string, unknown>).message : 'Stream Error')
                    : 'Stream Error');
                throw new Error(String(errMsg));
              } else if (type === 'metadata') {
                console.log('[usePraestoChat] Received metadata:', data);
              }

              // Update state for EVERY line to ensure immediate streaming
              const currentParts = [...assistantMessageParts];
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastIdx = newMessages.length - 1;
                if (lastIdx >= 0 && newMessages[lastIdx].id === assistantMessageId) {
                  newMessages[lastIdx] = {
                    ...newMessages[lastIdx],
                    parts: currentParts,
                  };
                }
                return newMessages;
              });
            }
          }

          if (readerDone) {
            // Process any remaining content in buffer if it's a complete line
            if (buffer.trim()) {
              const part = StreamProtocol.parse(buffer);
              if (part) {
                const { type, data } = part;
                if (type === 'text') {
                   const textValue = typeof data === 'string' ? data : (data as Record<string, unknown>)?.text;
                   if (typeof textValue === 'string') {
                     assistantMessageParts = updateOrAddTextPart([...assistantMessageParts], textValue);
                   }
                } else if (type === 'reasoning') {
                   const reasoningValue = typeof data === 'string' ? data : (data as Record<string, unknown>)?.text;
                   if (typeof reasoningValue === 'string') {
                     assistantMessageParts = updateOrAddReasoningPart([...assistantMessageParts], reasoningValue);
                   }
                }
                // (Other types handled similarly if needed)
                
                const finalParts = [...assistantMessageParts];
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastIdx = newMessages.length - 1;
                  if (lastIdx >= 0 && newMessages[lastIdx].id === assistantMessageId) {
                    newMessages[lastIdx] = { ...newMessages[lastIdx], parts: finalParts };
                  }
                  return newMessages;
                });
              }
            }
            break;
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

      } catch (error: unknown) {
        const err = error as unknown as Record<string, unknown> | Error | undefined;
        const name = err && typeof (err as Record<string, unknown>).name === 'string' ? (err as Record<string, unknown>).name as string : undefined;
        const isAbort = name === 'AbortError';
        if (isAbort) {
          console.log('Fetch aborted');
        } else {
          console.error('[usePraestoChat Error]', error);
          setStatus('error');
          const errObj = error instanceof Error ? error : new Error(String(error));
          if (onError) onError(errObj);
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

// Helper: Update or add a text part in the parts array with a FRESH object reference
function updateOrAddTextPart(parts: MessagePart[], text: string): MessagePart[] {
  const lastIdx = parts.length - 1;
  const lastPart = lastIdx >= 0 ? parts[lastIdx] : null;
  
  if (lastPart && lastPart.type === 'text') {
    const newParts = [...parts];
    newParts[lastIdx] = {
      ...lastPart,
      text: lastPart.text + text,
    } as MessagePart;
    return newParts;
  }
  return [...parts, { type: 'text', text }];
}

// Helper: Update or add a reasoning part in the parts array with a FRESH object reference
function updateOrAddReasoningPart(parts: MessagePart[], text: string): MessagePart[] {
  const lastIdx = parts.length - 1;
  const lastPart = lastIdx >= 0 ? parts[lastIdx] : null;
  
  if (lastPart && lastPart.type === 'reasoning') {
    const newParts = [...parts];
    newParts[lastIdx] = {
      ...lastPart,
      text: lastPart.text + text,
    } as MessagePart;
    return newParts;
  }
  return [...parts, { type: 'reasoning', text }];
}

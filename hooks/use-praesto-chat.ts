'use client';

import { useState, useCallback, useRef } from 'react';
import type { Message, ChatStatus, ChatRequestOptions, MessagePart } from '@/lib/ai/types';
import { generateUUID } from '@/lib/utils';

interface UseChatProps {
  id: string;
  initialMessages?: Message[];
  onFinish?: (message: Message) => void;
  onError?: (error: Error) => void;
  body?: any;
}

export function usePraestoChat({
  id: chatId,
  initialMessages = [],
  onFinish,
  onError,
  body: chatBody = {},
}: UseChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<ChatStatus>('ready');
  const [isLoading, setIsLoading] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus('ready');
    setIsLoading(false);
  }, []);

  const triggerChat = useCallback(async (currentMessages: Message[], options?: ChatRequestOptions) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setStatus('submitted');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        body: JSON.stringify({
          id: chatId,
          messages: currentMessages,
          ...chatBody,
          ...options?.body,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();
      let currentAssistantMessage: Message = {
        id: generateUUID(),
        role: 'assistant',
        parts: [],
      };

      // Helper to update messages state with a new assistant message object
      const syncMessages = (msg: Message) => {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.id === msg.id) {
            return [...prev.slice(0, -1), msg];
          }
          return [...prev, msg];
        });
      };

      setStatus('streaming');
      syncMessages(currentAssistantMessage);

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; 

        for (const line of lines) {
          if (!line.trim()) continue;
          
          const colonIndex = line.indexOf(':');
          if (colonIndex === -1) continue;

          const type = line.substring(0, colonIndex);
          const dataStr = line.substring(colonIndex + 1);
          
          try {
            const data = JSON.parse(dataStr);
            
            if (type === '0') { // Text delta
              const parts = [...currentAssistantMessage.parts];
              const lastPart = parts[parts.length - 1];
              
              if (lastPart?.type === 'text') {
                parts[parts.length - 1] = { ...lastPart, text: lastPart.text + data };
              } else {
                parts.push({ type: 'text', text: data });
              }
              
              currentAssistantMessage = { ...currentAssistantMessage, parts };
              syncMessages(currentAssistantMessage);
            } 
            else if (type === 'h') { // Reasoning delta (new type for backend)
              const parts = [...currentAssistantMessage.parts];
              const lastPart = parts[parts.length - 1];
              
              if (lastPart?.type === 'reasoning') {
                parts[parts.length - 1] = { ...lastPart, text: lastPart.text + data };
              } else {
                parts.push({ type: 'reasoning', text: data });
              }
              
              currentAssistantMessage = { ...currentAssistantMessage, parts };
              syncMessages(currentAssistantMessage);
            }
            else if (type === '9') { // Tool call
              const parts = [...currentAssistantMessage.parts, {
                type: 'tool-call',
                toolCallId: data.toolCallId,
                toolName: data.toolName,
                args: data.args,
                state: 'input-available' // Add state for UI
              } as any];
              
              currentAssistantMessage = { ...currentAssistantMessage, parts };
              syncMessages(currentAssistantMessage);
            }
            else if (type === 'a') { // Tool result
              const parts = [...currentAssistantMessage.parts, {
                type: 'tool-result',
                toolCallId: data.toolCallId,
                toolName: data.toolName,
                result: data.result,
                state: 'output-available' // Add state for UI
              } as any];
              
              currentAssistantMessage = { ...currentAssistantMessage, parts };
              syncMessages(currentAssistantMessage);
            }
            else if (type === 'e') { // Error
              throw new Error(data);
            }
          } catch (e) {
            if (e instanceof Error && e.message === 'AbortError') throw e;
            console.error('Error parsing stream part:', e, line);
          }
        }
      }

      setStatus('ready');
      onFinish?.(currentAssistantMessage);

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Chat error:', err);
      setStatus('error');
      onError?.(err);
    } finally {
      setIsLoading(false);
      setStatus((prevStatus) => 
        (prevStatus === 'streaming' || prevStatus === 'submitted') 
          ? 'ready' 
          : prevStatus
      );
    }
  }, [chatId, chatBody, onFinish, onError]);

  const append = useCallback(async (
    message: { role: 'user' | 'assistant'; parts: MessagePart[] },
    options?: ChatRequestOptions
  ) => {
    const newMessage: Message = {
      id: generateUUID(),
      role: message.role,
      parts: message.parts,
      createdAt: new Date(),
    };

    const newMessages = [...messages, newMessage];
    setMessages(newMessages);
    await triggerChat(newMessages, options);
    return newMessage.id;
  }, [messages, triggerChat]);

  const reload = useCallback(async (options?: ChatRequestOptions) => {
    if (messages.length === 0) return;
    
    const lastUserIndex = [...messages].reverse().findIndex(m => m.role === 'user');
    if (lastUserIndex === -1) return;
    
    const actualIndex = messages.length - 1 - lastUserIndex;
    const truncatedMessages = messages.slice(0, actualIndex + 1);
    
    setMessages(truncatedMessages);
    await triggerChat(truncatedMessages, options);
    return truncatedMessages[truncatedMessages.length - 1].id;
  }, [messages, triggerChat]);

  const sendMessage = useCallback(async ({ text, attachments }: { text: string, attachments?: any[] }) => {
    if (!text.trim() && (!attachments || attachments.length === 0)) return;

    const parts: MessagePart[] = [{ type: 'text', text }];
    if (attachments) {
      attachments.forEach(a => {
        parts.push({ type: 'file', url: a.url, filename: a.name, contentType: a.contentType });
      });
    }

    await append({ role: 'user', parts });
  }, [append]);

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
    sendMessage
  };
}

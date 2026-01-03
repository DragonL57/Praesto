'use client';

import { useChat } from '@ai-sdk/react';
import { useCallback, useEffect, useRef } from 'react';

import type { Suggestion } from '@/lib/db/schema';

export type DataStreamDelta = {
  type:
    | 'text-delta'
    | 'code-delta'
    | 'sheet-delta'
    | 'image-delta'
    | 'title'
    | 'id'
    | 'suggestion'
    | 'clear'
    | 'finish'
    | 'kind';
  content: string | Suggestion;
};

export function DataStreamHandler({ id }: { id: string }) {
  const { messages } = useChat({ id });
  const lastProcessedMessageId = useRef<string | null>(null);
  const lastProcessedPartCount = useRef<number>(0);

  // Process data parts from the message stream
  // AI SDK 5.x: Custom data is now sent as 'data-artifact' type parts in the message
  const processDataParts = useCallback(() => {
    if (!messages?.length) return;

    // Get the last assistant message (which contains streaming data)
    const lastMessage = messages.filter((m) => m.role === 'assistant').at(-1);
    if (!lastMessage) return;

    // Check if we need to process new parts
    const isNewMessage = lastProcessedMessageId.current !== lastMessage.id;
    if (isNewMessage) {
      lastProcessedMessageId.current = lastMessage.id;
      lastProcessedPartCount.current = 0;
    }

    // Process data parts from the message
    // Data parts have type 'data-artifact' with a nested data object
    const dataParts = lastMessage.parts.filter(
      (part) => typeof part.type === 'string' && part.type.startsWith('data-'),
    );

    // Only process new parts
    const newParts = dataParts.slice(lastProcessedPartCount.current);
    lastProcessedPartCount.current = dataParts.length;

    // Process the new data parts
    newParts.forEach((part) => {
      // Extract the data from the part
      const partData = part as { type: string; data?: DataStreamDelta };
      const delta = partData.data;

      if (!delta) return;

      // Since artifacts are removed, we just log the delta for debugging
      console.log('DataStream: Processing delta', delta);

      // Here you could add other non-artifact specific processing
      // For now, this handler just processes the stream without artifact functionality
    });
  }, [messages]);

  useEffect(() => {
    processDataParts();
  }, [processDataParts]);

  return null;
}

'use client';

import { useChat } from '@ai-sdk/react';
import { useCallback, useEffect, useRef } from 'react';

import { artifactDefinitions, type ArtifactKind } from './artifact';
import { initialArtifactData, useArtifact } from '@/hooks/use-artifact';
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
  const { artifact, setArtifact, setMetadata } = useArtifact();
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

    newParts.forEach((part) => {
      // Extract the data from the part
      const partData = part as { type: string; data?: DataStreamDelta };
      const delta = partData.data;

      if (!delta) return;

      const artifactDefinition = artifactDefinitions.find(
        (artifactDefinition) => artifactDefinition.kind === artifact.kind,
      );

      if (artifactDefinition?.onStreamPart) {
        artifactDefinition.onStreamPart({
          streamPart: delta,
          setArtifact,
          setMetadata,
        });
      }

      setArtifact((draftArtifact) => {
        if (!draftArtifact) {
          return { ...initialArtifactData, status: 'streaming' };
        }

        switch (delta.type) {
          case 'id':
            return {
              ...draftArtifact,
              documentId: delta.content as string,
              status: 'streaming',
            };

          case 'title':
            return {
              ...draftArtifact,
              title: delta.content as string,
              status: 'streaming',
            };

          case 'kind':
            return {
              ...draftArtifact,
              kind: delta.content as ArtifactKind,
              status: 'streaming',
            };

          case 'clear':
            return {
              ...draftArtifact,
              content: '',
              status: 'streaming',
            };

          case 'finish':
            return {
              ...draftArtifact,
              status: 'idle',
            };

          default:
            return draftArtifact;
        }
      });
    });
  }, [messages, setArtifact, setMetadata, artifact]);

  useEffect(() => {
    processDataParts();
  }, [processDataParts]);

  return null;
}

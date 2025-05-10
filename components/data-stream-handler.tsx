'use client';

import { useChat } from '@ai-sdk/react';
import { useEffect, useRef, useCallback, useState } from 'react';
import { artifactDefinitions, type ArtifactKind } from './artifact';
import type { Suggestion } from '@/lib/db/schema';
import { initialArtifactData, useArtifact } from '@/hooks/use-artifact';

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
  const { data: dataStream } = useChat({ id });
  const { artifact, setArtifact, setMetadata } = useArtifact();
  const lastProcessedIndex = useRef(-1);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Process up to this many deltas in a single batch
  const BATCH_SIZE = 10;
  // Delay between batch processing (ms) - gives browser time to render
  const BATCH_DELAY = 10;

  // Memoize the handler to avoid recreation on each render
  const processDeltas = useCallback((deltas: DataStreamDelta[]) => {
    deltas.forEach((delta: DataStreamDelta) => {
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
  }, [artifact.kind, setArtifact, setMetadata]);

  // Debounced, batched delta processing - prevents UI lockup with large streams
  useEffect(() => {
    // Skip if already processing or no data
    if (isProcessing || !dataStream?.length) return;
    
    // Skip if no new deltas
    const startIndex = lastProcessedIndex.current + 1;
    if (startIndex >= dataStream.length) return;
    
    // Mark as processing to prevent multiple concurrent processing jobs
    setIsProcessing(true);
    
    // Process in batches with setTimeout to allow UI updates
    const processBatch = (currentIndex: number) => {
      // Calculate end index for this batch (either batch limit or end of data)
      const endIndex = Math.min(currentIndex + BATCH_SIZE, dataStream.length);
      
      // Extract the batch of deltas
      const deltaBatch = dataStream.slice(currentIndex, endIndex) as DataStreamDelta[];
      
      // Process this batch
      processDeltas(deltaBatch);
      
      // Update last processed index
      lastProcessedIndex.current = endIndex - 1;
      
      // If there are more deltas to process, schedule next batch
      if (endIndex < dataStream.length) {
        setTimeout(() => processBatch(endIndex), BATCH_DELAY);
      } else {
        // Done processing
        setIsProcessing(false);
      }
    };
    
    // Start processing
    processBatch(startIndex);
  }, [dataStream, isProcessing, processDeltas]);

  return null;
}

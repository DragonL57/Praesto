import { generateUUID } from '@/lib/utils';
import { tool } from 'ai';
import type { UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import type { Session } from 'next-auth';
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from '@/lib/artifacts/server';

interface CreateDocumentProps {
  session: Session;
  dataStream: UIMessageStreamWriter;
}

// Helper to write data to the stream in AI SDK 5.x format
function writeData(writer: UIMessageStreamWriter, data: { type: string; content: string }) {
  // AI SDK 5.x: Use write() with data parts
  // The 'data' property will be sent to the client via the stream
  writer.write({ type: 'data-artifact' as const, data } as unknown as Parameters<typeof writer.write>[0]);
}

export const createDocument = ({ session, dataStream }: CreateDocumentProps) =>
  tool({
    description:
      'Create a document for a writing or content creation activities. This tool will call other functions that will generate the contents of the document based on the title and kind.',
    inputSchema: z.object({
      title: z.string(),
      kind: z.enum(artifactKinds),
    }),
    execute: async ({ title, kind }) => {
      const id = generateUUID();

      writeData(dataStream, {
        type: 'kind',
        content: kind,
      });

      writeData(dataStream, {
        type: 'id',
        content: id,
      });

      writeData(dataStream, {
        type: 'title',
        content: title,
      });

      writeData(dataStream, {
        type: 'clear',
        content: '',
      });

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === kind,
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${kind}`);
      }

      await documentHandler.onCreateDocument({
        id,
        title,
        dataStream,
        session,
      });

      writeData(dataStream, { type: 'finish', content: '' });

      return {
        id,
        title,
        kind,
        content: 'A document was created and is now visible to the user.',
      };
    },
  });

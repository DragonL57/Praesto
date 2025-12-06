
import { streamObject } from 'ai';
import type { UIMessageStreamWriter } from 'ai';
import { z } from 'zod';

import { createDocumentHandler } from '@/lib/artifacts/server';
import { myProvider } from '@/lib/ai/providers';
import { updateDocumentPrompt } from '@/lib/ai/prompts';

// Helper to write data to the stream in AI SDK 5.x format
function writeData(writer: UIMessageStreamWriter, data: { type: string; content: string }) {
  // AI SDK 5.x: Use write() with data parts
  writer.write({ type: 'data-artifact' as const, data } as unknown as Parameters<typeof writer.write>[0]);
}

export const codeDocumentHandler = createDocumentHandler<'code'>({
  kind: 'code',
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = '';

    const { fullStream } = streamObject({
      model: myProvider.languageModel('artifact-model'),
      system: updateDocumentPrompt(null, 'code'),
      prompt: title,
      schema: z.object({
        code: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { code } = object;

        if (code) {
          writeData(dataStream, {
            type: 'code-delta',
            content: code ?? '',
          });

          draftContent = code;
        }
      }
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = '';

    const { fullStream } = streamObject({
      model: myProvider.languageModel('artifact-model'),
      system: updateDocumentPrompt(document.content, 'code'),
      prompt: description,
      schema: z.object({
        code: z.string(),
      }),
    });

    for await (const delta of fullStream) {
      const { type } = delta;

      if (type === 'object') {
        const { object } = delta;
        const { code } = object;

        if (code) {
          writeData(dataStream, {
            type: 'code-delta',
            content: code ?? '',
          });

          draftContent = code;
        }
      }
    }

    return draftContent;
  },
});

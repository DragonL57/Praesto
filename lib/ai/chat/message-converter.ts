import type { Message } from '@/lib/ai/types';

/**
 * Converts UI messages to the format expected by OpenAI/Poe API.
 *
 * IMPORTANT FOR DEBUGGING:
 * Many OpenAI-compatible providers (including Poe's proxy) are extremely strict
 * about the message sequence when tools are used. They expect:
 * 1. Assistant message with 'tool_calls' (and content usually empty '')
 * 2. Tool message with 'tool_call_id' and 'result'
 * 3. Assistant message with the final response.
 *
 * If these are bundled into a single message (common in UI state), the API
 * will often return a generic 'internal_error'. This function "unrolls"
 * bundled messages into the correct sequence.
 *
 * council-debate parts are UI-only metadata, skipped for token efficiency.
 */
export function convertToOpenAIMessages(
  messages: Message[],
): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];

  for (const m of messages) {
    if (m.role === 'user' || m.role === 'system') {
      const parts: Array<Record<string, unknown>> = [];

      (m.parts || []).forEach((part) => {
        if (part.type === 'text') {
          parts.push({ type: 'text', text: (part as { text: string }).text });
          return;
        }

        if (part.type === 'file') {
          const f = part as {
            url: string;
            contentType?: string;
            filename?: string;
          };
          const isImage =
            f.contentType?.startsWith('image/') ||
            f.filename?.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);

          const name = f.filename || 'attachment';
          const url = f.url || '';

          if (url) {
            parts.push({
              type: 'text',
              text: `Attached file: ${name} ${url}`,
            });
          }

          if (isImage) {
            parts.push({
              type: 'image_url',
              image_url: { url },
            });
            return;
          }

          parts.push({
            type: 'file',
            file: {
              filename: name,
              url,
            },
          });
        }
      });

      if (parts.length === 1 && parts[0]?.type === 'text') {
        result.push({ role: m.role, content: parts[0].text });
      } else if (parts.length > 0) {
        result.push({ role: m.role, content: parts });
      } else {
        const fallback =
          (m as unknown as Record<string, unknown>).content || '';
        result.push({ role: m.role, content: String(fallback) });
      }
    } else if (m.role === 'assistant') {
      let currentText = '';
      let currentToolCalls: Array<Record<string, unknown>> = [];

      const flushTurn = () => {
        if (currentText || currentToolCalls.length > 0) {
          result.push({
            role: 'assistant',
            content: currentText || '',
            tool_calls:
              currentToolCalls.length > 0 ? currentToolCalls : undefined,
          });
          currentText = '';
          currentToolCalls = [];
        }
      };

      for (const part of m.parts || []) {
        if (part.type === 'text') {
          currentText += (part as { text: string }).text;
        } else if (part.type === 'tool-call') {
          const tc = part as Record<string, unknown>;
          currentToolCalls.push({
            id: tc.toolCallId,
            type: 'function',
            function: {
              name: tc.toolName,
              arguments:
                typeof tc.args === 'string'
                  ? tc.args
                  : JSON.stringify(tc.args || {}),
            },
          });
        } else if (part.type === 'tool-result') {
          flushTurn();

          const tr = part as Record<string, unknown>;
          result.push({
            role: 'tool',
            tool_call_id: tr.toolCallId,
            content:
              typeof tr.result === 'string'
                ? (tr.result as string)
                : JSON.stringify(tr.result ?? {}),
          });
        }
      }

      flushTurn();
    } else if (m.role === 'tool') {
      const toolResultPart = m.parts.find((p) => p.type === 'tool-result');
      if (toolResultPart && 'toolCallId' in toolResultPart) {
        const tr = toolResultPart as Record<string, unknown>;
        result.push({
          role: 'tool',
          tool_call_id: tr.toolCallId,
          content:
            typeof tr.result === 'string'
              ? (tr.result as string)
              : JSON.stringify(tr.result ?? {}),
        });
      }
    }
  }

  return result;
}

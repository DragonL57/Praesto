import 'server-only';
import { generateUUID } from '@/lib/utils';
import {
  openai,
  getChatCompletionParams,
  getAvailableTools,
} from '@/lib/ai/providers';
import {
  getChatById,
  saveChat,
  saveMessages,
  updateChatTimestamp,
  getMessageById,
  deleteMessagesByChatIdAfterTimestamp,
} from '@/lib/db/queries';
import { generateTitleFromUserMessage } from '@/lib/actions/chat';
import {
  processMessageAttachments,
  updateMessageWithProcessedText,
} from './attachments';
import { StreamProtocol } from './stream-protocol';
import type { StreamPartType } from './stream-protocol';
import type { Message, MessagePart } from '@/lib/ai/types';
import type { UserTimeContext } from './types';

/**
 * Orchestrates the entire chat process: message processing, completion, and streaming.
 */
/**
 * handleChatRequest
 * The core server-side handler for chat requests.
 * 1. Pre-processes messages and attachments.
 * 2. Manages the LLM completion loop via OpenAI/Poe API.
 * 3. Handles manual streaming to the client via a ReadableStream controller.
 */
export async function handleChatRequest({
  id,
  userId,
  messages,
  userTimeContext,
  modelId,
  controller,
  abortSignal,
}: {
  id: string;
  userId: string;
  messages: Message[];
  userTimeContext?: UserTimeContext;
  modelId: string;
  controller: ReadableStreamDefaultController;
  abortSignal?: AbortSignal;
}) {
  const encoder = new TextEncoder();

  /**
   * Helper to send formatted data parts to the client.
   * Uses StreamProtocol to ensure consistent prefix-based encoding.
   */
  const send = (type: StreamPartType | string, data: unknown) => {
    // Check if controller is still active
    if (controller.desiredSize === null) return;

    try {
      const formatted = StreamProtocol.format(type as StreamPartType, data);
      controller.enqueue(encoder.encode(formatted));
    } catch (e) {
      // If it fails with "already closed", we can just ignore it or log it minimally
      const isClosedError =
        e instanceof TypeError && e.message.includes('already closed');
      if (!isClosedError) {
        console.error('[ChatService] Error enqueuing stream part:', e);
      }
    }
  };

  // ... (rest of implementation)

  try {
    // 1. Process attachments and update the latest user message
    const userMessage = messages[messages.length - 1];
    if (!userMessage || userMessage.role !== 'user') {
      throw new Error('No user message found to process');
    }

    const originalParts = JSON.parse(JSON.stringify(userMessage.parts));
    const originalTypedText = userMessage.parts
      .filter((part: MessagePart) => part.type === 'text')
      .map((part) => (part as { text: string }).text)
      .join('\n');

    const combinedText = await processMessageAttachments(userMessage);
    updateMessageWithProcessedText(
      userMessage,
      combinedText,
      originalTypedText,
    );

    // 2. Manage Chat initialization and title generation
    const chat = await getChatById({ id });
    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });
      await saveChat({ id, userId, title });
      // Send title metadata to frontend immediately so UI can update
      send('metadata', { title });
    } else if (chat.userId !== userId) {
      throw new Error('Unauthorized access to chat');
    }

    // 2.1 Handle Retry logic: if message exists, delete it and everything after it
    const [existingMessage] = await getMessageById({ id: userMessage.id });
    if (existingMessage) {
      console.log(
        `[ChatService] Retry detected for message ${userMessage.id}. Cleaning up trailing history.`,
      );
      await deleteMessagesByChatIdAfterTimestamp({
        chatId: existingMessage.chatId,
        timestamp: existingMessage.createdAt,
      });
    }

    // 3. Save User Message to Database
    await saveMessages({
      messages: [
        {
          chatId: id,
          id: userMessage.id,
          role: 'user',
          parts: originalParts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });
    await updateChatTimestamp({ id });

    // 4. Run AI Completion loop
    const assistantId = generateUUID();
    const uiParts: MessagePart[] = [];

    const addPartToUI = (part: MessagePart) => {
      if (part.type === 'text' || part.type === 'reasoning') {
        const lastPart = uiParts[uiParts.length - 1];
        if (lastPart && lastPart.type === part.type) {
          (lastPart as { text: string }).text += (
            part as { text: string }
          ).text;
          return;
        }
      }
      uiParts.push(part);
    };

    type Tool = {
      description?: string;
      parameters?: Record<string, unknown> | unknown;
      execute: (
        args?: Record<string, unknown>,
        options?: { abortSignal?: AbortSignal },
      ) => Promise<unknown>;
    };

    const { tools: availableTools } = await getAvailableTools();
    const toolsRegistry = availableTools as Record<string, Tool>;

    // Inner recursive function to handle potential tool-call loops
    type ToolCallEntry = {
      id?: string;
      type: 'function';
      function: { name: string; arguments: string };
    };

    // Extract user message text for dynamic context assembly
    const latestUserText = messages
      .filter((m) => m.role === 'user')
      .flatMap((m) => m.parts.filter((p) => p.type === 'text'))
      .map((p) => (p as { text: string }).text)
      .join('\n');

    const runCompletion = async (
      currentMsgs: Record<string, unknown>[],
      retryCount = 0,
    ): Promise<void> => {
      let stepContent = '';
      let stepReasoning = '';
      const stepToolCalls: Array<ToolCallEntry | null> = [];

      try {
        // If signal is already aborted, stop immediately
        if (abortSignal?.aborted) return;

        const params = await getChatCompletionParams(
          modelId,
          currentMsgs,
          userTimeContext,
          latestUserText,
        );

        // Execute completion with Poe API (OpenAI-compatible)
        type CreateFn = (body: unknown) => Promise<AsyncIterable<unknown>>;
        const createFn = (
          openai.chat.completions.create as unknown as CreateFn
        ).bind(openai.chat.completions) as CreateFn;

        // Pass the abort signal to the provider
        const responseStream = await createFn({
          ...params,
          signal: abortSignal,
        });

        for await (const chunk of responseStream as AsyncIterable<unknown>) {
          // Check if we should stop
          if (abortSignal?.aborted) break;

          const chunkRec = chunk as Record<string, unknown>;
          const choices = chunkRec.choices as
            | Array<Record<string, unknown>>
            | undefined;
          const delta = choices?.[0]?.delta as
            | Record<string, unknown>
            | undefined;
          if (!delta) continue;

          // Handle text content
          const deltaRec = delta as Record<string, unknown>;
          if (typeof deltaRec.content === 'string') {
            const text = deltaRec.content as string;
            stepContent += text;
            send('text', text);
            addPartToUI({ type: 'text', text });
          }

          // Handle reasoning/thinking
          const reasoning =
            typeof deltaRec.reasoning_content !== 'undefined'
              ? deltaRec.reasoning_content
              : deltaRec.thinking;
          if (typeof reasoning === 'string' && reasoning.length > 0) {
            stepReasoning += reasoning;
            send('reasoning', reasoning);
            addPartToUI({ type: 'reasoning', text: reasoning });
          }

          // Accumulate tool calls
          if (deltaRec.tool_calls) {
            for (const tcDeltaRaw of (deltaRec.tool_calls as Array<
              Record<string, unknown>
            >) || []) {
              const tcDelta = tcDeltaRaw as Record<string, unknown>;
              const rawIndex = tcDelta.index as unknown;
              const idx =
                typeof rawIndex === 'number'
                  ? rawIndex
                  : typeof rawIndex === 'string' &&
                      rawIndex &&
                      !Number.isNaN(Number(rawIndex))
                    ? Number(rawIndex)
                    : undefined;
              if (idx === undefined) continue;

              if (!stepToolCalls[idx]) {
                stepToolCalls[idx] = {
                  id: tcDelta.id as string | undefined,
                  type: 'function',
                  function: { name: '', arguments: '' },
                };
              }

              const tc = stepToolCalls[idx];
              if (!tc) continue;
              if (tcDelta.id) tc.id = String(tcDelta.id as unknown);
              if (tcDelta.function && typeof tcDelta.function === 'object') {
                const fn = tcDelta.function as Record<string, unknown>;
                if (typeof fn.name === 'string') tc.function.name += fn.name;
                if (typeof fn.arguments === 'string')
                  tc.function.arguments += fn.arguments;

                // Send streaming update to client for immediate UI feedback
                send('tool-call-streaming', {
                  index: idx,
                  toolCallId: tc.id,
                  toolName: tc.function.name,
                  arguments: tc.function.arguments,
                });
              }
            }
          }
        }

        // Stop here if aborted
        if (abortSignal?.aborted) return;

        // Process accumulated tool calls
        const filteredToolCalls = stepToolCalls.filter(
          Boolean,
        ) as ToolCallEntry[];
        if (filteredToolCalls.length > 0) {
          // Build history for the next step
          const toolMessages = [
            ...currentMsgs,
            {
              role: 'assistant',
              content: stepContent || null,
              reasoning_content: stepReasoning || undefined,
              tool_calls: filteredToolCalls,
            },
          ];

          for (const tc of filteredToolCalls) {
            if (abortSignal?.aborted) break;
            if (!tc || !tc.function) continue;
            const toolName = tc.function.name;
            const toolArgsString = tc.function.arguments || '{}';
            let toolArgs = {};
            try {
              toolArgs = JSON.parse(toolArgsString);
            } catch {
              console.error(
                '[ChatService] Failed to parse tool arguments:',
                toolArgsString,
              );
            }

            // Add to UI tracking
            send('tool-call', { toolCallId: tc.id, toolName, args: toolArgs });
            addPartToUI({
              type: 'tool-call',
              toolCallId: tc.id,
              toolName,
              args: toolArgs,
              state: 'input-available',
            } as MessagePart);

            const tool = toolsRegistry[toolName];
            if (tool && typeof tool.execute === 'function') {
              try {
                // Pass abortSignal to tools so they can cancel long operations
                const result = await tool.execute(toolArgs, { abortSignal });
                send('tool-result', { toolCallId: tc.id, toolName, result });

                const resultObj = result as Record<string, unknown> | null;
                const isError =
                  resultObj &&
                  typeof resultObj === 'object' &&
                  ('error' in resultObj || resultObj.success === false);

                addPartToUI({
                  type: 'tool-result',
                  toolCallId: tc.id,
                  toolName,
                  result,
                  args: toolArgs,
                  state: isError ? 'output-error' : 'output-available',
                } as MessagePart);

                toolMessages.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  content:
                    typeof result === 'string'
                      ? result
                      : JSON.stringify(result),
                });
              } catch (toolError: unknown) {
                const errorMessage =
                  toolError instanceof Error
                    ? toolError.message
                    : String(toolError);
                console.error(
                  `[ChatService] Error executing tool ${toolName}:`,
                  toolError,
                );

                const errorResult = {
                  error: 'Failed to execute tool',
                  details: errorMessage,
                };
                send('tool-result', {
                  toolCallId: tc.id,
                  toolName,
                  result: errorResult,
                });

                addPartToUI({
                  type: 'tool-result',
                  toolCallId: tc.id,
                  toolName,
                  result: errorResult,
                  args: toolArgs,
                  state: 'output-error',
                } as MessagePart);

                toolMessages.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  content: JSON.stringify(errorResult),
                });
              }
            }
          }

          // Recursive call for follow-up response after tool execution
          await runCompletion(toolMessages);
        }
      } catch (error: unknown) {
        if (abortSignal?.aborted) return;

        const err = error as unknown as
          | Record<string, unknown>
          | Error
          | undefined;
        console.error(`[Completion Error] (Attempt ${retryCount + 1}):`, err);

        // Robust retry for upstream errors
        const errRec = err as Record<string, unknown> | undefined;
        const isRetryable = !!(
          errRec &&
          (String(errRec.type) === 'internal_error' ||
            Number(errRec.status) === 500 ||
            Number(errRec.status) === 429)
        );
        if (retryCount < 2 && isRetryable) {
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));

          // Reset step progress for this attempt
          return runCompletion(currentMsgs, retryCount + 1);
        }
        throw err;
      }
    };

    // Convert UI messages to the internal OpenAI format
    const openAIMessages = convertToOpenAIMessages(messages);
    await runCompletion(openAIMessages);

    if (abortSignal?.aborted) return;

    // 5. Save Assistant Message with all parts in correct chronological order
    await saveMessages({
      messages: [
        {
          id: assistantId,
          chatId: id,
          role: 'assistant',
          parts: uiParts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });
    await updateChatTimestamp({ id });
  } catch (error: unknown) {
    const err = error as unknown as Record<string, unknown> | Error | undefined;
    console.error('[ChatService Final Catch]', err);
    const message =
      err instanceof Error
        ? err.message
        : String(
            (err as Record<string, unknown>)?.message ??
              'An error occurred during completion',
          );
    send('error', message);
  } finally {
    try {
      if (controller.desiredSize !== null) {
        controller.close();
      }
    } catch (e) {
      // Ignore "already closed" errors
      const isClosedError =
        e instanceof TypeError && e.message.includes('already closed');
      if (!isClosedError) {
        console.error('[ChatService] Error closing stream controller:', e);
      }
    }
  }
}

/**
 * Helper to convert UI messages to the format expected by OpenAI/Poe API.
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
 */
export function convertToOpenAIMessages(
  messages: Message[],
): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];

  for (const m of messages) {
    if (m.role === 'user' || m.role === 'system') {
      const parts: Array<Record<string, unknown>> = [];

      // Convert each message part into the OpenAI/Poe compatible format.
      // For image attachments, we include both an image_url block + a text fallback so models
      // that don't support multimodal inputs still have context.
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

          // Always add a text fallback so the model can see the URL even if it doesn't
          // understand the native multimodal blocks.
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

          // Poe supports native file attachments via the 'file' type.
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
          // If we have accumulated text or tool calls, flush them first
          // before sending the tool result.
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

      // Final flush for any remaining content
      flushTurn();
    } else if (m.role === 'tool') {
      // Handle any standalone tool messages if they exist
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

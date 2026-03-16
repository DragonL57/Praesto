import 'server-only';
import { generateUUID } from '@/lib/utils';
import { openai, getChatCompletionParams, getAvailableTools } from '@/lib/ai/providers';
import {
  getChatById,
  saveChat,
  saveMessages,
  updateChatTimestamp,
  getMessageById,
  deleteMessagesByChatIdAfterTimestamp
} from '@/lib/db/queries';
import { generateTitleFromUserMessage } from '@/lib/actions/chat';
import { processMessageAttachments, updateMessageWithProcessedText } from './attachments';
import { StreamProtocol } from './stream-protocol';
import type { StreamPartType } from './stream-protocol';
import type { Message, MessagePart } from '@/lib/ai/types';
import type { UserTimeContext } from './types';

/**
 * Orchestrates the entire chat process: message processing, completion, and streaming.
 */
export async function handleChatRequest({
  id,
  userId,
  messages,
  userTimeContext,
  modelId,
  controller,
}: {
  id: string;
  userId: string;
  messages: Message[];
  userTimeContext?: UserTimeContext;
  modelId: string;
  controller: ReadableStreamDefaultController;
}) {
  const send = (type: StreamPartType | string, data: unknown) => controller.enqueue(StreamProtocol.encode(type as StreamPartType, data));

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
    updateMessageWithProcessedText(userMessage, combinedText, originalTypedText);

    // 2. Manage Chat initialization and title generation
    const chat = await getChatById({ id });
    if (!chat) {
      const title = await generateTitleFromUserMessage({ message: userMessage });
      await saveChat({ id, userId, title });
      // Send title metadata to frontend immediately so UI can update
      send('metadata', { title });
    } else if (chat.userId !== userId) {
      throw new Error('Unauthorized access to chat');
    }

    // 2.1 Handle Retry logic: if message exists, delete it and everything after it
    const [existingMessage] = await getMessageById({ id: userMessage.id });
    if (existingMessage) {
      console.log(`[ChatService] Retry detected for message ${userMessage.id}. Cleaning up trailing history.`);
      await deleteMessagesByChatIdAfterTimestamp({
        chatId: existingMessage.chatId,
        timestamp: existingMessage.createdAt,
      });
    }

    // 3. Save User Message to Database
    await saveMessages({
      messages: [{
        chatId: id,
        id: userMessage.id,
        role: 'user',
        parts: originalParts,
        attachments: [],
        createdAt: new Date(),
      }],
    });
    await updateChatTimestamp({ id });

    // 4. Run AI Completion loop
    const assistantId = generateUUID();
    let finalFullContent = '';
    let finalFullReasoning = '';
    type Tool = {
      description?: string;
      parameters?: Record<string, unknown> | unknown;
      execute: (args?: Record<string, unknown>) => Promise<unknown>;
    };

    const allToolCallsForUI: Array<{ id?: string; name?: string; args?: unknown }> = [];
    const allToolResultsForUI: Array<{ toolCallId?: string; toolName?: string; result?: unknown; args?: unknown }> = [];
    const { tools: availableTools } = await getAvailableTools();
    const toolsRegistry = availableTools as Record<string, Tool>;

    // Inner recursive function to handle potential tool-call loops
    type ToolCallEntry = {
      id?: string;
      type: 'function';
      function: { name: string; arguments: string };
    };

    const runCompletion = async (currentMsgs: Record<string, unknown>[], retryCount = 0): Promise<void> => {
      let stepContent = '';
      let stepReasoning = '';
      const stepToolCalls: Array<ToolCallEntry | null> = [];

      try {
        const params = await getChatCompletionParams(modelId, currentMsgs, userTimeContext);

        // Execute completion with Poe API (OpenAI-compatible)
        // Bind the create method so its internal `this` (client) is available at runtime
        // CreateFn: explicit function type for the provider's streaming create method
        type CreateFn = (body: unknown) => Promise<AsyncIterable<unknown>>;
        const createFn = (openai.chat.completions.create as unknown as CreateFn).bind(openai.chat.completions) as CreateFn;
        const responseStream = await createFn(params);

        for await (const chunk of (responseStream as AsyncIterable<unknown>)) {
          const chunkRec = chunk as Record<string, unknown>;
          const choices = chunkRec.choices as Array<Record<string, unknown>> | undefined;
          const delta = choices?.[0]?.delta as Record<string, unknown> | undefined;
          if (!delta) continue;

          // Handle text content
          const deltaRec = delta as Record<string, unknown>;
          if (typeof deltaRec.content === 'string') {
            const text = deltaRec.content as string;
            stepContent += text;
            finalFullContent += text;
            send('text', text);
          }

          // Handle reasoning/thinking
          const reasoning = (typeof deltaRec.reasoning_content !== 'undefined') ? deltaRec.reasoning_content : deltaRec.thinking;
          if (typeof reasoning === 'string' && reasoning.length > 0) {
            stepReasoning += reasoning;
            finalFullReasoning += reasoning;
            send('reasoning', reasoning);
          }

          // Accumulate tool calls
          if (deltaRec.tool_calls) {
            for (const tcDeltaRaw of (deltaRec.tool_calls as Array<Record<string, unknown>>) || []) {
              const tcDelta = tcDeltaRaw as Record<string, unknown>;
              const rawIndex = tcDelta.index as unknown;
              const idx =
                typeof rawIndex === 'number'
                  ? rawIndex
                  : typeof rawIndex === 'string' && rawIndex && !Number.isNaN(Number(rawIndex))
                    ? Number(rawIndex)
                    : undefined;
              if (idx === undefined) continue;

              if (!stepToolCalls[idx]) {
                stepToolCalls[idx] = {
                  id: tcDelta.id as string | undefined,
                  type: 'function',
                  function: { name: '', arguments: '' }
                };
              }

              const tc = stepToolCalls[idx];
              if (!tc) continue;
              if (tcDelta.id) tc.id = String(tcDelta.id as unknown);
              if (tcDelta.function && typeof tcDelta.function === 'object') {
                const fn = tcDelta.function as Record<string, unknown>;
                if (typeof fn.name === 'string') tc.function.name += fn.name;
                if (typeof fn.arguments === 'string') tc.function.arguments += fn.arguments;
              }
            }
          }
        }

        // Process accumulated tool calls
        const filteredToolCalls = stepToolCalls.filter(Boolean) as ToolCallEntry[];
        if (filteredToolCalls.length > 0) {
          // Build history for the next step
          const toolMessages = [...currentMsgs, {
            role: 'assistant',
            content: stepContent || null,
            reasoning_content: stepReasoning || undefined,
            tool_calls: filteredToolCalls
          }];

          for (const tc of filteredToolCalls) {
            if (!tc || !tc.function) continue;
            const toolName = tc.function.name;
            const toolArgsString = tc.function.arguments || '{}';
            let toolArgs = {};
            try {
              toolArgs = JSON.parse(toolArgsString);
            } catch {
              console.error('[ChatService] Failed to parse tool arguments:', toolArgsString);
            }

            // Add to UI tracking
            allToolCallsForUI.push({ id: tc.id, name: toolName, args: toolArgs });
            send('tool-call', { toolCallId: tc.id, toolName, args: toolArgs });

            const tool = toolsRegistry[toolName];
            if (tool && typeof tool.execute === 'function') {
              try {
                const result = await tool.execute(toolArgs);
                allToolResultsForUI.push({ toolCallId: tc.id, toolName, result, args: toolArgs });

                send('tool-result', { toolCallId: tc.id, toolName, result });

                toolMessages.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  content: typeof result === 'string' ? result : JSON.stringify(result),
                });
              } catch (toolError: unknown) {
                const errorMessage = toolError instanceof Error ? toolError.message : String(toolError);
                console.error(`[ChatService] Error executing tool ${toolName}:`, toolError);

                const errorResult = { error: 'Failed to execute tool', details: errorMessage };
                allToolResultsForUI.push({ toolCallId: tc.id, toolName, result: errorResult, args: toolArgs });

                send('tool-result', { toolCallId: tc.id, toolName, result: errorResult });

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
        const err = error as unknown as Record<string, unknown> | Error | undefined;
        console.error(`[Completion Error] (Attempt ${retryCount + 1}):`, err);

        // Robust retry for upstream errors
        const errRec = err as Record<string, unknown> | undefined;
        const isRetryable = !!(errRec && (String(errRec.type) === 'internal_error' || Number(errRec.status) === 500 || Number(errRec.status) === 429));
        if (retryCount < 2 && isRetryable) {
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));

          // Reset step progress for this attempt
          return runCompletion(currentMsgs, retryCount + 1);
        }
        throw err;
      }
    };

    // Convert UI messages to the internal OpenAI format
    const openAIMessages = convertToOpenAIMessages(messages);
    await runCompletion(openAIMessages);

    // 5. Construct and Save Assistant Message with all parts
    const uiParts: MessagePart[] = [];
    if (finalFullReasoning) uiParts.push({ type: 'reasoning', text: finalFullReasoning });
    if (finalFullContent) uiParts.push({ type: 'text', text: finalFullContent });

    // Map tool calls for UI persistence
    allToolCallsForUI.forEach(tc => {
      uiParts.push({
        type: 'tool-call',
        toolCallId: tc.id,
        toolName: tc.name,
        args: tc.args,
        state: 'input-available'
      } as MessagePart);
    });

    // Map tool results for UI persistence
    allToolResultsForUI.forEach(tr => {
      uiParts.push({
        type: 'tool-result',
        toolCallId: tr.toolCallId,
        toolName: tr.toolName,
        result: tr.result,
        args: tr.args,
        state: 'output-available'
      } as MessagePart);
    });

    await saveMessages({
      messages: [{
        id: assistantId,
        chatId: id,
        role: 'assistant',
        parts: uiParts,
        attachments: [],
        createdAt: new Date(),
      }],
    });
    await updateChatTimestamp({ id });

  } catch (error: unknown) {
    const err = error as unknown as Record<string, unknown> | Error | undefined;
    console.error('[ChatService Final Catch]', err);
    const message = err instanceof Error ? err.message : String((err as Record<string, unknown>)?.message ?? 'An error occurred during completion');
    send('error', message);
  } finally {
    controller.close();
  }
}

/**
 * Helper to convert UI messages to the format expected by OpenAI/Poe API
 */
export function convertToOpenAIMessages(messages: Message[]): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];

  for (const m of messages) {
    if (m.role === 'user' || m.role === 'system') {
      const raw = m.parts?.filter((part) => part.type === 'text').map((part) => (part as { text: string }).text).join('\n') ?? undefined;
      const fallback = (m as unknown as Record<string, unknown>).content;
      const content = String(raw ?? fallback ?? '');

      result.push({ role: m.role, content: content || '' });
    }
    else if (m.role === 'assistant') {
      const textParts = m.parts?.filter((p) => p.type === 'text') || [];
      const content = textParts.map((p) => (p as { text?: string }).text || '').join('\n').trim();

      const reasoningParts = m.parts?.filter((p) => p.type === 'reasoning') || [];
      const reasoning = reasoningParts.map((p) => (p as { text?: string }).text || '').join('\n').trim();

      // Get reasoning from raw property if parts are missing (for internal recursion)
      const finalReasoning = reasoning || (m as unknown as Record<string, unknown>).reasoning_content || (m as unknown as Record<string, unknown>).thinking;

      const toolCallParts = m.parts?.filter(p => p.type === 'tool-call') || [];

      const assistantMsg: Record<string, unknown> = {
        role: 'assistant',
        content: content || null,
      };

      if (finalReasoning) {
        // Use reasoning_content (standard) or thinking (Poe/some vendors)
        assistantMsg.reasoning_content = finalReasoning;
      }

      if (toolCallParts.length > 0) {
        (assistantMsg as Record<string, unknown>).tool_calls = toolCallParts.map((p) => {
          const pr = p as Record<string, unknown>;
          return {
            id: pr.toolCallId,
            type: 'function',
            function: {
              name: pr.toolName,
              arguments: typeof pr.args === 'string' ? (pr.args as string) : JSON.stringify(pr.args || {}),
            },
          };
        });
      }

      result.push(assistantMsg);
    }
    else if (m.role === 'tool') {
      const toolResultPart = m.parts.find(p => p.type === 'tool-result');
      if (toolResultPart && 'toolCallId' in toolResultPart) {
        const tr = toolResultPart as Record<string, unknown>;
        const toolResult = tr.result;
        result.push({
          role: 'tool',
          tool_call_id: tr.toolCallId,
          content: typeof toolResult === 'string'
            ? (toolResult as string)
            : JSON.stringify(toolResult ?? {}),
        });
      }
    }
  }

  return result;
}

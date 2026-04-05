import 'server-only';
import { openai, getChatCompletionParams } from '@/lib/ai/providers';
import type { MessagePart } from '@/lib/ai/types';
import type { StreamPartType } from './stream-protocol';
import type { UserTimeContext } from './types';
import { getErrorMessage } from '@/lib/ai/error-utils';

interface Tool {
  description?: string;
  parameters?: Record<string, unknown> | unknown;
  execute: (
    args?: Record<string, unknown>,
    options?: { abortSignal?: AbortSignal },
  ) => Promise<unknown>;
}

interface ToolCallEntry {
  id?: string;
  type: 'function';
  function: { name: string; arguments: string };
}

interface CompletionDeps {
  send: (type: StreamPartType | string, data: unknown) => void;
  addPartToUI: (part: MessagePart) => void;
  toolsRegistry: Record<string, Tool>;
  modelId: string;
  userTimeContext?: UserTimeContext;
  latestUserText: string;
  abortSignal?: AbortSignal;
}

/**
 * Creates the completion loop function with retry logic and tool execution.
 */
export function createCompletionLoop(deps: CompletionDeps) {
  const {
    send,
    addPartToUI,
    toolsRegistry,
    modelId,
    userTimeContext,
    latestUserText,
    abortSignal,
  } = deps;

  const runCompletion = async (
    currentMsgs: Record<string, unknown>[],
    retryCount = 0,
  ): Promise<void> => {
    let stepContent = '';
    let stepReasoning = '';
    const stepToolCalls: Array<ToolCallEntry | null> = [];

    try {
      if (abortSignal?.aborted) return;

      const params = await getChatCompletionParams(
        modelId,
        currentMsgs,
        userTimeContext,
        latestUserText,
      );

      type CreateFn = (body: unknown) => Promise<AsyncIterable<unknown>>;
      const createFn = (
        openai.chat.completions.create as unknown as CreateFn
      ).bind(openai.chat.completions) as CreateFn;

      const responseStream = await createFn({
        ...params,
        signal: abortSignal,
      });

      for await (const chunk of responseStream as AsyncIterable<unknown>) {
        if (abortSignal?.aborted) break;

        const chunkRec = chunk as Record<string, unknown>;
        const choices = chunkRec.choices as
          | Array<Record<string, unknown>>
          | undefined;
        const delta = choices?.[0]?.delta as
          | Record<string, unknown>
          | undefined;
        if (!delta) continue;

        const deltaRec = delta as Record<string, unknown>;
        if (typeof deltaRec.content === 'string') {
          const text = deltaRec.content as string;
          stepContent += text;
          send('text', text);
          addPartToUI({ type: 'text', text });
        }

        const reasoning =
          typeof deltaRec.reasoning_content !== 'undefined'
            ? deltaRec.reasoning_content
            : deltaRec.thinking;
        if (typeof reasoning === 'string' && reasoning.length > 0) {
          stepReasoning += reasoning;
          send('reasoning', reasoning);
          addPartToUI({ type: 'reasoning', text: reasoning });
        }

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

      if (abortSignal?.aborted) return;

      const filteredToolCalls = stepToolCalls.filter(
        Boolean,
      ) as ToolCallEntry[];
      if (filteredToolCalls.length > 0) {
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
                  typeof result === 'string' ? result : JSON.stringify(result),
              });
            } catch (toolError: unknown) {
              const errorMessage = getErrorMessage(toolError);
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

        await runCompletion(toolMessages);
      }
    } catch (error: unknown) {
      if (abortSignal?.aborted) return;

      const err = error as unknown as
        | Record<string, unknown>
        | Error
        | undefined;
      console.error(`[Completion Error] (Attempt ${retryCount + 1}):`, err);

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

        return runCompletion(currentMsgs, retryCount + 1);
      }
      throw err;
    }
  };

  return { runCompletion };
}

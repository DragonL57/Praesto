'use client';

import { useMemo } from 'react';
import { BrainIcon, Loader2Icon, CheckIcon } from 'lucide-react';
import { useThinking } from '@/lib/contexts/thinking';
import { useOrderedMessageParts } from './message-hooks';
import {
  isToolPart,
  extractToolName,
  isToolResultAvailable,
  isReasoningTool,
  getToolCallId,
} from './message-utils';
import type { Message } from '@/lib/ai/types';
import type { MergedMessagePart } from './message-types';
import type { ThinkingItem } from '@/lib/contexts/thinking';

function buildThinkingItems(
  message: Message,
  orderedParts: MergedMessagePart[],
): ThinkingItem[] {
  if (message.role !== 'assistant') return [];

  const items: ThinkingItem[] = [];
  let counter = 0;
  const nextId = () => `item-${counter++}`;

  // Collect all tool call IDs from regular parts first
  const regularToolCallIds = new Set<string>();
  const regularToolResults = new Map<
    string,
    { query?: string; count?: unknown }
  >();

  for (const mergedPart of orderedParts) {
    if (mergedPart.type === 'part' && isToolPart(mergedPart.part)) {
      const toolCallId = getToolCallId(mergedPart.part);
      const args = (mergedPart.part as Record<string, unknown>).args as
        | Record<string, unknown>
        | undefined;

      if (isToolResultAvailable(mergedPart.part)) {
        const result = (mergedPart.part as Record<string, unknown>).result as
          | Record<string, unknown>
          | undefined;
        regularToolCallIds.add(toolCallId);
        regularToolResults.set(toolCallId, {
          query: args?.query as string | undefined,
          count: result?.count,
        });
      }
    }
  }

  // Track what we've added for dedup
  const addedToolCallIds = new Set<string>();
  const addedCouncilKeys = new Set<string>();

  const addItem = (item: ThinkingItem) => {
    items.push(item);
  };

  for (const mergedPart of orderedParts) {
    // Regular reasoning parts
    if (mergedPart.type === 'reasoning') {
      for (const item of mergedPart.items) {
        if (typeof item === 'string') {
          addItem({
            id: nextId(),
            type: 'reasoning',
            content: item,
            status: 'complete',
          });
        } else if (item.type === 'webSearch') {
          const key = `search-${item.data.query}`;
          if (!addedCouncilKeys.has(key)) {
            addedCouncilKeys.add(key);
            addItem({
              id: nextId(),
              type: 'tool-call',
              content: `Searched: ${item.data.query}`,
              metadata: {
                toolName: 'webSearch',
                query: item.data.query,
              },
              status: 'complete',
            });
          }
        } else if (item.type === 'codeExecution') {
          addItem({
            id: nextId(),
            type: 'tool-call',
            content: item.data.code,
            metadata: {
              toolName: 'executeSandboxCode',
              language: item.data.language,
            },
            status: item.data.state?.includes('output') ? 'complete' : 'active',
          });
        }
      }
    }

    // Regular tool parts
    if (mergedPart.type === 'part' && isToolPart(mergedPart.part)) {
      const part = mergedPart.part;
      const toolName = extractToolName(part);
      const toolCallId = getToolCallId(part);

      if (isReasoningTool(toolName)) continue;

      if (isToolResultAvailable(part)) {
        const args = (part as Record<string, unknown>).args as
          | Record<string, unknown>
          | undefined;
        const result = (part as Record<string, unknown>).result as
          | Record<string, unknown>
          | undefined;
        const resultCount =
          result && typeof result === 'object' && 'count' in result
            ? result.count
            : undefined;

        if (!addedToolCallIds.has(toolCallId)) {
          addedToolCallIds.add(toolCallId);
          addItem({
            id: nextId(),
            type: 'tool-result',
            content: `Found ${resultCount ?? 'results'}`,
            metadata: {
              toolName,
              toolCallId,
              query: args?.query,
              resultCount,
            },
            status:
              (part as Record<string, unknown>).state === 'output-error'
                ? 'error'
                : 'complete',
          });
        }
      } else if (
        !addedToolCallIds.has(toolCallId) &&
        !regularToolCallIds.has(toolCallId)
      ) {
        const state = (part as Record<string, unknown>).state as
          | string
          | undefined;
        const args = (part as Record<string, unknown>).args as
          | Record<string, unknown>
          | undefined;

        if (!addedToolCallIds.has(toolCallId)) {
          addedToolCallIds.add(toolCallId);
          addItem({
            id: nextId(),
            type: 'tool-call',
            content: args?.query ? `Searched: ${args.query}` : undefined,
            metadata: {
              toolName,
              toolCallId,
              query: args?.query,
            },
            status: state === 'input-streaming' ? 'active' : 'pending',
          });
        }
      }
    }

    // Council debate parts
    if (mergedPart.type === 'council-debate') {
      const agents = mergedPart.agents || [];
      for (const agent of agents) {
        // Read toolCalls from council agent (used during streaming)
        // Regular tool parts handle post-refresh, dedup by toolCallId
        if (agent.toolCalls) {
          for (const tc of agent.toolCalls) {
            if (regularToolCallIds.has(tc.toolCallId)) continue;
            if (addedToolCallIds.has(tc.toolCallId)) continue;
            addedToolCallIds.add(tc.toolCallId);

            addItem({
              id: nextId(),
              type: tc.status === 'complete' ? 'tool-result' : 'tool-call',
              content: tc.args?.query
                ? `Searched: ${tc.args.query}`
                : undefined,
              metadata: {
                agent: agent.name,
                toolName: tc.toolName,
                query: tc.args?.query,
                resultCount:
                  tc.result &&
                  typeof tc.result === 'object' &&
                  'count' in tc.result
                    ? tc.result.count
                    : undefined,
              },
              status:
                tc.status === 'complete'
                  ? 'complete'
                  : tc.status === 'calling'
                    ? 'active'
                    : 'pending',
            });
          }
        }

        if (agent.rounds && agent.rounds.length > 0) {
          for (const round of agent.rounds) {
            const stageKey = `${agent.name}-r${round.round}`;
            if (addedCouncilKeys.has(stageKey)) continue;
            addedCouncilKeys.add(stageKey);

            addItem({
              id: nextId(),
              type: 'council-stage',
              content: round.content,
              metadata: {
                agent: agent.name,
                round: round.round,
              },
              status:
                agent.status === 'error'
                  ? 'error'
                  : agent.status === 'complete'
                    ? 'complete'
                    : 'active',
            });
          }
        } else if (agent.content && agent.status !== 'pending') {
          const stageKey = `${agent.name}-single`;
          if (addedCouncilKeys.has(stageKey)) continue;
          addedCouncilKeys.add(stageKey);

          addItem({
            id: nextId(),
            type: 'council-stage',
            content: agent.content,
            metadata: {
              agent: agent.name,
            },
            status:
              agent.status === 'error'
                ? 'error'
                : agent.status === 'complete'
                  ? 'complete'
                  : 'active',
          });
        }
      }

      if (mergedPart.isSynthesizing) {
        addItem({
          id: nextId(),
          type: 'council-stage',
          content: 'Synthesizing answer...',
          metadata: { agent: 'Captain' },
          status: 'active',
        });
      }
    }
  }

  return items;
}

export function MessageThinkingTrigger({
  message,
  isLoading,
}: {
  message: Message;
  isLoading: boolean;
}) {
  const { open } = useThinking();
  const { orderedParts } = useOrderedMessageParts(message);

  const thinkingItems = useMemo(
    () => buildThinkingItems(message, orderedParts),
    [message, orderedParts],
  );

  const hasThinkingContent = thinkingItems.length > 0;

  if (!hasThinkingContent && !isLoading) return null;

  const count = thinkingItems.filter((i) => i.status === 'complete').length;
  const total = thinkingItems.length;
  const isComplete = !isLoading && count === total;

  return (
    <button
      type="button"
      onClick={() => {
        open();
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-muted/30 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
    >
      {isLoading ? (
        <Loader2Icon className="size-3 animate-spin" />
      ) : isComplete ? (
        <CheckIcon className="size-3 text-green-500" />
      ) : (
        <BrainIcon className="size-3" />
      )}
      <span>
        {isLoading
          ? `Thinking... (${count}/${total})`
          : isComplete
            ? `Thought process (${total})`
            : `Thinking (${count}/${total})`}
      </span>
    </button>
  );
}

export { buildThinkingItems };

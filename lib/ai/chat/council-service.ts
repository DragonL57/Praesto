import 'server-only';
import { openai } from '@/lib/ai/providers';
import {
  COUNCIL_AGENTS,
  COUNCIL_DEBATE_ROUND_PROMPT,
} from '@/lib/ai/council-prompts';

const COUNCIL_MODEL = 'grok-4.1-fast-non-reasoning';
const MAX_DEBATE_ROUNDS = 2;

type ToolDef = {
  description?: string;
  parameters?: unknown;
  execute: (
    args?: Record<string, unknown>,
    options?: { abortSignal?: AbortSignal },
  ) => Promise<unknown>;
};

type CouncilAgentKey = 'researcher' | 'analyst' | 'contrarian';

interface CouncilCallbacks {
  send: (type: string, data: unknown) => void;
  addCouncilToUI: (data: unknown) => void;
  addPartToUI: (part: Record<string, unknown>) => void;
}

interface AgentToolCall {
  id?: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export async function runCouncilDebate({
  userQuestion,
  conversationContext,
  previousCouncilSyntheses,
  toolsRegistry,
  callbacks,
  abortSignal,
}: {
  userQuestion: string;
  conversationContext: string;
  previousCouncilSyntheses?: string;
  toolsRegistry: Record<string, ToolDef>;
  callbacks: CouncilCallbacks;
  abortSignal?: AbortSignal;
}): Promise<string[]> {
  const councilAgents: CouncilAgentKey[] = [
    'researcher',
    'analyst',
    'contrarian',
  ];

  const agentResults: Record<string, string[]> = {};
  for (const key of councilAgents) {
    agentResults[key] = [];
  }

  const councilStartData = {
    phase: 'start',
    agents: councilAgents.map((a) => ({
      name: COUNCIL_AGENTS[a].name,
      icon: COUNCIL_AGENTS[a].icon,
    })),
    rounds: MAX_DEBATE_ROUNDS,
  };
  callbacks.send('council-debate', councilStartData);
  callbacks.addCouncilToUI(councilStartData);

  for (let round = 1; round <= MAX_DEBATE_ROUNDS; round++) {
    if (abortSignal?.aborted) break;

    const roundStartData = {
      phase: 'round-start',
      round,
      totalRounds: MAX_DEBATE_ROUNDS,
    };
    callbacks.send('council-debate', roundStartData);

    const agentPromises = councilAgents.map(async (agentKey) => {
      if (abortSignal?.aborted) return { agent: agentKey, content: '' };

      const agent = COUNCIL_AGENTS[agentKey];
      const otherAgents = councilAgents.filter((a) => a !== agentKey);

      let agentSystemPrompt = `${agent.systemPrompt}\n\nContext from conversation:\n${conversationContext}`;

      if (previousCouncilSyntheses) {
        agentSystemPrompt += `\n\nPrevious council conclusions from this conversation:\n${previousCouncilSyntheses}\n\nBuild on these conclusions. Don't repeat what was already established unless the user asks for clarification.`;
      }

      if (round > 1) {
        const otherContent = otherAgents
          .map((a) => {
            const otherAgent = COUNCIL_AGENTS[a];
            const lastResponse =
              agentResults[a]?.[agentResults[a].length - 1] || '';
            return `## ${otherAgent.icon} ${otherAgent.name}:\n${lastResponse}`;
          })
          .join('\n\n');

        const previousSummary = agentResults[agentKey]
          .map((r, i) => `Round ${i + 1}: ${r.substring(0, 200)}...`)
          .join('\n');

        agentSystemPrompt += `\n\n${COUNCIL_DEBATE_ROUND_PROMPT.replace('{round}', String(round)).replace('{previousRoundSummary}', previousSummary).replace('{otherAgentsContent}', otherContent)}`;
      }

      const agentMessages: Record<string, unknown>[] = [
        { role: 'system', content: agentSystemPrompt },
        { role: 'user', content: userQuestion },
      ];

      const agentResponse = await runAgentWithTools({
        messages: agentMessages,
        toolsRegistry,
        callbacks,
        agentKey,
        agentName: agent.name,
        abortSignal,
      });

      agentResults[agentKey].push(agentResponse);

      const completeData = {
        phase: 'agent-complete',
        agent: agentKey,
        name: agent.name,
        icon: agent.icon,
        content: agentResponse || `[${agent.name} returned no response]`,
        round,
      };
      callbacks.send('council-debate', completeData);
      callbacks.addCouncilToUI(completeData);

      return { agent: agentKey, content: agentResponse };
    });

    await Promise.all(agentPromises);
  }

  const synthesisData = {
    phase: 'synthesis',
    captain: COUNCIL_AGENTS.captain.name,
    icon: COUNCIL_AGENTS.captain.icon,
  };
  callbacks.send('council-debate', synthesisData);
  callbacks.addCouncilToUI(synthesisData);

  const debateContext = councilAgents
    .map((a) => {
      const agent = COUNCIL_AGENTS[a];
      const allRounds = agentResults[a]
        .map((r, i) => `### Round ${i + 1}:\n${r}`)
        .join('\n\n');
      return `## ${agent.icon} ${agent.name}:\n${allRounds || '[No response]'}`;
    })
    .join('\n\n');

  return [debateContext];
}

async function runAgentWithTools({
  messages,
  toolsRegistry,
  callbacks,
  agentKey,
  agentName,
  abortSignal,
  onContent,
  onToolCalls,
}: {
  messages: Record<string, unknown>[];
  toolsRegistry: Record<string, ToolDef>;
  callbacks: CouncilCallbacks;
  agentKey: string;
  agentName: string;
  abortSignal?: AbortSignal;
  onContent?: (text: string) => void;
  onToolCalls?: (calls: AgentToolCall[]) => void;
}): Promise<string> {
  const webSearchTool = toolsRegistry.webSearch;
  const readWebsiteTool = toolsRegistry.readWebsiteContent;

  const toolsForAgent = {
    ...(webSearchTool && { webSearch: webSearchTool }),
    ...(readWebsiteTool && { readWebsiteContent: readWebsiteTool }),
  };

  let currentMessages = [...messages];
  let finalContent = '';
  let maxToolLoops = 3;

  while (maxToolLoops > 0) {
    if (abortSignal?.aborted) break;

    const params: Record<string, unknown> = {
      model: COUNCIL_MODEL,
      messages: currentMessages,
      temperature: 1,
      max_tokens: 4096,
      stream: true,
    };

    if (Object.keys(toolsForAgent).length > 0) {
      params.tools = Object.entries(toolsForAgent).map(
        ([name, tool]: [string, unknown]) => ({
          type: 'function',
          function: {
            name,
            description: (tool as Record<string, unknown>)?.description,
            parameters: (tool as Record<string, unknown>)?.parameters,
          },
        }),
      );
    }

    const createFn = (
      openai.chat.completions.create as unknown as (
        body: unknown,
      ) => Promise<AsyncIterable<unknown>>
    ).bind(openai.chat.completions);

    const responseStream = await createFn(params);

    let stepContent = '';
    const stepToolCalls: Array<AgentToolCall | null> = [];

    for await (const chunk of responseStream as AsyncIterable<unknown>) {
      if (abortSignal?.aborted) break;

      const chunkRec = chunk as Record<string, unknown>;
      const choices = chunkRec.choices as
        | Array<Record<string, unknown>>
        | undefined;
      const delta = choices?.[0]?.delta as Record<string, unknown> | undefined;
      if (!delta) continue;

      const deltaRec = delta as Record<string, unknown>;
      if (typeof deltaRec.content === 'string') {
        const text = deltaRec.content as string;
        stepContent += text;
        onContent?.(text);
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
          }
        }
      }
    }

    if (abortSignal?.aborted) break;

    const filteredToolCalls = stepToolCalls.filter(Boolean) as AgentToolCall[];

    if (filteredToolCalls.length === 0) {
      finalContent = stepContent;
      break;
    }

    onToolCalls?.(filteredToolCalls);

    const toolMessages: Record<string, unknown>[] = [
      ...currentMessages,
      {
        role: 'assistant',
        content: stepContent || null,
        tool_calls: filteredToolCalls,
      },
    ];

    for (const tc of filteredToolCalls) {
      if (abortSignal?.aborted) break;
      if (!tc || !tc.function) continue;

      const toolName = tc.function.name;
      const toolArgsString = tc.function.arguments || '{}';
      let toolArgs: Record<string, unknown> = {};
      try {
        toolArgs = JSON.parse(toolArgsString);
      } catch {
        console.error(
          `[Council ${agentName}] Failed to parse tool arguments:`,
          toolArgsString,
        );
      }

      callbacks.send('council-tool-call', {
        agent: agentKey,
        agentName,
        toolCallId: tc.id,
        toolName,
        args: toolArgs,
      });

      const tool = toolsForAgent[toolName as keyof typeof toolsForAgent];
      if (tool && typeof tool.execute === 'function') {
        try {
          const result = await tool.execute(toolArgs, { abortSignal });
          callbacks.send('council-tool-result', {
            agent: agentKey,
            agentName,
            toolCallId: tc.id,
            toolName,
            result,
          });

          toolMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content:
              typeof result === 'string' ? result : JSON.stringify(result),
          });
        } catch (toolError: unknown) {
          const errorMessage =
            toolError instanceof Error ? toolError.message : String(toolError);
          console.error(
            `[Council ${agentName}] Error executing tool ${toolName}:`,
            toolError,
          );

          const errorResult = {
            error: 'Failed to execute tool',
            details: errorMessage,
          };
          callbacks.send('council-tool-result', {
            agent: agentKey,
            agentName,
            toolCallId: tc.id,
            toolName,
            result: errorResult,
          });

          toolMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(errorResult),
          });
        }
      }
    }

    currentMessages = toolMessages;
    maxToolLoops--;
  }

  return finalContent;
}

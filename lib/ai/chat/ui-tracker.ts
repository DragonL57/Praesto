import type { MessagePart } from '@/lib/ai/types';

interface _CouncilAgentState {
  name: string;
  icon: string;
  status: 'thinking' | 'complete' | 'error';
  rounds: Array<{ round: number; content: string }>;
  toolCalls: Array<{
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    status: string;
    result?: unknown;
  }>;
}

export function createUITracker() {
  const uiParts: MessagePart[] = [];

  const addPartToUI = (part: MessagePart) => {
    if (part.type === 'text' || part.type === 'reasoning') {
      const councilIdx = uiParts.findIndex((p) => p.type === 'council-debate');
      if (councilIdx !== -1) {
        const council = uiParts[councilIdx] as Record<string, unknown>;
        uiParts[councilIdx] = {
          ...council,
          isSynthesizing: false,
        } as unknown as MessagePart;
      }
      const lastPart = uiParts[uiParts.length - 1];
      if (lastPart && lastPart.type === part.type) {
        (lastPart as { text: string }).text += (part as { text: string }).text;
        return;
      }
    }

    // Dedup tool parts by toolCallId
    if (part.type === 'tool-call' || part.type === 'tool-result') {
      const tcId = (part as Record<string, unknown>).toolCallId as
        | string
        | undefined;
      if (tcId) {
        const existingIdx = uiParts.findIndex(
          (p) =>
            (p.type === 'tool-call' || p.type === 'tool-result') &&
            (p as Record<string, unknown>).toolCallId === tcId,
        );
        if (existingIdx !== -1) {
          if (part.type === 'tool-result') {
            uiParts[existingIdx] = part;
          }
          return;
        }
      }
    }

    uiParts.push(part);
  };

  const addCouncilToUI = (data: unknown) => {
    const d = data as Record<string, unknown>;
    const phase = typeof d.phase === 'string' ? d.phase : '';
    const existingCouncilIdx = uiParts.findIndex(
      (p) => p.type === 'council-debate',
    );

    if (phase === 'start') {
      const agents = (
        (d.agents as Array<Record<string, unknown>> | undefined) || []
      ).map((a) => ({
        name: typeof a.name === 'string' ? a.name : '',
        icon: typeof a.icon === 'string' ? a.icon : '',
        status: 'thinking' as const,
        rounds: [] as Array<{ round: number; content: string }>,
        toolCalls: [] as Array<{
          toolCallId: string;
          toolName: string;
          args: Record<string, unknown>;
          status: string;
          result?: unknown;
        }>,
      }));
      uiParts.push({
        type: 'council-debate',
        agents,
        isComplete: false,
        isSynthesizing: false,
      } as unknown as MessagePart);
    } else if (phase === 'agent-complete') {
      const name = typeof d.name === 'string' ? d.name : '';
      const content = typeof d.content === 'string' ? d.content : '';
      const round = typeof d.round === 'number' ? d.round : 1;
      if (existingCouncilIdx !== -1) {
        const existing = uiParts[existingCouncilIdx] as Record<string, unknown>;
        const agents = existing.agents as Array<Record<string, unknown>>;
        const agentIdx = agents.findIndex((a) => a.name === name);
        if (agentIdx !== -1) {
          agents[agentIdx].content = content;
          if (!agents[agentIdx].rounds) {
            agents[agentIdx].rounds = [];
          }
          const existingRound = (
            agents[agentIdx].rounds as Array<{ round: number }>
          ).find((r) => r.round === round);
          if (!existingRound) {
            (
              agents[agentIdx].rounds as Array<{
                round: number;
                content: string;
              }>
            ).push({ round, content });
          }
          agents[agentIdx].status =
            content.startsWith('[') && content.endsWith(']')
              ? 'error'
              : 'complete';
        }
      }
    } else if (phase === 'synthesis') {
      if (existingCouncilIdx !== -1) {
        const existing = uiParts[existingCouncilIdx] as Record<string, unknown>;
        uiParts[existingCouncilIdx] = {
          ...existing,
          isSynthesizing: true,
          isComplete: true,
        } as unknown as MessagePart;
      }
    }
  };

  const addCouncilToolEvent = (data: unknown, isResult: boolean) => {
    const d = data as Record<string, unknown>;
    const agentName = typeof d.agentName === 'string' ? d.agentName : '';
    const toolCallId = typeof d.toolCallId === 'string' ? d.toolCallId : '';
    const toolName = typeof d.toolName === 'string' ? d.toolName : 'unknown';
    const args =
      typeof d.args === 'object' && d.args
        ? (d.args as Record<string, unknown>)
        : {};
    const result = d.result;

    const councilIdx = uiParts.findIndex((p) => p.type === 'council-debate');
    if (councilIdx !== -1) {
      const council = uiParts[councilIdx] as Record<string, unknown>;
      const agents = council.agents as
        | Array<Record<string, unknown>>
        | undefined;
      if (agents) {
        const agentIdx = agents.findIndex((a) => a.name === agentName);
        if (agentIdx !== -1) {
          if (!agents[agentIdx].toolCalls) {
            agents[agentIdx].toolCalls = [];
          }
          const toolCalls = agents[agentIdx].toolCalls as Array<
            Record<string, unknown>
          >;
          const existingTcIdx = toolCalls.findIndex(
            (tc) => tc.toolCallId === toolCallId,
          );
          if (isResult) {
            if (existingTcIdx !== -1) {
              toolCalls[existingTcIdx].status = 'complete';
              toolCalls[existingTcIdx].result = result;
            }
          } else {
            if (existingTcIdx === -1) {
              toolCalls.push({ toolCallId, toolName, args, status: 'calling' });
            }
          }
        }
      }
    }

    if (!isResult) {
      const existingIdx = uiParts.findIndex(
        (p) =>
          (p.type === 'tool-call' || p.type === 'tool-result') &&
          (p as Record<string, unknown>).toolCallId === toolCallId,
      );
      if (existingIdx === -1) {
        uiParts.push({
          type: 'tool-call',
          toolCallId,
          toolName,
          args,
          state: 'input-available',
          councilAgent: agentName,
        } as unknown as MessagePart);
      }
    } else {
      const callIdx = uiParts.findIndex(
        (p) =>
          p.type === 'tool-call' &&
          (p as Record<string, unknown>).toolCallId === toolCallId,
      );
      if (callIdx !== -1) {
        uiParts[callIdx] = {
          type: 'tool-result',
          toolCallId,
          toolName,
          args: (uiParts[callIdx] as Record<string, unknown>).args || args,
          result,
          state:
            result && typeof result === 'object' && 'error' in result
              ? 'output-error'
              : 'output-available',
          councilAgent: agentName,
        } as unknown as MessagePart;
      }
    }
  };

  return { uiParts, addPartToUI, addCouncilToUI, addCouncilToolEvent };
}

import type { MessagePart } from '@/lib/ai/types';

interface CouncilAgentState {
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

/**
 * Creates a pair of UI tracking functions that manage the parts
 * array for database persistence.
 */
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
        const agents = (existing.agents as Array<Record<string, unknown>>).map(
          (a) =>
            a.name === name
              ? {
                  ...a,
                  content,
                  rounds: [
                    ...((a.rounds as Array<{
                      round: number;
                      content: string;
                    }>) || []),
                    { round, content },
                  ],
                  status:
                    content.startsWith('[') && content.endsWith(']')
                      ? 'error'
                      : 'complete',
                }
              : a,
        );
        uiParts[existingCouncilIdx] = {
          ...existing,
          agents,
        } as unknown as MessagePart;
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

  return { uiParts, addPartToUI, addCouncilToUI };
}

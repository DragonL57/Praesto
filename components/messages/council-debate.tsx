'use client';

import { CheckIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThinking } from '@/lib/contexts/thinking';

export interface CouncilAgentToolCall {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  status: string;
  result?: unknown;
}

export interface CouncilAgentRound {
  round: number;
  content: string;
}

export interface CouncilAgent {
  name: string;
  icon: string;
  content?: string;
  status: 'pending' | 'thinking' | 'complete' | 'error';
  rounds?: CouncilAgentRound[];
  toolCalls?: CouncilAgentToolCall[];
}

interface CouncilDebateProps {
  agents: CouncilAgent[];
  isComplete: boolean;
  isSynthesizing: boolean;
  className?: string;
}

const AGENT_COLORS: Record<string, string> = {
  Researcher: 'bg-blue-500',
  Analyst: 'bg-emerald-500',
  Contrarian: 'bg-amber-500',
  Captain: 'bg-purple-500',
};

export function CouncilDebate({
  agents,
  isComplete,
  isSynthesizing,
  className,
}: CouncilDebateProps) {
  const { open } = useThinking();

  const activeCount = agents.filter((a) => a.status === 'complete').length;
  const totalCount = agents.length;
  const allComplete = activeCount === totalCount && isComplete;

  const getLabel = () => {
    if (isSynthesizing) return 'Synthesizing...';
    if (allComplete) return 'Council';
    return `Council (${activeCount}/${totalCount})`;
  };

  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground',
        className,
      )}
    >
      <div className="flex -space-x-1">
        {agents.map((agent) => (
          <div
            key={agent.name}
            className={cn(
              'flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-white',
              AGENT_COLORS[agent.name] || 'bg-muted-foreground',
              agent.status === 'thinking' && 'animate-pulse',
            )}
          >
            {agent.status === 'complete' ? (
              <CheckIcon className="size-2.5" />
            ) : (
              agent.icon
            )}
          </div>
        ))}
      </div>
      <span>{getLabel()}</span>
      <ChevronRightIcon className="size-3" />
    </button>
  );
}

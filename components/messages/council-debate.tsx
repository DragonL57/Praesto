'use client';

import { useState } from 'react';
import { ChevronDownIcon, Loader2Icon, SearchIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Markdown } from '../markdown';

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
  Researcher: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  Analyst: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  Contrarian: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  Captain: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
};

const AGENT_FALLBACK_COLORS: Record<string, string> = {
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
  const [isOpen, setIsOpen] = useState(false);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());

  const activeCount = agents.filter((a) => a.status === 'complete').length;
  const totalCount = agents.length;
  const allComplete = activeCount === totalCount && isComplete;
  const totalToolCalls = agents.reduce(
    (sum, a) => sum + (a.toolCalls?.length || 0),
    0,
  );

  const getHeaderLabel = () => {
    if (isSynthesizing) return 'Synthesizing answer...';
    if (allComplete) return 'Council Debate';
    return `Council debating... (${activeCount}/${totalCount})`;
  };

  const toggleAgent = (name: string) => {
    setExpandedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <div className={cn('not-prose w-full', className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="group flex w-full items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground">
          <div className="flex -space-x-1.5">
            {agents.map((agent) => {
              const colorClass =
                AGENT_FALLBACK_COLORS[agent.name] || 'bg-muted-foreground';
              return (
                <div
                  key={agent.name}
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full border-2 border-background text-[10px] text-white',
                    colorClass,
                    agent.status === 'thinking' && 'animate-pulse',
                  )}
                  title={agent.name}
                >
                  {agent.status === 'complete' ? (
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : agent.status === 'thinking' ? (
                    <Loader2Icon className="h-3 w-3 animate-spin" />
                  ) : (
                    <span className="text-[8px] opacity-60">{agent.icon}</span>
                  )}
                </div>
              );
            })}
          </div>
          <span className="flex-1 text-left font-medium">
            {getHeaderLabel()}
          </span>
          {totalToolCalls > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <SearchIcon className="h-3 w-3" />
              {totalToolCalls}
            </span>
          )}
          {isSynthesizing && (
            <Loader2Icon className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
          <ChevronDownIcon className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-2 space-y-3">
          {agents.map((agent) => {
            const isExpanded = expandedAgents.has(agent.name);
            const hasRounds = agent.rounds && agent.rounds.length > 1;
            const hasTools = agent.toolCalls && agent.toolCalls.length > 0;

            return (
              <div
                key={agent.name}
                className={cn(
                  'rounded-lg border p-3 transition-colors',
                  AGENT_COLORS[agent.name] ||
                    'bg-muted/20 text-muted-foreground border-border/50',
                  agent.status === 'thinking' && 'animate-pulse',
                )}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <div
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white',
                      AGENT_FALLBACK_COLORS[agent.name] ||
                        'bg-muted-foreground',
                    )}
                  >
                    {agent.icon}
                  </div>
                  <span className="text-sm font-medium">{agent.name}</span>
                  {hasRounds && (
                    <span className="text-xs text-muted-foreground">
                      {agent.rounds!.length} rounds
                    </span>
                  )}
                  {hasTools && (
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <SearchIcon className="h-3 w-3" />
                      {agent.toolCalls!.length}
                    </span>
                  )}
                  <span className="ml-auto text-xs opacity-60">
                    {agent.status === 'complete'
                      ? 'Complete'
                      : agent.status === 'thinking'
                        ? 'Thinking...'
                        : agent.status === 'error'
                          ? 'Error'
                          : 'Waiting'}
                  </span>
                </div>

                {hasTools && (
                  <div className="mb-2 space-y-1">
                    {agent.toolCalls!.map((tc) => (
                      <div
                        key={tc.toolCallId}
                        className="flex items-center gap-1.5 rounded bg-background/50 px-2 py-1 text-xs"
                      >
                        <SearchIcon
                          className={cn(
                            'h-3 w-3',
                            tc.status === 'complete'
                              ? 'text-green-500'
                              : 'animate-spin text-muted-foreground',
                          )}
                        />
                        <span className="text-muted-foreground">
                          {tc.toolName}
                        </span>
                        {tc.args &&
                          typeof tc.args === 'object' &&
                          'query' in tc.args && (
                            <span className="truncate text-muted-foreground/70">
                              &ldquo;
                              {String(tc.args.query).substring(0, 50)}
                              {String(tc.args.query).length > 50 ? '...' : ''}
                              &rdquo;
                            </span>
                          )}
                        {tc.status === 'complete' && (
                          <svg
                            className="ml-auto h-3 w-3 text-green-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {hasRounds ? (
                  <div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAgent(agent.name);
                      }}
                      className="flex w-full items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <ChevronDownIcon
                        className={cn(
                          'h-3 w-3 transition-transform',
                          isExpanded && 'rotate-180',
                        )}
                      />
                      {isExpanded ? 'Hide debate rounds' : 'Show debate rounds'}
                    </button>
                    {isExpanded && (
                      <div className="mt-2 space-y-2">
                        {agent.rounds!.map((r) => (
                          <div
                            key={r.round}
                            className="rounded border border-border/30 bg-background/50 p-2 text-xs"
                          >
                            <div className="mb-1 font-medium text-muted-foreground">
                              Round {r.round}
                            </div>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <Markdown>{r.content}</Markdown>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  agent.content && (
                    <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                      <Markdown>{agent.content}</Markdown>
                    </div>
                  )
                )}

                {agent.status === 'thinking' && !agent.content && !hasTools && (
                  <div className="flex items-center gap-2 text-xs opacity-60">
                    <Loader2Icon className="h-3 w-3 animate-spin" />
                    <span>Analyzing...</span>
                  </div>
                )}
              </div>
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

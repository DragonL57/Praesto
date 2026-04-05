'use client';

import { useState } from 'react';
import {
  Loader2Icon,
  XIcon,
  SearchIcon,
  CheckIcon,
  BrainIcon,
  ChevronDownIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Markdown } from '../markdown';
import type { ThinkingItem } from '@/lib/contexts/thinking';

interface ThinkingSidebarProps {
  items: ThinkingItem[];
  isSynthesizing: boolean;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  reasoning: 'Thinking',
  'tool-call': 'Tool call',
  'tool-result': 'Tool result',
  'council-stage': 'Council',
};

function StatusDot({ status }: { status?: string }) {
  if (status === 'active') {
    return (
      <div className="absolute left-1.5 top-2.5 flex size-4 items-center justify-center rounded-full bg-blue-500/20">
        <Loader2Icon className="size-2.5 animate-spin text-blue-500" />
      </div>
    );
  }
  if (status === 'complete') {
    return (
      <div className="absolute left-1.5 top-2.5 flex size-4 items-center justify-center rounded-full bg-green-500/20">
        <CheckIcon className="size-2.5 text-green-500" />
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="absolute left-1.5 top-2.5 flex size-4 items-center justify-center rounded-full bg-red-500/20">
        <XIcon className="size-2.5 text-red-500" />
      </div>
    );
  }
  return (
    <div className="absolute left-1.5 top-2.5 flex size-4 items-center justify-center rounded-full">
      <div className="size-1.5 rounded-full bg-muted-foreground/40" />
    </div>
  );
}

function ThinkingItemCard({ item }: { item: ThinkingItem }) {
  const [isExpanded, setIsExpanded] = useState(
    item.status === 'active' || item.status === 'pending',
  );

  const hasExpandableContent =
    item.content && item.content.length > 80 && item.type !== 'tool-result';

  return (
    <div className="relative pl-8 py-1.5">
      <StatusDot status={item.status} />

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
            {TYPE_LABELS[item.type] || item.type}
          </span>
          {item.type === 'tool-call' && item.metadata?.toolName ? (
            <span className="text-[10px] text-muted-foreground">
              {item.metadata.toolName as string}
            </span>
          ) : null}
        </div>

        {item.type === 'tool-call' && item.metadata?.query ? (
          <p className="text-xs text-foreground">
            {item.metadata.query as string}
          </p>
        ) : null}

        {item.type === 'tool-result' &&
        item.metadata?.resultCount !== undefined ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <SearchIcon className="size-3" />
            <span>{item.metadata.resultCount as string} results found</span>
          </div>
        ) : null}

        {item.type === 'council-stage' && item.metadata?.agent ? (
          <p className="text-xs font-medium text-foreground">
            {item.metadata.agent as string}
            {item.metadata.round ? ` — Round ${item.metadata.round}` : ''}
          </p>
        ) : null}

        {item.content && item.type !== 'tool-result' && (
          <div>
            {hasExpandableContent ? (
              <button
                type="button"
                onClick={() => setIsExpanded((p) => !p)}
                className="flex w-full items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDownIcon
                  className={cn(
                    'h-3 w-3 transition-transform',
                    isExpanded && 'rotate-180',
                  )}
                />
                {isExpanded ? 'Collapse' : 'Expand'}
              </button>
            ) : null}

            {(isExpanded || !hasExpandableContent) && (
              <div
                className={cn(
                  'overflow-hidden rounded border border-border/30 bg-muted/20 text-xs transition-all duration-200',
                  hasExpandableContent && 'mt-1',
                )}
              >
                <div
                  className={cn(
                    'overflow-y-auto',
                    hasExpandableContent ? 'max-h-64 p-2' : 'max-h-32 p-2',
                  )}
                >
                  <Markdown>{item.content}</Markdown>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ThinkingSidebar({
  items,
  isSynthesizing,
  onClose,
}: ThinkingSidebarProps) {
  const totalItems = items.length;
  const completedItems = items.filter((i) => i.status === 'complete').length;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
        role="presentation"
        aria-hidden
      />
      <div className="fixed right-0 top-0 z-50 h-full w-[22rem] border-l border-border/50 bg-background shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2">
            <BrainIcon className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Thinking Process</span>
            <span className="text-[10px] text-muted-foreground/60">
              ({completedItems}/{totalItems})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close thinking sidebar"
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2Icon className="size-5 animate-spin" />
              <span>Thinking...</span>
            </div>
          ) : (
            <div className="px-4 py-3">
              <div className="relative">
                <div className="absolute left-3.5 inset-y-0 w-px bg-border/50" />
                <div className="space-y-1">
                  {items.map((item) => (
                    <ThinkingItemCard key={item.id} item={item} />
                  ))}

                  {isSynthesizing && (
                    <div className="relative pl-8 py-1.5">
                      <div className="absolute left-1.5 top-2.5 flex size-4 items-center justify-center rounded-full bg-purple-500/20">
                        <Loader2Icon className="size-2.5 animate-spin text-purple-500" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-purple-500/60">
                          Synthesis
                        </span>
                      </div>
                      <p className="text-xs text-foreground">
                        Writing final answer...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

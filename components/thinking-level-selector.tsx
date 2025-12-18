'use client';

import { startTransition, useCallback, useEffect, useMemo, useOptimistic, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useLocalStorage } from 'usehooks-ts';

import { CheckCircleFillIcon, ChevronDownIcon } from './icons';

// Thinking levels for Gemini 3 models
const thinkingLevels = [
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Fastest - minimal thinking, best for chat',
    flashOnly: true,
  },
  {
    id: 'low',
    name: 'Low',
    description: 'Fast - simple instruction following',
    flashOnly: false,
  },
  {
    id: 'medium',
    name: 'Medium',
    description: 'Balanced - good for most tasks',
    flashOnly: true,
  },
  {
    id: 'high',
    name: 'High',
    description: 'Deepest reasoning - best quality',
    flashOnly: false,
  },
];

export function ThinkingLevelSelector({
  selectedModelId,
  className,
}: {
  selectedModelId: string;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  
  // Determine if current model is Gemini and if it's Flash variant
  const isGeminiModel = selectedModelId.includes('gemini-3');
  const isFlashModel = selectedModelId.includes('flash');
  
  // Use local storage to persist thinking level selection
  const [localThinkingLevel, setLocalThinkingLevel] = useLocalStorage('thinking-level', 'high');
  
  // This optimistic state handles immediate UI updates
  const [optimisticThinkingLevel, setOptimisticThinkingLevel] = useOptimistic(localThinkingLevel);

  // Update server cookie without causing UI refresh
  const saveThinkingLevelCookie = useCallback(async (level: string) => {
    try {
      await fetch('/api/set-thinking-level-cookie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ thinkingLevel: level }),
      });
    } catch (error) {
      console.error('Failed to save thinking level preference:', error);
    }
  }, []);

  // Sync local storage with server cookie when component mounts
  useEffect(() => {
    saveThinkingLevelCookie(localThinkingLevel);
  }, [localThinkingLevel, saveThinkingLevelCookie]);

  const selectedThinkingLevel = useMemo(
    () => thinkingLevels.find((level) => level.id === optimisticThinkingLevel),
    [optimisticThinkingLevel],
  );

  // Filter available levels based on model type
  const availableLevels = useMemo(() => {
    if (isFlashModel) {
      return thinkingLevels; // Flash supports all levels
    }
    return thinkingLevels.filter(level => !level.flashOnly); // Pro only supports low/high
  }, [isFlashModel]);

  // Don't show selector if not a Gemini model
  if (!isGeminiModel) {
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          className,
        )}
      >
        <Button
          data-testid="thinking-level-selector"
          variant="outline"
          className="h-8 md:h-10 px-2 md:px-3 flex gap-1 md:gap-2 items-center text-xs md:text-sm"
        >
          <span className="hidden md:inline text-muted-foreground">Thinking:</span>
          <span className="truncate max-w-[60px] md:max-w-none">{selectedThinkingLevel?.name}</span>
          <ChevronDownIcon size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[300px]">
        {availableLevels.map((level) => {
          const { id } = level;

          return (
            <DropdownMenuItem
              data-testid={`thinking-level-selector-item-${id}`}
              key={id}
              onSelect={() => {
                setOpen(false);

                startTransition(() => {
                  // Update local state first - this is immediate and doesn't refresh
                  setOptimisticThinkingLevel(id);
                  setLocalThinkingLevel(id);
                  
                  // Then update server cookie in background without causing refresh
                  saveThinkingLevelCookie(id);
                });
              }}
              data-active={id === optimisticThinkingLevel}
              asChild
            >
              <button
                type="button"
                className="gap-4 group/item flex flex-row justify-between items-center w-full py-2"
              >
                <div className="flex flex-col gap-1 items-start">
                  <div className="text-base">{level.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {level.description}
                  </div>
                </div>

                <div className="text-foreground dark:text-foreground opacity-0 group-data-[active=true]/item:opacity-100">
                  <CheckCircleFillIcon size={20} />
                </div>
              </button>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

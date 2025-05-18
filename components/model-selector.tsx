'use client';

import { startTransition, useCallback, useEffect, useMemo, useOptimistic, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { chatModels } from '@/lib/ai/models';
import { cn } from '@/lib/utils';
import { useLocalStorage } from 'usehooks-ts';

import { CheckCircleFillIcon, ChevronDownIcon } from './icons';

export function ModelSelector({
  selectedModelId,
  className,
}: {
  selectedModelId: string;
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false);
  // Use local storage to persist model selection without server action
  const [localModelId, setLocalModelId] = useLocalStorage('selected-chat-model-id', selectedModelId);
  
  // This optimistic state handles immediate UI updates
  const [optimisticModelId, setOptimisticModelId] = useOptimistic(localModelId);

  // Update server cookie without causing UI refresh
  const saveModelCookie = useCallback(async (modelId: string) => {
    try {
      // Use fetch API directly instead of server action to avoid any page transitions
      await fetch('/api/set-model-cookie', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model: modelId }),
      });
    } catch (error) {
      console.error('Failed to save model preference:', error);
    }
  }, []);

  // Sync local storage with server cookie when component mounts
  useEffect(() => {
    if (localModelId !== selectedModelId) {
      saveModelCookie(localModelId);
    }
  }, [localModelId, selectedModelId, saveModelCookie]);

  const selectedChatModel = useMemo(
    () => chatModels.find((chatModel) => chatModel.id === optimisticModelId),
    [optimisticModelId],
  );

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
          data-testid="model-selector"
          variant="outline"
          className="md:px-3 px-3 h-11 md:h-11 flex gap-2 items-center border-transparent hover:border-transparent focus:border-transparent"
        >
          <span className="text-base">{selectedChatModel?.name}</span>
          <ChevronDownIcon size={20} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[300px]">
        {chatModels.map((chatModel) => {
          const { id } = chatModel;

          return (
            <DropdownMenuItem
              data-testid={`model-selector-item-${id}`}
              key={id}
              onSelect={() => {
                setOpen(false);

                startTransition(() => {
                  // Update local state first - this is immediate and doesn't refresh
                  setOptimisticModelId(id);
                  setLocalModelId(id);
                  
                  // Then update server cookie in background without causing refresh
                  saveModelCookie(id);
                });
              }}
              data-active={id === optimisticModelId}
              asChild
            >
              <button
                type="button"
                className="gap-4 group/item flex flex-row justify-between items-center w-full py-2"
              >
                <div className="flex flex-col gap-1 items-start">
                  <div className="text-base">{chatModel.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {chatModel.description}
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
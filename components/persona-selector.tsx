'use client';

import { useMemo, useState, useEffect } from 'react';
import { useLocalStorage } from 'usehooks-ts';
import { RiQuillPenAiLine } from "react-icons/ri";
import { DEFAULT_PERSONA_ID, personas } from '@/lib/ai/personas';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CheckCircleFillIcon, ChevronDownIcon } from './icons';

interface PersonaSelectorProps {
  className?: string;
}

export default function PersonaSelector({ className }: PersonaSelectorProps) {
  // First, always start with the default persona for server-side rendering
  const defaultPersona = personas.find(p => p.id === DEFAULT_PERSONA_ID) || personas[0];
  
  // State to manage the displayed name during client-side rendering
  const [mounted, setMounted] = useState(false);
  
  // Use localStorage to persist the selected persona (only runs client-side)
  const [selectedPersonaId, setSelectedPersonaId] = useLocalStorage(
    'selected-persona-id',
    DEFAULT_PERSONA_ID
  );
  
  // State to manage dropdown open/close
  const [isOpen, setIsOpen] = useState(false);
  
  // This is what will be shown after client-side hydration
  const selectedPersona = useMemo(() => {
    if (!mounted) return defaultPersona;
    return personas.find((persona) => persona.id === selectedPersonaId) || defaultPersona;
  }, [selectedPersonaId, defaultPersona, mounted]);

  // After mounting, mark the component as mounted
  useEffect(() => {
    setMounted(true);
  }, []);

  // Function to handle selection
  const handlePersonaSelect = (id: string) => {
    setSelectedPersonaId(id);
    setIsOpen(false); // Close the dropdown after selection
  };

  return (
    <TooltipProvider delayDuration={50} skipDelayDuration={0}>
      <Tooltip>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger
              asChild
              className={cn(
                'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
                className,
              )}
            >
              <Button
                data-testid="persona-selector"
                variant="outline"
                className="px-2 h-8 sm:h-9 flex gap-1.5 items-center border border-zinc-300 dark:border-zinc-700 bg-muted rounded-full hover:bg-zinc-200/80 dark:hover:bg-zinc-800/90 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all duration-150"
                title="Select AI personality style"
                aria-label="Select AI personality"
              >
                <RiQuillPenAiLine className="size-4" />
                <span className="text-sm hidden sm:inline">
                  {/* Always render default persona name for SSR, will be updated after hydration */}
                  {mounted ? selectedPersona?.name : defaultPersona.name}
                </span>
                <ChevronDownIcon size={16} />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Select AI personality
          </TooltipContent>
          <DropdownMenuContent align="start" className="min-w-[260px]">
            {personas.map((persona) => {
              const { id } = persona;
              const isActive = mounted ? id === selectedPersonaId : id === DEFAULT_PERSONA_ID;

              return (
                <DropdownMenuItem
                  data-testid={`persona-selector-item-${id}`}
                  key={id}
                  onSelect={(e) => {
                    e.preventDefault();
                    handlePersonaSelect(id);
                  }}
                  data-active={isActive}
                  asChild
                >
                  <button
                    type="button"
                    className="gap-4 group/item flex flex-row justify-between items-center w-full py-2"
                  >
                    <div className="flex flex-col gap-1 items-start">
                      <div className="text-base">{persona.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {persona.description}
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
      </Tooltip>
    </TooltipProvider>
  );
}
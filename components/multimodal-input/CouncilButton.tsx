'use client';

import React, { memo } from 'react';
import type { ChatStatus } from '@/lib/ai/types';

import { Button } from '../ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

interface CouncilButtonProps {
  councilMode: boolean;
  onCouncilModeChange: (enabled: boolean) => void;
  status: ChatStatus;
}

function PureCouncilButton({
  councilMode,
  onCouncilModeChange,
  status,
}: CouncilButtonProps) {
  return (
    <TooltipProvider delayDuration={50} skipDelayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className={`rounded-md rounded-bl-lg p-2 md:p-[7px] h-fit border ${
              councilMode
                ? 'border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'
                : 'border-input dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200'
            }`}
            onClick={(event) => {
              event.preventDefault();
              onCouncilModeChange(!councilMode);
            }}
            disabled={status !== 'ready' && status !== 'idle'}
            variant="ghost"
            aria-label="Council mode"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="sr-only">Council mode</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {councilMode
            ? 'Council Mode ON: multi-agent debate enabled'
            : 'Enable Council Mode for multi-agent debate'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const CouncilButton = memo(PureCouncilButton);

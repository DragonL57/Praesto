'use client';

import React, { memo } from 'react';
import type { ChatStatus } from '@/lib/ai/types';

import { Button } from '../ui/button';
import { PaperclipIcon } from '../icons';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

interface AttachmentsButtonProps {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: ChatStatus;
}

function PureAttachmentsButton({
  fileInputRef,
  status,
}: AttachmentsButtonProps) {
  return (
    <TooltipProvider delayDuration={50} skipDelayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            data-testid="attachments-button"
            className="rounded-md rounded-bl-lg p-2 md:p-[7px] h-fit border border-input dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200"
            onClick={(event) => {
              event.preventDefault();
              fileInputRef.current?.click();
            }}
            disabled={status !== 'ready' && status !== 'idle'}
            variant="ghost"
            aria-label="Attach files"
          >
            <PaperclipIcon size={18} />
            <span className="sr-only">Attach files</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Attach files</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const AttachmentsButton = memo(PureAttachmentsButton);

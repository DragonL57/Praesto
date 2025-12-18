'use client';

import React, { memo } from 'react';
import { Button } from '../ui/button';
import { StopIcon } from '../icons';
import type { SetMessagesFunction } from '@/lib/ai/types';

interface StopButtonProps {
  stop: () => void;
  setMessages: SetMessagesFunction;
}

function PureStopButton({ stop, setMessages }: StopButtonProps) {
  return (
    <Button
      data-testid="stop-button"
      className="rounded-full p-2.5 md:p-2 h-fit border-0 bg-red-500 dark:bg-red-600 text-white hover:bg-red-600 dark:hover:bg-red-700 shadow-sm transition-colors"
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => messages);
      }}
      aria-label="Stop generating"
    >
      <StopIcon size={18} />
      <span className="sr-only">Stop generating</span>
    </Button>
  );
}

export const StopButton = memo(PureStopButton);

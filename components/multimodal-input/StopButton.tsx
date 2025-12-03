'use client';

import React, { memo } from 'react';
import { Button } from '../ui/button';
import { StopIcon } from '../icons';
import type { UseChatHelpers } from '@ai-sdk/react';

interface StopButtonProps {
  stop: () => void;
  setMessages: UseChatHelpers['setMessages'];
}

function PureStopButton({ stop, setMessages }: StopButtonProps) {
  return (
    <Button
      data-testid="stop-button"
      className="rounded-full p-2 h-fit border border-red-200 dark:border-red-700 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/50 shadow-sm transition-colors"
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => messages);
      }}
      aria-label="Stop generating"
    >
      <StopIcon size={16} />
      <span className="sr-only">Stop generating</span>
    </Button>
  );
}

export const StopButton = memo(PureStopButton);

'use client';

import React, { memo } from 'react';
import { Button } from '../ui/button';
import { ArrowUpIcon } from '../icons';

interface SendButtonProps {
  submitForm: () => void;
  input: string;
  uploadQueue: Array<string>;
}

function PureSendButton({ submitForm, input, uploadQueue }: SendButtonProps) {
  return (
    <Button
      data-testid="send-button"
      className="rounded-full p-2 h-fit border border-transparent bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-colors"
      onClick={(event) => {
        event.preventDefault();
        submitForm();
      }}
      disabled={input.length === 0 || uploadQueue.length > 0}
      aria-label="Send message"
    >
      <ArrowUpIcon size={16} />
      <span className="sr-only">Send message</span>
    </Button>
  );
}

export const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.uploadQueue.length !== nextProps.uploadQueue.length)
    return false;
  if (prevProps.input !== nextProps.input) return false;
  return true;
});
'use client';

import { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Message, TextPart, ReloadFunction, SetMessagesFunction, MessagePart, ChatRequestOptions } from '@/lib/ai/types';
import { toast } from 'sonner';

import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { deleteTrailingMessages } from '@/lib/actions/chat';

export type MessageEditorProps = {
  message: Message;
  setMode: Dispatch<SetStateAction<'view' | 'edit'>>;
  setMessages: SetMessagesFunction;
  reload: ReloadFunction;
  append: (
    message: { role: 'user' | 'assistant'; parts: MessagePart[] },
    options?: ChatRequestOptions
  ) => Promise<string | null | undefined>;
};

export function MessageEditor({
  message,
  setMode,
  setMessages,
  reload: _reload,
  append,
}: MessageEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const extractMessageText = () => {
    if (message.parts && message.parts.length > 0) {
      return message.parts
        .filter((part): part is TextPart => part.type === 'text')
        .map((part) => part.text)
        .join('\n')
        .trim();
    }

    return '';
  };

  const [draftContent, setDraftContent] = useState<string>(
    extractMessageText(),
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
    }
  }, []);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraftContent(event.target.value);
    adjustHeight();
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <Textarea
        data-testid="message-editor"
        id="message-edit-field"
        name="message-edit-content"
        ref={textareaRef}
        className="bg-transparent outline-none overflow-hidden resize-none !text-base rounded-xl w-full"
        value={draftContent}
        onChange={handleInput}
      />

      <div className="flex flex-row gap-2 justify-end">
        <Button
          variant="outline"
          className="h-fit py-2 px-3"
          onClick={() => {
            setMode('view');
          }}
        >
          Cancel
        </Button>
        <Button
          data-testid="message-editor-send-button"
          variant="default"
          className="h-fit py-2 px-3"
          disabled={isSubmitting}
          onClick={async () => {
            setIsSubmitting(true);

            try {
              // 1. Delete trailing messages from DB
              await deleteTrailingMessages({ id: message.id });

              setMode('view');

              // 2. Trigger a new generation by appending the updated message
              // We pass the same ID so the hook knows to replace the old message 
              // and truncate anything after it.
              await append({
                id: message.id,
                role: 'user',
                parts: [{ type: 'text', text: draftContent }],
              });
            } catch (error) {
              console.error('Failed to submit edited message:', error);
              toast.error('Failed to update message. Please try again.');
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          {isSubmitting ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </div>
  );
}

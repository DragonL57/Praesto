'use client';

import type { Message } from 'ai';
import { Button } from './ui/button';
import { useState, useRef, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Textarea } from './ui/textarea';
import { deleteTrailingMessages } from '@/app/(chat)/actions';
import type { UseChatHelpers } from '@ai-sdk/react';

// Define proper types for message parts
interface TextMessagePart {
  type: 'text';
  text: string;
}

interface ImageMessagePart {
  type: 'image';
  image: string;
}

// Prefix with underscore since it's not directly used yet but helps with type safety
type _MessagePart = TextMessagePart | ImageMessagePart;

export type MessageEditorProps = {
  message: Message;
  setMode: Dispatch<SetStateAction<'view' | 'edit'>>;
  setMessages: UseChatHelpers['setMessages'];
  reload: UseChatHelpers['reload'];
};

export function MessageEditor({
  message,
  setMode,
  setMessages,
  reload,
}: MessageEditorProps) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Extract text content from message parts instead of using message.content which might be empty
  const extractMessageText = () => {
    // If message.content has value, use it
    if (message.content && message.content.trim() !== '') {
      return message.content;
    }

    // Otherwise extract text from message parts
    if (message.parts && message.parts.length > 0) {
      return message.parts
        .filter((part): part is TextMessagePart => part.type === 'text')
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

            await deleteTrailingMessages({
              id: message.id,
            });

            // @ts-expect-error todo: support UIMessage in setMessages
            setMessages((messages) => {
              const index = messages.findIndex((m) => m.id === message.id);

              if (index !== -1) {
                const updatedMessage = {
                  ...message,
                  content: draftContent,
                  parts: [{ type: 'text', text: draftContent }],
                };

                return [...messages.slice(0, index), updatedMessage];
              }

              return messages;
            });

            setMode('view');
            reload();
          }}
        >
          {isSubmitting ? 'Sending...' : 'Send'}
        </Button>
      </div>
    </div>
  );
}
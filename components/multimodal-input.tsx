'use client';

import type { Attachment, UIMessage } from 'ai';
import cx from 'classnames';
import type React from 'react';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
  type ChangeEvent,
  memo,
} from 'react';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';

import { ArrowUpIcon, PaperclipIcon, StopIcon } from './icons';
import { PreviewAttachment } from './preview-attachment';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { SuggestedActions } from './suggested-actions';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@ai-sdk/react';
import { useIsMobile } from '@/hooks/use-mobile';
import { LuArrowDownToLine } from "react-icons/lu";

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  append,
  handleSubmit,
  className,
  messagesContainerRef,
  messagesEndRef,
}: {
  chatId: string;
  input: UseChatHelpers['input'];
  setInput: UseChatHelpers['setInput'];
  status: UseChatHelpers['status'];
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers['setMessages'];
  append: UseChatHelpers['append'];
  handleSubmit: UseChatHelpers['handleSubmit'];
  className?: string;
  messagesContainerRef?: React.RefObject<HTMLDivElement | null>;
  messagesEndRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();
      
      // Only focus on desktop, not on mobile
      if (!isMobile && width && width >= 768) {
        textareaRef.current.focus();
      }
    }
  }, [isMobile, width]);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  };

  const resetHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '98px';
    }
  };

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    'input',
    '',
  );

  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration
      const finalValue = domValue || localStorageInput || '';
      setInput(finalValue);
      adjustHeight();
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
    adjustHeight();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);

  const submitForm = useCallback(() => {
    window.history.replaceState({}, '', `/chat/${chatId}`);

    handleSubmit(undefined, {
      experimental_attachments: attachments,
    });

    setAttachments([]);
    setLocalStorageInput('');
    resetHeight();

    if (width && width > 768) {
      textareaRef.current?.focus();
    }
  }, [
    attachments,
    handleSubmit,
    setAttachments,
    setLocalStorageInput,
    width,
    chatId,
  ]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;

        return {
          url,
          name: pathname,
          contentType: contentType,
        };
      }
      const { error } = await response.json();
      toast.error(error);
    } catch (uploadError) {
      console.error('Error uploading file:', uploadError)
      toast.error('Error uploading file. Please try again.')
    }
  };

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined,
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error('Error uploading files!', error);
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments],
  );

  const handlePaste = useCallback(
    async (event: React.ClipboardEvent) => {
      if (status !== 'ready') return;

      const items = event.clipboardData?.items;
      if (!items) return;

      const imageItems = Array.from(items).filter((item) =>
        item.type.startsWith('image/'),
      );

      if (imageItems.length === 0) return;

      // Prevent default paste behavior for images
      event.preventDefault();

      const imageFiles: File[] = [];

      for (const item of imageItems) {
        const file = item.getAsFile();
        if (file) {
          const timestamp = new Date().getTime();
          // Create a new file with a more descriptive name
          const renamedFile = new File(
            [file],
            `pasted-image-${timestamp}.${file.name.split('.').pop() || 'png'}`,
            { type: file.type },
          );
          imageFiles.push(renamedFile);
        }
      }

      if (imageFiles.length === 0) return;

      setUploadQueue(imageFiles.map((file) => file.name));

      try {
        const uploadPromises = imageFiles.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined,
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error('Error uploading pasted images!', error);
        toast.error('Failed to upload pasted image, please try again!');
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments, status],
  );

  return (
    <div className="relative w-full flex flex-col gap-4">
      {messages.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0 && (
          <SuggestedActions append={append} chatId={chatId} />
        )}

      {messagesContainerRef && messagesEndRef && (
        <ScrollButton
          containerRef={messagesContainerRef}
          endRef={messagesEndRef}
        />
      )}

      <input
        type="file"
        className="fixed -top-4 -left-4 size-0.5 opacity-0 pointer-events-none"
        ref={fileInputRef}
        multiple
        onChange={handleFileChange}
        tabIndex={-1}
        aria-label="File upload"
        id="file-upload"
      />

      {(attachments.length > 0 || uploadQueue.length > 0) && (
        <div
          data-testid="attachments-preview"
          className="flex flex-row gap-2 overflow-x-auto items-end"
          style={{ scrollbarWidth: 'thin' }}
        >
          {attachments.map((attachment) => (
            <PreviewAttachment key={attachment.url} attachment={attachment} />
          ))}

          {uploadQueue.map((filename) => (
            <PreviewAttachment
              key={filename}
              attachment={{
                url: '',
                name: filename,
                contentType: '',
              }}
              isUploading={true}
            />
          ))}
        </div>
      )}

      <Textarea
        data-testid="multimodal-input"
        ref={textareaRef}
        placeholder="Send a message..."
        value={input}
        onChange={handleInput}
        onPaste={handlePaste}
        name="message-input"
        id="message-input"
        className={cx(
          'min-h-[24px] max-h-[calc(75dvh)] overflow-hidden resize-none rounded-3xl !text-base bg-muted pb-10 dark:border-zinc-700',
          className,
        )}
        rows={2}
        onKeyDown={(event) => {
          if (
            event.key === 'Enter' &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();

            if (status !== 'ready') {
              toast.error('Please wait for the model to finish its response!');
            } else {
              submitForm();
            }
          }
        }}
      />

      <div className="absolute bottom-0 p-2 w-fit flex flex-row justify-start">
        <AttachmentsButton fileInputRef={fileInputRef} status={status} />
      </div>

      <div className="absolute bottom-0 right-0 p-2 w-fit flex flex-row justify-end">
        {(status === 'submitted' || status === 'streaming') ? (
          <StopButton stop={stop} setMessages={setMessages} />
        ) : (
          <SendButton
            input={input}
            submitForm={submitForm}
            uploadQueue={uploadQueue}
          />
        )}
      </div>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) return false;
    if (prevProps.status !== nextProps.status) return false;
    if (!equal(prevProps.attachments, nextProps.attachments)) return false;

    return true;
  },
);

function PureAttachmentsButton({
  fileInputRef,
  status,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: UseChatHelpers['status'];
}) {
  return (
    <Button
      data-testid="attachments-button"
      className="rounded-md rounded-bl-lg p-[7px] h-fit dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200"
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      disabled={status !== 'ready'}
      variant="ghost"
      aria-label="Attach files"
    >
      <PaperclipIcon size={16} />
      <span className="sr-only">Attach files</span>
    </Button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers['setMessages'];
}) {
  return (
    <Button
      data-testid="stop-button"
      className="rounded-full p-2 h-fit border dark:border-zinc-600"
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

const StopButton = memo(PureStopButton);

function PureSendButton({
  submitForm,
  input,
  uploadQueue,
}: {
  submitForm: () => void;
  input: string;
  uploadQueue: Array<string>;
}) {
  return (
    <Button
      data-testid="send-button"
      className="rounded-full p-2 h-fit border dark:border-zinc-600"
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

const SendButton = memo(PureSendButton, (prevProps, nextProps) => {
  if (prevProps.uploadQueue.length !== nextProps.uploadQueue.length)
    return false;
  if (prevProps.input !== nextProps.input) return false;
  return true;
});

function ScrollButton({
  containerRef,
  endRef,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  endRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [shouldRender, setShouldRender] = useState<boolean>(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const checkIfShouldShowButton = () => {
      if (!container) return;

      // Check if we're not at the bottom
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // Show button if we're more than 200px from bottom
      setIsVisible(distanceFromBottom > 200);
    };

    // Initial check
    checkIfShouldShowButton();

    // Set up scroll listener
    container.addEventListener('scroll', checkIfShouldShowButton);

    // Cleanup
    return () => {
      container.removeEventListener('scroll', checkIfShouldShowButton);
    };
  }, [containerRef]);

  // Control rendering based on visibility for fade in/out effect
  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300); // Match this to the transition duration

      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const scrollToBottom = () => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50">
      <Button
        onClick={scrollToBottom}
        className={`rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-all duration-300 size-8 p-0 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
        size="icon"
        aria-label="Scroll to bottom"
      >
        <LuArrowDownToLine size={16} className="text-primary-foreground" />
      </Button>
    </div>
  );
}

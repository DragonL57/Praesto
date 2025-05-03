'use client';

import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import cx from 'classnames';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';
import type { Attachment, UIMessage } from 'ai';
import type { UseChatHelpers } from '@ai-sdk/react';
import equal from 'fast-deep-equal';

import { PreviewAttachment } from '../preview-attachment';
import { Textarea } from '../ui/textarea';
import { SuggestedActions } from '../suggested-actions';
import { useIsMobile } from '@/hooks/use-mobile';
import PersonaSelector from '../persona-selector';

import { SendButton } from './SendButton';
import { StopButton } from './StopButton';
import { AttachmentsButton } from './AttachmentsButton';
import { SpeechToTextButton } from './SpeechToTextButton';
import { ScrollButton } from './ScrollButton';
import { uploadFile } from './utils';
import type { SpeechRecognition } from './types';

interface MultimodalInputProps {
  chatId: string;
  input: UseChatHelpers['input'];
  setInput: UseChatHelpers['setInput'];
  status: UseChatHelpers['status'];
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: React.Dispatch<React.SetStateAction<Array<Attachment>>>;
  messages: Array<UIMessage>;
  setMessages: UseChatHelpers['setMessages'];
  append: UseChatHelpers['append'];
  handleSubmit: UseChatHelpers['handleSubmit'];
  className?: string;
  messagesContainerRef?: React.RefObject<HTMLDivElement | null>;
  messagesEndRef?: React.RefObject<HTMLDivElement | null>;
}

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
}: MultimodalInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Destructure height with an underscore as it's not directly used
  const { width, height: _height } = useWindowSize();
  const isMobile = useIsMobile();

  // Initialize VirtualKeyboard API if available - Simplified
  useEffect(() => {
    if (!isMobile) return;

    // Check if the VirtualKeyboard API is available
    if ('virtualKeyboard' in navigator && navigator.virtualKeyboard) {
      try {
        // Opt out of the automatic virtual keyboard behavior
        // This allows us to use CSS env vars to handle layout adjustments
        navigator.virtualKeyboard.overlaysContent = true;
        console.log('VirtualKeyboard API enabled with overlaysContent=true');
      } catch (error) {
        console.warn('Failed to initialize VirtualKeyboard API:', error);
      }
    }
  }, [isMobile]);

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
      // Remove auto-height adjustment to allow scrolling instead
      // Only adjust height up to a maximum, then enable scrollbar
      const maxHeight = 200; // Maximum height in pixels before scrolling
      textareaRef.current.style.height = 'auto';
      
      // Set height based on content but cap at maxHeight
      const newHeight = Math.min(textareaRef.current.scrollHeight, maxHeight);
      textareaRef.current.style.height = `${newHeight}px`;
      
      // If content is larger than maxHeight, ensure scrollbar is visible
      textareaRef.current.style.overflowY = 
        textareaRef.current.scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  };

  const resetHeight = () => {
    if (textareaRef.current) {
      // First set height to auto to reset any previous height
      textareaRef.current.style.height = 'auto';
      
      // Use setTimeout to ensure this executes after React has updated the DOM with empty content
      setTimeout(() => {
        if (textareaRef.current) {
          // At this point, the textarea should be empty, so its scrollHeight will be minimal
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
          textareaRef.current.style.overflowY = 'hidden';
        }
      }, 0);
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

  // Create the recognition reference at this level so it can be shared between components
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const submitForm = useCallback(() => {
    window.history.replaceState({}, '', `/chat/${chatId}`);

    // Stop speech recognition if it's active when sending a message
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

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

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined,
        ) as Attachment[];

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error('Error uploading files!', error);
        toast.error('Failed to upload files, please try again!');
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
          // Create a new file with a simple timestamp as the filename
          const renamedFile = new File(
            [file],
            `${timestamp}.${file.type.split('/')[1] || 'png'}`,
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
        ) as Attachment[];

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
    <div 
      className="relative w-full flex flex-col gap-4"
      style={{
        // Add padding to the bottom to push content above the keyboard
        // Use a fallback value (e.g., 1rem) for browsers without VK API support
        paddingBottom: `calc(env(keyboard-inset-bottom, 0px) + 4px)`,
        // Add transition for smoother padding change
        transition: 'padding-bottom 0.2s ease-out'
      }}
    >
      {/* Only show suggestions on desktop (non-mobile) devices and when no messages/attachments */}
      {!isMobile && 
        messages.length === 0 &&
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
        accept=".jpg,.jpeg,.png,.gif,.pdf,.docx,.doc,.txt,.csv,.xlsx,.xls,.pptx,.ppt"
        onChange={handleFileChange}
        tabIndex={-1}
        aria-label="File upload"
        id="file-upload"
      />

      <div className="relative">
        {/* Input container with dynamic padding based on attachments */}
        <div className={cx(
          "rounded-3xl overflow-hidden bg-muted dark:border-zinc-700 border border-input shadow-sm",
          {
            "pt-4": attachments.length > 0 || uploadQueue.length > 0
          }
        )}>
          {/* Attachments inside the input bar */}
          {(attachments.length > 0 || uploadQueue.length > 0) && (
            <div
              data-testid="attachments-preview"
              className="flex flex-row gap-2 overflow-x-auto items-center px-4 pb-2"
              style={{ scrollbarWidth: 'thin' }}
            >
              {attachments.map((attachment, index) => (
                <PreviewAttachment 
                  key={attachment.url} 
                  attachment={attachment}
                  onRemove={() => {
                    setAttachments(currentAttachments => 
                      currentAttachments.filter((_, i) => i !== index)
                    );
                  }}
                />
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
          
          {/* Text input container with proper spacing for buttons */}
          <div className="relative">
            <Textarea
              data-testid="multimodal-input"
              ref={textareaRef}
              placeholder="Ask UniTaskAI anything..."
              value={input}
              onChange={handleInput}
              onPaste={handlePaste}
              name="message-input"
              id="message-input"
              className={cx(
                'min-h-[24px] max-h-[calc(75dvh)] resize-none !text-base bg-transparent pt-4 pl-5 pr-5 border-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
                'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-rounded scrollbar-thumb-slate-400/20 hover:scrollbar-thumb-slate-400/40 dark:scrollbar-thumb-zinc-600/20 dark:hover:scrollbar-thumb-zinc-500/40',
                'placeholder:text-muted-foreground/70',
                className,
              )}
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(148, 163, 184, 0.2) transparent'
              }}
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
            {/* Fixed height spacer at the bottom to prevent text from going under buttons */}
            <div className="h-14 w-full bg-transparent pointer-events-none" aria-hidden="true"></div>
          </div>
        </div>

        {/* Left side - only persona selector */}
        <div className="absolute bottom-1 left-3 p-2 w-fit flex flex-row justify-start items-center z-10">
          {/* Background element with rounded corners - smaller to not overlap with border */}
          <span className="absolute inset-px bg-muted dark:bg-muted rounded-full"></span>
          <div className="relative">
            <PersonaSelector />
          </div>
        </div>

        {/* Right side - attachments, speech-to-text, and send buttons */}
        <div className="absolute bottom-1 right-3 p-2 w-fit flex flex-row justify-end items-center z-10">
          {/* Background element with rounded corners - smaller to not overlap with border */}
          <span className="absolute inset-px bg-muted dark:bg-muted rounded-full"></span>
          <div className="relative flex items-center">
            <AttachmentsButton fileInputRef={fileInputRef} status={status} />
            <SpeechToTextButton 
              setInput={setInput} 
              status={status} 
              input={input}
              recognitionRef={recognitionRef}
            />
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
        
        {/* Disclaimer text positioned underneath without affecting layout */}
        <div className="absolute -bottom-6 inset-x-0 text-center pointer-events-none">
          <span className="text-xs text-muted-foreground">UniTaskAI can make mistakes, double-check the info.</span>
        </div>
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
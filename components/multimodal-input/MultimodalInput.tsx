'use client';

import React, { useRef, useState, useCallback, memo, useEffect } from 'react';
import cx from 'classnames';
import { toast } from 'sonner';
import { useLocalStorage, useWindowSize } from 'usehooks-ts';
import type { Attachment, UIMessage } from 'ai';
import type { UseChatHelpers } from '@ai-sdk/react';
import equal from 'fast-deep-equal';

import { PreviewAttachment } from '../preview-attachment';
import { Textarea } from '../ui/textarea';
import { useIsMobile } from '@/hooks/use-mobile';

import { SendButton } from './SendButton';
import { StopButton } from './StopButton';
import { AttachmentsButton } from './AttachmentsButton';
import { SpeechToTextButton } from './SpeechToTextButton';
import { ScrollButton } from './ScrollButton';
import { Greeting } from './Greeting';
import { VirtualKeyboardHandler } from './VirtualKeyboardHandler';
import { TextareaAutoResizer, resetTextareaHeight } from './TextareaAutoResizer';
import { useFileUploadHandler } from './FileUploadHandler';
import type { SpeechRecognition } from './types';
import { ImageIcon, GPSIcon, GlobeIcon } from '../icons';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '../ui/hover-card';

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
  // Mark append as unused with an underscore variable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _append = append; // Create a local unused variable instead
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { width } = useWindowSize();
  const isMobile = useIsMobile();
  
  // State for tracking if input is focused
  const [isInputFocused, setIsInputFocused] = useState(false);
  // State for tracking visual row count for expanding textarea
  const [visualRowCount, setVisualRowCount] = useState(1);
  
  // Is this a new chat (no messages)
  const isNewChat = messages.length === 0;

  // Define the set of statuses where the StopButton should be active
  const activeStopButtonStatuses: UseChatHelpers['status'][] = [
    'generating' as UseChatHelpers['status'],
    'submitted' as UseChatHelpers['status'],
    'streaming' as UseChatHelpers['status'],
  ];

  // Use VirtualKeyboardHandler to manage keyboard on mobile
  // (doesn't render anything)
  
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
    }
    // Only run once after hydration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setLocalStorageInput(input);
  }, [input, setLocalStorageInput]);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);

  // Use FileUploadHandler for file upload logic
  const { handleFileChange, handlePaste } = useFileUploadHandler({
    setAttachments,
    setUploadQueue,
    status
  });

  // Create the recognition reference at this level so it can be shared between components
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const submitForm = useCallback(() => {
    window.history.replaceState({}, '', `/chat/${chatId}`);

    // Stop speech recognition if it's active when sending a message
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const chatRequestOptions = {
      experimental_attachments: attachments,
    };

    handleSubmit(undefined, chatRequestOptions);

    setAttachments([]);
    setLocalStorageInput('');
    resetTextareaHeight(textareaRef);

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

  // Pills config
  const pills = [
    {
      key: 'create-image',
      label: 'Create Images',
      icon: <span className="mr-2"><ImageIcon size={18} /></span>,
      prompt: 'Pixelate a frog in a wizard robe holding a glowing staff, standing in a swamp at night.'
    },
    {
      key: 'check-weather',
      label: 'Check Weather',
      icon: <span className="mr-2"><GPSIcon size={18} /></span>,
      prompt: "What's the weather like today in my location?"
    },
    {
      key: 'latest-news',
      label: 'Latest News',
      icon: <span className="mr-2"><GlobeIcon size={18} /></span>,
      prompt: 'Show me the latest news headlines.'
    },
  ];

  // Send prompt to AI
  const handlePillClick = (prompt: string) => {
    append({ role: 'user', content: prompt });
  };

  // Main wrapper with transition for centering in empty chats
  return (
    <div 
      className={cx(
        "flex flex-col w-full transition-all duration-500 ease-in-out relative",
        "h-auto justify-end"
      )}
    >
      {/* Virtual keyboard handler - doesn't render anything */}
      <VirtualKeyboardHandler isMobile={isMobile} />
      
      {/* Textarea auto-resizer - doesn't render anything */}
      <TextareaAutoResizer 
        textareaRef={textareaRef}
        value={input}
        isMobile={isMobile}
        width={width}
        onHeightChange={setVisualRowCount}
      />
      
      {/* Form wrapper - fixed to bottom of viewport on mobile */}
      <div 
        className={cx(
          "relative w-full flex flex-col gap-4 transition-all duration-500 ease-in-out input-container",
          isMobile && "fixed bottom-0 inset-x-0 z-10 bg-background/95 backdrop-blur-sm px-2",
        )}
        style={{
          // Add padding to the bottom to push content above the keyboard using proper env() variables
          paddingBottom: isMobile ? 
            `calc(env(keyboard-inset-height, var(--keyboard-height, 0px)) + 8px)` : 
            '4px',
          // Apply transforms to handle viewport offset on iOS
          transform: isMobile ? 
            `translateY(calc(var(--viewport-offset-y, 0px) * -1))` : 
            'none',
          transition: 'padding-bottom 0.2s ease-out, transform 0.25s ease-out'
        }}
      >
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
          {/* Only show greeting when there are no messages */}
          {isNewChat && <Greeting />}
          
          {/* Input container with dynamic padding based on attachments */}
          <div
            className={cx(
              "w-full text-left rounded-3xl overflow-hidden bg-background dark:bg-zinc-800 dark:border-zinc-600 border border-input shadow-md transition-shadow duration-200",
              {
                "pt-4": attachments.length > 0 || uploadQueue.length > 0,
                "shadow-lg": isInputFocused,
                "shadow-md": !isInputFocused
              }
            )}
          >
            {/* Attachments inside the input bar - LibreChat style */}
            {(attachments.length > 0 || uploadQueue.length > 0) && (
              <div
                data-testid="attachments-preview"
                className="flex flex-wrap gap-2 items-start px-4 pb-2 max-h-40 overflow-y-auto"
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
            
            {/* Text input container with proper spacing for buttons - LibreChat style */}
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
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                className={cx(
                  'min-h-[44px] max-h-[calc(75dvh)] resize-none !text-base bg-transparent pt-4 pl-5 pr-5 border-0 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0',
                  'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-rounded scrollbar-thumb-slate-400/20 hover:scrollbar-thumb-slate-400/40 dark:scrollbar-thumb-zinc-600/20 dark:hover:scrollbar-thumb-zinc-500/40',
                  'placeholder:text-muted-foreground/70',
                  visualRowCount > 3 ? 'pl-5' : 'px-5',
                  className,
                )}
                style={{
                  height: 44, // Starting height
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(148, 163, 184, 0.2) transparent',
                  overflow: 'hidden', // Start with hidden, will be changed by adjustHeight
                }}
                rows={1}
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

            {/* Bottom toolbar with controls - ensure SendButton and StopButton are here */}
            <div className="absolute inset-x-0.5 bottom-0.5 flex items-center justify-between p-1 pointer-events-none cursor-default">
              {/* Left side - Persona selector and other potential future buttons */}
              <div className="p-2 flex flex-row justify-start items-center z-10 gap-1 pointer-events-auto">
                {/* Background element with rounded corners */}
                <span className="absolute inset-px bg-backround  dark:bg-fore  rounded-full pointer-events-none"></span>
                <AttachmentsButton
                  fileInputRef={fileInputRef}
                  status={status} // Correctly pass status, internal logic handles disabling
                />
              </div>

              {/* Right side - speech-to-text, and send/stop buttons */}
              <div className="p-2 flex flex-row justify-end items-center z-10 gap-1 relative pointer-events-auto">
                <SpeechToTextButton
                  recognitionRef={recognitionRef}
                  setInput={setInput}
                  status={status}
                  // input={input} // Optional prop, can be omitted if not strictly needed by SpeechToTextButton's logic
                />
                {activeStopButtonStatuses.includes(status) ? (
                  <StopButton stop={stop} setMessages={setMessages} />
                ) : (
                  <SendButton
                    submitForm={submitForm}
                    input={input}
                    uploadQueue={uploadQueue}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pills row below the input bar for new chats */}
        {isNewChat && (
          <div className="flex flex-row justify-center gap-2">
            {pills.map((pill) => (
              <HoverCard key={pill.key} openDelay={200} closeDelay={100}>
                <HoverCardTrigger asChild>
                  <button
                    className="px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-base font-medium text-zinc-700 dark:text-zinc-200 shadow hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center"
                    onClick={() => handlePillClick(pill.prompt)}
                    type="button"
                  >
                    {pill.icon}
                    {pill.label}
                  </button>
                </HoverCardTrigger>
                <HoverCardContent className="w-80 p-3 shadow-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg z-[60] text-center" sideOffset={5}>
                  <div className="text-base font-semibold mb-2">Prompt Preview</div>
                  <div className="text-zinc-700 dark:text-zinc-200">{pill.prompt}</div>
                </HoverCardContent>
              </HoverCard>
            ))}
          </div>
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
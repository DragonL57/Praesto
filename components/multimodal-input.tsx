'use client';

import type { Attachment, UIMessage } from 'ai';
import cx from 'classnames';
import React from 'react';
import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
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
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@ai-sdk/react';
import { useIsMobile } from '@/hooks/use-mobile';
import { LuArrowDownToLine } from "react-icons/lu";
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import PersonaSelector from './persona-selector';
import type { 
  SpeechRecognition,
  SpeechRecognitionEvent,
  SpeechRecognitionErrorEvent,
  SpeechRecognitionMode,
  AvailabilityStatus
} from '../types/speech-recognition';

// Define interfaces for the VirtualKeyboard API
interface VirtualKeyboardRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Custom interface for the geometry change event that doesn't extend Event
interface VirtualKeyboardGeometryChangeEvent {
  target: {
    boundingRect: VirtualKeyboardRect;
  };
}

// Define the VirtualKeyboard interface without extending EventTarget
interface VirtualKeyboard {
  overlaysContent: boolean;
  boundingRect: VirtualKeyboardRect;
  show(): Promise<void>;
  hide(): Promise<void>;
  addEventListener(
    type: "geometrychange", 
    listener: (event: VirtualKeyboardGeometryChangeEvent) => void, 
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener(
    type: "geometrychange", 
    listener: (event: VirtualKeyboardGeometryChangeEvent) => void, 
    options?: boolean | EventListenerOptions
  ): void;
}

// Extend the Navigator interface to include the virtualKeyboard property
declare global {
  interface Navigator {
    virtualKeyboard?: VirtualKeyboard;
  }
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

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      // Determine if the file needs conversion to PDF
      const needsPdfConversion = (file: File) => {
        const documentTypes = [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
          'application/msword', // doc
          'application/vnd.ms-word',
          'text/plain',
          'text/csv',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
          'application/vnd.ms-excel', // xls
          'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
          'application/vnd.ms-powerpoint' // ppt
        ];
        
        // Check by file extension too
        const ext = file.name.split('.').pop()?.toLowerCase();
        const documentExtensions = ['docx', 'doc', 'txt', 'csv', 'xlsx', 'xls', 'pptx', 'ppt'];
        
        return documentTypes.includes(file.type) || 
               (ext && documentExtensions.includes(ext));
      };
      
      // Check if we need to convert this file to PDF (not an image or already PDF)
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf' && needsPdfConversion(file)) {
        // Send to our PDF conversion endpoint silently without toast notifications
        const pdfResponse = await fetch('/api/files/convert-to-pdf', {
          method: 'POST',
          body: formData,
        });
        
        if (pdfResponse.ok) {
          const data = await pdfResponse.json();
          
          return {
            url: data.url,
            name: data.pathname,
            contentType: data.contentType,
            originalFile: {
              name: file.name,
              type: file.type
            }
          };
        } else {
          const error = await pdfResponse.json();
          console.error('Failed to convert document:', error);
          toast.error(`Failed to upload file: ${file.name}`);
          return undefined;
        }
      }
      
      // For images and PDFs, use the standard upload endpoint
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
    <div 
      className="relative w-full flex flex-col gap-4"
      style={{
        // Add minimal padding to the bottom when keyboard is visible
        // Only add 0px additional padding to the keyboard-inset-bottom
        paddingBottom: `calc(env(keyboard-inset-bottom, 0px) + 0px)`,
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

function PureAttachmentsButton({
  fileInputRef,
  status,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: UseChatHelpers['status'];
}) {
  return (
    <TooltipProvider delayDuration={50} skipDelayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            data-testid="attachments-button"
            className="rounded-md rounded-bl-lg p-[7px] h-fit border border-input dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200"
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
        </TooltipTrigger>
        <TooltipContent side="bottom">Attach files</TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
  // Track whether the button is currently being clicked
  const isClickingRef = useRef(false);

  // Store the checkIfShouldShowButton function in a ref to avoid recreating it on every render
  const checkIfShouldShowButtonRef = useRef<() => void>(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check if we're not at the bottom
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Show button if we're more than 200px from bottom
    setIsVisible(distanceFromBottom > 200);
  });

  // Use a stable reference to the current checkIfShouldShowButton function
  useEffect(() => {
    // Update the ref to capture fresh closure values
    checkIfShouldShowButtonRef.current = () => {
      // Skip visibility updates while button is being clicked
      if (isClickingRef.current) return;
      
      const container = containerRef.current;
      if (!container) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      setIsVisible(distanceFromBottom > 200);
    };
  });

  // Set up and clean up the scroll event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initial check
    checkIfShouldShowButtonRef.current();

    // Use the function from the ref to ensure we're always using the latest version
    const handleScroll = () => {
      // Skip scroll handling during click
      if (isClickingRef.current) return;
      checkIfShouldShowButtonRef.current();
    };
    
    // Set up scroll listener with passive option for better performance
    container.addEventListener('scroll', handleScroll, { passive: true });

    // Cleanup
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef]); // Empty dependency array as we use refs for fresh values

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
  }, [isVisible]); // Only depend on isVisible

  const scrollToBottom = useCallback((e: React.MouseEvent) => {
    // Prevent default behavior
    e.preventDefault();
    e.stopPropagation();
    
    // Set flag to prevent scroll handlers during click
    isClickingRef.current = true;
    
    // Use requestAnimationFrame for smoother scroll handling
    requestAnimationFrame(() => {
      if (endRef.current) {
        endRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end',
          inline: 'nearest'
        });
        
        // Reset the flag after scrolling is complete
        setTimeout(() => {
          isClickingRef.current = false;
        }, 100);
      } else {
        isClickingRef.current = false;
      }
    });
  }, [endRef]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <Button
        onClick={scrollToBottom}
        className={`rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-all duration-300 size-8 p-0 pointer-events-auto ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
        size="icon"
        aria-label="Scroll to bottom"
      >
        <LuArrowDownToLine size={16} className="text-primary-foreground" />
      </Button>
    </div>
  );
}

function PureSpeechToTextButton({
  setInput,
  status,
  input: _input, // Renamed to _input to indicate it's not used
  recognitionRef,
}: {
  setInput: UseChatHelpers['setInput'];
  status: UseChatHelpers['status'];
  input?: string;
  recognitionRef: React.MutableRefObject<SpeechRecognition | null>;
}) {
  // Detect user's browser language and map to a supported language
  const detectUserLanguage = (): string => {
    // Default to auto-detect if we can't determine
    const userLang = 'auto';
    
    try {
      // Check if running in browser environment
      if (typeof navigator === 'undefined') {
        return userLang;
      }
      
      // Get browser language(s)
      const browserLang = navigator.language || 
        (Array.isArray(navigator.languages) && navigator.languages[0]);
      
      if (browserLang) {
        // Extract base language code (e.g., 'en', 'fr', 'de')
        const baseLang = browserLang.split('-')[0].toLowerCase();
        
        // Map base language to supported language codes
        const langMapping: Record<string, string> = {
          'en': 'en-US', // Default English to US
          'es': 'es-ES',
          'fr': 'fr-FR',
          'de': 'de-DE',
          'it': 'it-IT',
          'pt': 'pt-BR', // Default Portuguese to Brazil
          'vi': 'vi-VN',
          'zh': 'zh-CN', // Default Chinese to Simplified
          'ja': 'ja-JP',
          'ko': 'ko-KR',
          'ar': 'ar-SA',
          'ru': 'ru-RU',
          'hi': 'hi-IN'
        };
        
        // Check for specific language+region combinations
        if (browserLang === 'en-GB') return 'en-GB';
        if (browserLang === 'pt-PT') return 'pt-PT';
        if (browserLang === 'zh-TW') return 'zh-TW';
        
        // Return mapped language or auto if not supported
        return langMapping[baseLang] || 'auto';
      }
    } catch (error) {
      console.warn('Error detecting browser language:', error);
    }
    
    return userLang;
  };

  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [selectedLanguage, _setSelectedLanguage] = useLocalStorage('speech-recognition-language', detectUserLanguage());
  const [recognitionMode] = useLocalStorage<SpeechRecognitionMode>('speech-recognition-mode', 'ondevice-preferred');
  const [deviceLanguageStatus, setDeviceLanguageStatus] = useState<AvailabilityStatus | null>(null);
  
  // Store current transcript buffer to avoid redundant updates
  const transcriptBufferRef = useRef<string>('');
  // Track recognition restarts for auto detection improvements
  const recognitionAttemptsRef = useRef<number>(0);
  // Track recognition session start time
  const sessionStartTimeRef = useRef<number>(0);

  // Available languages for speech recognition - wrapped in useMemo to prevent recreation on each render
  const languages = useMemo(() => [
    { value: 'auto', label: 'Auto-detect language' },
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'es-ES', label: 'Spanish' },
    { value: 'fr-FR', label: 'French' },
    { value: 'de-DE', label: 'German' },
    { value: 'it-IT', label: 'Italian' },
    { value: 'pt-BR', label: 'Portuguese (Brazil)' },
    { value: 'pt-PT', label: 'Portuguese (Portugal)' },
    { value: 'vi-VN', label: 'Vietnamese' },
    { value: 'zh-CN', label: 'Chinese (Simplified)' },
    { value: 'zh-TW', label: 'Chinese (Traditional)' },
    { value: 'ja-JP', label: 'Japanese' },
    { value: 'ko-KR', label: 'Korean' },
    { value: 'ar-SA', label: 'Arabic' },
    { value: 'ru-RU', label: 'Russian' },
    { value: 'hi-IN', label: 'Hindi' },
  ], []);

  // Check if speech recognition is supported and check on-device language availability
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }
    
    // Check on-device availability for the current language
    if (selectedLanguage !== 'auto') {
      try {
        // Only check if the browser supports the new API
        if (typeof SpeechRecognition.availableOnDevice === 'function') {
          SpeechRecognition.availableOnDevice(selectedLanguage)
            .then(status => {
              setDeviceLanguageStatus(status);
            })
            .catch(error => {
              console.error('Error checking on-device availability:', error);
            });
        }
      } catch (error) {
        console.warn('On-device recognition check not supported:', error);
      }
    }
  }, [selectedLanguage]);

  // Clean up the recognition instance if component unmounts while listening
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [recognitionRef]);

  // Function to efficiently update input with new transcript
  const updateInputWithTranscript = useCallback((transcript: string, isFinal: boolean) => {
    // Skip update if transcript is the same (improves performance)
    if (transcript === transcriptBufferRef.current && !isFinal) return;
    
    // Update the buffer with new transcript
    transcriptBufferRef.current = transcript;
    
    setInput((currentInput) => {
      // For a new recognition session or if current input is empty
      if (!currentInput || (!isFinal && recognitionAttemptsRef.current === 0)) {
        return transcript;
      }
      
      // For appending transcripts
      if (!transcript.toLowerCase().includes(currentInput.toLowerCase())) {
        // Add a space if needed and the transcript is not just a continuation
        if (currentInput.trim().length > 0 && !currentInput.endsWith(' ')) {
          return `${currentInput} ${transcript}`;
        }
        return `${currentInput}${transcript}`;
      }
      
      // If the new transcript already contains what was there, use that
      return transcript;
    });
  }, [setInput]);

  // Install the language for on-device recognition if needed
  const installLanguageIfNeeded = useCallback(async () => {
    if (selectedLanguage === 'auto' || deviceLanguageStatus !== 'downloadable') return true;
    
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition && typeof SpeechRecognition.installOnDevice === 'function') {
        toast.info(`Downloading ${selectedLanguage} for on-device recognition...`, {
          duration: 3000,
          id: "installing-language"
        });
        
        const success = await SpeechRecognition.installOnDevice(selectedLanguage);
        
        if (success) {
          setDeviceLanguageStatus('available');
          toast.success(`${selectedLanguage} installed for on-device recognition`);
          return true;
        } else {
          toast.error(`Failed to install ${selectedLanguage}. Using cloud recognition.`);
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('Error installing language:', error);
      return true; // Continue anyway
    }
  }, [selectedLanguage, deviceLanguageStatus]);

  // Define startRecognition function type to break circular dependency
  type StartRecognitionFn = () => Promise<boolean>;
  
  // Reference for startRecognition to break circular dependency
  const startRecognitionRef = useRef<StartRecognitionFn | null>(null);

  // Handle restart for auto-detect language when it's not working well
  const restartRecognitionIfNeeded = useCallback(() => {
    // If we've been listening for some time without results, try restarting
    const now = Date.now();
    const timeElapsed = now - sessionStartTimeRef.current;
    
    // If we're in auto mode and no successful transcripts after 3 seconds
    if (selectedLanguage === 'auto' && timeElapsed > 3000 && transcriptBufferRef.current === '') {
      recognitionAttemptsRef.current += 1;
      
      // Only try a restart a limited number of times
      if (recognitionAttemptsRef.current <= 2) {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
          
          // Small delay before starting again
          setTimeout(() => {
            if (isListening && startRecognitionRef.current) { // Check if we're still in listening mode
              startRecognitionRef.current();
              toast.info("Restarting speech recognition for better language detection...", {
                id: "speech-restart",
                duration: 1500
              });
            }
          }, 300);
        }
      }
    }
  }, [selectedLanguage, isListening, recognitionRef]);

  // Function to start the speech recognition
  const startRecognition: StartRecognitionFn = useCallback(async () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        toast.error("Speech recognition is not supported in your browser");
        return false;
      }
      
      // Try to install the language if needed
      if (deviceLanguageStatus === 'downloadable') {
        await installLanguageIfNeeded();
      }
      
      const recognition = new SpeechRecognition();
      
      // Configure for continuous results and better performance
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1; // Focus on best match for performance
      
      // Set recognition mode if supported by the browser
      if ('mode' in recognition) {
        try {
          recognition.mode = recognitionMode;
        } catch (e) {
          console.warn('Recognition mode not supported:', e);
        }
      }
      
      // Configure language
      if (selectedLanguage !== 'auto') {
        recognition.lang = selectedLanguage;
      }
      
      // If in auto mode and not first attempt, try browser's improved detection
      if (selectedLanguage === 'auto' && recognitionAttemptsRef.current > 0) {
        // Let browser try its best with no constraints
      } 
      
      // Session start time for auto-detection monitoring
      sessionStartTimeRef.current = Date.now();
      
      recognition.onstart = () => {
        setIsListening(true);
        const selectedLang = languages.find(lang => lang.value === selectedLanguage);
        
        // Show different toasts based on recognition mode
        if (selectedLanguage !== 'auto') {
          if (recognitionMode === 'ondevice-only') {
            toast.info(`Listening in ${selectedLang?.label || selectedLanguage} (on-device)...`);
          } else if (recognitionMode === 'cloud-only') {
            toast.info(`Listening in ${selectedLang?.label || selectedLanguage} (cloud)...`);
          } else {
            toast.info(`Listening in ${selectedLang?.label || selectedLanguage}...`);
          }
        } else {
          toast.info("Listening with auto language detection...");
        }
      };
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        // Get the latest result
        const lastResultIndex = event.results.length - 1;
        const result = event.results[lastResultIndex];
        const transcript = result[0].transcript;
        
        // Update the input field with either interim or final results
        // This makes the input appear faster and more responsive
        updateInputWithTranscript(transcript, result.isFinal);
        
        // If we got results in auto mode, consider the detection successful
        if (selectedLanguage === 'auto' && transcript.trim().length > 0) {
          // Reset restart counter since we're getting results
          recognitionAttemptsRef.current = 0;
        }
      };
      
      // Set up interval to check if we need to restart for better auto-detection
      const autoDetectInterval = selectedLanguage === 'auto' ? 
        setInterval(restartRecognitionIfNeeded, 3000) : null;
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error', event.error);
        
        // Handle specific error cases
        if (event.error === 'language-not-supported') {
          toast.error(`Language ${selectedLanguage} is not supported. Try a different language.`);
        } 
        else if (event.error === 'not-allowed') {
          toast.error("Microphone access denied. Please allow microphone access to use speech recognition.");
        }
        else if (recognitionMode === 'ondevice-only' && event.error === 'network') {
          toast.error("On-device recognition failed. Try switching to cloud recognition.");
        }
        // Only show general error toast for non-auto mode or serious errors
        else if (selectedLanguage !== 'auto' || 
            (event.error !== 'no-speech' && event.error !== 'aborted')) {
          toast.error(`Speech recognition error: ${event.error}`);
        }
        
        // Clean up
        setIsListening(false);
        if (autoDetectInterval) clearInterval(autoDetectInterval);
      };
      
      recognition.onend = () => {
        // Clean up
        setIsListening(false);
        if (autoDetectInterval) clearInterval(autoDetectInterval);
      };
      
      recognition.start();
      recognitionRef.current = recognition;
      return true;
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      toast.error("Failed to start speech recognition");
      return false;
    }
  }, [deviceLanguageStatus, installLanguageIfNeeded, languages, recognitionMode, restartRecognitionIfNeeded, selectedLanguage, updateInputWithTranscript, recognitionRef]);

  // Store the startRecognition function in the ref to break the circular dependency
  useEffect(() => {
    startRecognitionRef.current = startRecognition;
  }, [startRecognition]);

  const toggleListening = useCallback(() => {
    if (!speechSupported) {
      toast.error("Speech recognition is not supported in your browser");
      return;
    }

    if (isListening) {
      // Stop listening
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsListening(false);
      // Reset tracking variables
      recognitionAttemptsRef.current = 0;
      sessionStartTimeRef.current = 0;
    } else {
      // Start fresh recognition session
      transcriptBufferRef.current = '';
      recognitionAttemptsRef.current = 0;
      startRecognition();
    }
  }, [isListening, speechSupported, startRecognition, recognitionRef]);

  if (!speechSupported) {
    return null;
  }

  // Determine button tooltip text
  const getTooltipText = () => {
    if (isListening) return "Stop voice input";
    
    const lang = languages.find(lang => lang.value === selectedLanguage)?.label || selectedLanguage;
    let modeText = "";
    
    if (deviceLanguageStatus === 'available' && recognitionMode === 'ondevice-preferred') {
      modeText = " (on-device)";
    } else if (recognitionMode === 'ondevice-only') {
      modeText = " (on-device only)";
    } else if (recognitionMode === 'cloud-only') {
      modeText = " (cloud)";
    }
    
    return `Start voice input - ${lang}${modeText}`;
  };

  return (
    <TooltipProvider delayDuration={50} skipDelayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            data-testid="speech-to-text-button"
            className={`rounded-md mx-1 p-[7px] h-fit border border-input dark:border-zinc-700 hover:dark:bg-zinc-900 hover:bg-zinc-200 ${isListening ? 'bg-red-100 dark:bg-red-900' : ''}`}
            onClick={(event) => {
              event.preventDefault();
              toggleListening();
            }}
            disabled={status !== 'ready'}
            variant="ghost"
            aria-label={isListening ? "Stop listening" : "Start speech recognition"}
          >
            {isListening ? <FaMicrophoneSlash size={16} className="text-red-500" /> : <FaMicrophone size={16} />}
            <span className="sr-only">{isListening ? "Stop listening" : "Start speech recognition"}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {getTooltipText()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const SpeechToTextButton = memo(PureSpeechToTextButton);
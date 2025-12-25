'use client';

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import { toast } from 'sonner';
import { useLocalStorage } from 'usehooks-ts';

import { Button } from '../ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

import { detectUserLanguage } from './utils';
import type {
  AvailabilityStatus,
  SpeechRecognition,
  SpeechRecognitionErrorEvent,
  SpeechRecognitionEvent,
  SpeechRecognitionMode,
} from './types';
import type { ChatStatus } from '@/lib/ai/types';

interface SpeechToTextButtonProps {
  // AI SDK 5.x: setInput is now managed by the parent component, not from UseChatHelpers
  setInput: React.Dispatch<React.SetStateAction<string>>;
  status: ChatStatus;
  input?: string;
  recognitionRef: React.MutableRefObject<SpeechRecognition | null>;
}

function PureSpeechToTextButton({
  setInput,
  status,
  input: _input, // Renamed to _input to indicate it's not used
  recognitionRef,
}: SpeechToTextButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [selectedLanguage, _setSelectedLanguage] = useLocalStorage(
    'speech-recognition-language',
    detectUserLanguage(),
  );
  const [recognitionMode] = useLocalStorage<SpeechRecognitionMode>(
    'speech-recognition-mode',
    'ondevice-preferred',
  );
  const [deviceLanguageStatus, setDeviceLanguageStatus] =
    useState<AvailabilityStatus | null>(null);

  // Store current transcript buffer to avoid redundant updates
  const transcriptBufferRef = useRef<string>('');
  // Track recognition restarts for auto detection improvements
  const recognitionAttemptsRef = useRef<number>(0);
  // Track recognition session start time
  const sessionStartTimeRef = useRef<number>(0);

  // Available languages for speech recognition - wrapped in useMemo to prevent recreation on each render
  const languages = useMemo(
    () => [
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
    ],
    [],
  );

  // Check if speech recognition is supported and check on-device language availability
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }
    // Only check on-device availability for the current language (no 'auto')
    if (selectedLanguage) {
      try {
        if (typeof SpeechRecognition.availableOnDevice === 'function') {
          SpeechRecognition.availableOnDevice(selectedLanguage)
            .then((status) => {
              setDeviceLanguageStatus(status);
            })
            .catch((error) => {
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
  const updateInputWithTranscript = useCallback(
    (transcript: string, isFinal: boolean) => {
      // Skip update if transcript is the same (improves performance)
      if (transcript === transcriptBufferRef.current && !isFinal) return;

      // Update the buffer with new transcript
      transcriptBufferRef.current = transcript;

      setInput((currentInput) => {
        // For a new recognition session or if current input is empty
        if (
          !currentInput ||
          (!isFinal && recognitionAttemptsRef.current === 0)
        ) {
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
    },
    [setInput],
  );

  // Install the language for on-device recognition if needed
  const installLanguageIfNeeded = useCallback(async () => {
    if (deviceLanguageStatus !== 'downloadable') return true;
    try {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (
        SpeechRecognition &&
        typeof SpeechRecognition.installOnDevice === 'function'
      ) {
        toast.info(
          `Downloading ${selectedLanguage} for on-device recognition...`,
          {
            duration: 3000,
            id: 'installing-language',
          },
        );
        const success =
          await SpeechRecognition.installOnDevice(selectedLanguage);
        if (success) {
          setDeviceLanguageStatus('available');
          toast.success(
            `${selectedLanguage} installed for on-device recognition`,
          );
          return true;
        } else {
          toast.error(
            `Failed to install ${selectedLanguage}. Using cloud recognition.`,
          );
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

  // Function to start the speech recognition
  const startRecognition: StartRecognitionFn = useCallback(async () => {
    try {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        toast.error('Speech recognition is not supported in your browser');
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
      recognition.lang = selectedLanguage;

      recognition.onstart = () => {
        setIsListening(true);
        const selectedLang = languages.find(
          (lang) => lang.value === selectedLanguage,
        );

        // Show different toasts based on recognition mode
        if (selectedLanguage !== 'auto') {
          if (recognitionMode === 'ondevice-only') {
            toast.info(
              `Listening in ${selectedLang?.label || selectedLanguage} (on-device)...`,
            );
          } else if (recognitionMode === 'cloud-only') {
            toast.info(
              `Listening in ${selectedLang?.label || selectedLanguage} (cloud)...`,
            );
          } else {
            toast.info(
              `Listening in ${selectedLang?.label || selectedLanguage}...`,
            );
          }
        } else {
          toast.info('Listening with auto language detection...');
        }
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const lastResultIndex = event.results.length - 1;
        const currentTranscript = event.results[lastResultIndex][0].transcript;
        const isFinal = event.results[lastResultIndex].isFinal;

        // Detect mobile vs desktop behavior based on user agent or simple detection
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
          // On mobile, use only the latest interim result to avoid accumulation
          if (isFinal) {
            updateInputWithTranscript(currentTranscript, isFinal);
          } else {
            // For mobile, update with only the current transcript (don't accumulate)
            updateInputWithTranscript(currentTranscript, isFinal);
          }
        } else {
          // On desktop, accumulate all results (original behavior)
          let fullTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            fullTranscript += event.results[i][0].transcript;
          }
          updateInputWithTranscript(fullTranscript, isFinal);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error', event.error);
        if (event.error === 'language-not-supported') {
          toast.error(
            `Language ${selectedLanguage} is not supported. Try a different language.`,
          );
        } else if (event.error === 'not-allowed') {
          toast.error(
            'Microphone access denied. Please allow microphone access to use speech recognition.',
          );
        } else if (
          recognitionMode === 'ondevice-only' &&
          event.error === 'network'
        ) {
          toast.error(
            'On-device recognition failed. Try switching to cloud recognition.',
          );
        } else {
          toast.error(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition as SpeechRecognition;
      return true;
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      toast.error('Failed to start speech recognition');
      return false;
    }
  }, [
    deviceLanguageStatus,
    installLanguageIfNeeded,
    languages,
    recognitionMode,
    selectedLanguage,
    updateInputWithTranscript,
    recognitionRef,
  ]);

  // Store the startRecognition function in the ref to break the circular dependency
  useEffect(() => {
    startRecognitionRef.current = startRecognition;
  }, [startRecognition]);

  const toggleListening = useCallback(() => {
    if (!speechSupported) {
      toast.error('Speech recognition is not supported in your browser');
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
    if (isListening) return 'Stop voice input';

    const lang =
      languages.find((lang) => lang.value === selectedLanguage)?.label ||
      selectedLanguage;
    let modeText = '';

    if (
      deviceLanguageStatus === 'available' &&
      recognitionMode === 'ondevice-preferred'
    ) {
      modeText = ' (on-device)';
    } else if (recognitionMode === 'ondevice-only') {
      modeText = ' (on-device only)';
    } else if (recognitionMode === 'cloud-only') {
      modeText = ' (cloud)';
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
            aria-label={
              isListening ? 'Stop listening' : 'Start speech recognition'
            }
          >
            {isListening ? (
              <FaMicrophoneSlash size={16} className="text-red-500" />
            ) : (
              <FaMicrophone size={16} />
            )}
            <span className="sr-only">
              {isListening ? 'Stop listening' : 'Start speech recognition'}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{getTooltipText()}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export const SpeechToTextButton = memo(PureSpeechToTextButton);

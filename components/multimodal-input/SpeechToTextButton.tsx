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

import {
  buildFullTranscript,
  createTranscriptState,
  detectUserLanguage,
  processSpeechRecognitionResults,
} from './utils';
import type {
  AvailabilityStatus,
  SpeechRecognition,
  SpeechRecognitionErrorEvent,
  SpeechRecognitionEvent,
  SpeechRecognitionMode,
} from './types';
import type { ChatStatus } from '@/lib/ai/types';

interface SpeechToTextButtonProps {
  setInput: React.Dispatch<React.SetStateAction<string>>;
  status: ChatStatus;
  input?: string;
  recognitionRef: React.MutableRefObject<SpeechRecognition | null>;
}

function PureSpeechToTextButton({
  setInput,
  status,
  input = '',
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

  const baseInputRef = useRef<string>('');
  const transcriptStateRef = useRef(createTranscriptState());

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

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }
    if (selectedLanguage) {
      try {
        if (typeof SpeechRecognition.availableOnDevice === 'function') {
          SpeechRecognition.availableOnDevice(selectedLanguage)
            .then((availableStatus) => {
              setDeviceLanguageStatus(availableStatus);
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

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [recognitionRef]);

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
      return true;
    }
  }, [selectedLanguage, deviceLanguageStatus]);

  const startRecognition = useCallback(async () => {
    try {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        toast.error('Speech recognition is not supported in your browser');
        return false;
      }

      if (deviceLanguageStatus === 'downloadable') {
        await installLanguageIfNeeded();
      }

      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      if ('mode' in recognition) {
        try {
          recognition.mode = recognitionMode;
        } catch (e) {
          console.warn('Recognition mode not supported:', e);
        }
      }

      recognition.lang = selectedLanguage;

      recognition.onstart = () => {
        setIsListening(true);
        const selectedLang = languages.find(
          (lang) => lang.value === selectedLanguage,
        );

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
        const { finalTranscript, interimTranscript } =
          processSpeechRecognitionResults(event, transcriptStateRef.current);

        const fullText = buildFullTranscript(
          baseInputRef.current,
          finalTranscript,
          interimTranscript,
        );

        setInput(fullText);
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
        } else if (event.error !== 'aborted') {
          toast.error(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      transcriptStateRef.current = createTranscriptState();

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
    recognitionRef,
    setInput,
  ]);

  const toggleListening = useCallback(() => {
    if (!speechSupported) {
      toast.error('Speech recognition is not supported in your browser');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setIsListening(false);
    } else {
      baseInputRef.current = input || '';
      transcriptStateRef.current = createTranscriptState();
      startRecognition();
    }
  }, [isListening, speechSupported, startRecognition, recognitionRef, input]);

  if (!speechSupported) {
    return null;
  }

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

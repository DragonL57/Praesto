'use client';

import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import { toast } from 'sonner';
import { useLocalStorage } from 'usehooks-ts';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { SpeechRecognition, SpeechRecognitionEvent, SpeechRecognitionErrorEvent, SpeechRecognitionMode, AvailabilityStatus } from './types';
import { detectUserLanguage } from './utils';

interface SpeechToTextButtonProps {
  setInput: UseChatHelpers['setInput'];
  status: UseChatHelpers['status'];
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
              // Fix the TypeScript error by using an explicit updater function with the correct type
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
      recognitionRef.current = recognition as SpeechRecognition;
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

export const SpeechToTextButton = memo(PureSpeechToTextButton);
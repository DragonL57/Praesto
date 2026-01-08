'use client';

import { useState, useEffect } from 'react';
import { CloudIcon, Smartphone } from 'lucide-react';
import { useLocalStorage } from 'usehooks-ts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/toast';
import { SettingsSection, SettingsItem } from './settings-section';
import type {
  SpeechRecognitionMode,
  AvailabilityStatus,
} from '@/types/speech-recognition';

const SPEECH_LANGUAGES = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'it-IT', label: 'Italian' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
  { value: 'vi-VN', label: 'Vietnamese' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'ko-KR', label: 'Korean' },
];

export function SpeechSettings() {
  const [selectedLanguage, setSelectedLanguage] = useLocalStorage(
    'speech-recognition-language',
    'en-US',
  );
  const [recognitionMode, setRecognitionMode] =
    useLocalStorage<SpeechRecognitionMode>(
      'speech-recognition-mode',
      'ondevice-preferred',
    );
  const [speechSupported, setSpeechSupported] = useState(true);
  const [deviceLanguageStatus, setDeviceLanguageStatus] =
    useState<AvailabilityStatus | null>(null);
  const [isCheckingDeviceSupport, setIsCheckingDeviceSupport] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionImpl =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognitionImpl) {
        setSpeechSupported(false);
        return;
      }

      if (selectedLanguage !== 'auto') {
        checkOnDeviceSupport(selectedLanguage);
      }
    }
  }, [selectedLanguage]);

  const checkOnDeviceSupport = async (language: string) => {
    try {
      setIsCheckingDeviceSupport(true);
      const SpeechRecognitionImpl =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (
        SpeechRecognitionImpl &&
        typeof SpeechRecognitionImpl.availableOnDevice === 'function'
      ) {
        const status = await SpeechRecognitionImpl.availableOnDevice(language);
        setDeviceLanguageStatus(status);
      } else {
        setDeviceLanguageStatus(null);
      }
    } catch (error) {
      console.error('Error checking on-device support:', error);
      setDeviceLanguageStatus(null);
    } finally {
      setIsCheckingDeviceSupport(false);
    }
  };

  const handleDownloadLanguageModel = async () => {
    const SpeechRecognitionImpl =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (
      SpeechRecognitionImpl &&
      typeof SpeechRecognitionImpl.installOnDevice === 'function'
    ) {
      const languageName = SPEECH_LANGUAGES.find(
        (l) => l.value === selectedLanguage,
      )?.label;

      toast({
        type: 'success',
        description: `Downloading ${languageName} for on-device recognition...`,
      });

      const success = await SpeechRecognitionImpl.installOnDevice(
        selectedLanguage,
      );

      if (success) {
        setDeviceLanguageStatus('available');
        toast({
          type: 'success',
          description: `${languageName} installed successfully.`,
        });
      } else {
        toast({
          type: 'error',
          description: 'Failed to install language model.',
        });
      }
    }
  };

  if (!speechSupported) {
    return (
      <SettingsSection
        title="Speech Recognition"
        description="Speech input configuration"
      >
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-4">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Speech recognition is not supported in your browser.
          </p>
        </div>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      title="Speech Recognition"
      description="Configure voice input settings"
    >
      <SettingsItem
        label="Language"
        description="Select the language for speech recognition"
      >
        <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {SPEECH_LANGUAGES.map((language) => (
              <SelectItem key={language.value} value={language.value}>
                {language.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsItem>

      <SettingsItem
        label="Recognition Mode"
        description="On-device offers better privacy; cloud offers potentially better accuracy"
      >
        <Select
          value={recognitionMode}
          onValueChange={(value) =>
            setRecognitionMode(value as SpeechRecognitionMode)
          }
        >
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ondevice-preferred">
              <div className="flex items-center gap-2">
                <Smartphone className="size-4" />
                <span>On-device preferred</span>
              </div>
            </SelectItem>
            <SelectItem value="ondevice-only">
              <div className="flex items-center gap-2">
                <Smartphone className="size-4" />
                <span>On-device only</span>
              </div>
            </SelectItem>
            <SelectItem value="cloud-only">
              <div className="flex items-center gap-2">
                <CloudIcon className="size-4" />
                <span>Cloud only</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </SettingsItem>

      {selectedLanguage !== 'auto' && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30 p-4 space-y-3">
          <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            On-device Status
          </h4>
          {isCheckingDeviceSupport ? (
            <p className="text-xs text-zinc-500">Checking availability...</p>
          ) : deviceLanguageStatus === 'available' ? (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <Smartphone className="size-4" />
              <span className="text-xs font-medium">
                Available for on-device recognition
              </span>
            </div>
          ) : deviceLanguageStatus === 'downloadable' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <CloudIcon className="size-4" />
                <span className="text-xs font-medium">
                  Can be downloaded for on-device use
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadLanguageModel}
              >
                Download Language Model
              </Button>
            </div>
          ) : deviceLanguageStatus === 'downloading' ? (
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
              <span className="text-xs font-medium">Downloading...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
              <CloudIcon className="size-4" />
              <span className="text-xs">
                Not available for on-device recognition
              </span>
            </div>
          )}
        </div>
      )}
    </SettingsSection>
  );
}

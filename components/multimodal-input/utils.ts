import { upload } from '@vercel/blob/client';

import type { Attachment } from '@/lib/ai/types';
import type {
  SpeechRecognitionEvent,
  SpeechRecognitionResultList,
} from './types';

interface TranscriptState {
  finalTranscript: string;
  lastResultIndex: number;
}

interface ProcessTranscriptResult {
  finalTranscript: string;
  interimTranscript: string;
  lastResultIndex: number;
}

export function createTranscriptState(): TranscriptState {
  return { finalTranscript: '', lastResultIndex: 0 };
}

export function processSpeechRecognitionResults(
  event: SpeechRecognitionEvent,
  state: TranscriptState,
): ProcessTranscriptResult {
  let interimTranscript = '';

  for (let i = state.lastResultIndex; i < event.results.length; i++) {
    const result = event.results[i];
    if (result.isFinal) {
      state.finalTranscript += result[0].transcript + ' ';
      state.lastResultIndex = i + 1;
    } else {
      interimTranscript += result[0].transcript;
    }
  }

  return {
    finalTranscript: state.finalTranscript,
    interimTranscript,
    lastResultIndex: state.lastResultIndex,
  };
}

export function buildFullTranscript(
  baseInput: string,
  finalTranscript: string,
  interimTranscript: string,
): string {
  const base = baseInput;
  const space = base.length > 0 && !base.endsWith(' ') ? ' ' : '';
  const finalText = finalTranscript.trim();
  const fullText = finalText
    ? base +
      space +
      finalText +
      (interimTranscript ? ' ' + interimTranscript : '')
    : interimTranscript
      ? base + space + interimTranscript
      : base;
  return fullText;
}

// Utility functions for multimodal input components

/**
 * Detects the user's browser language and maps it to a supported language code
 * @returns A supported language code string or 'auto' if detection fails
 */
export const detectUserLanguage = (): string => {
  // Default to auto-detect if we can't determine
  const userLang = 'auto';

  try {
    // Check if running in browser environment
    if (typeof navigator === 'undefined') {
      return userLang;
    }

    // Get browser language(s)
    const browserLang =
      navigator.language ||
      (Array.isArray(navigator.languages) && navigator.languages[0]);

    if (browserLang) {
      // Extract base language code (e.g., 'en', 'fr', 'de')
      const baseLang = browserLang.split('-')[0].toLowerCase();

      // Map base language to supported language codes
      const langMapping: Record<string, string> = {
        en: 'en-US', // Default English to US
        es: 'es-ES',
        fr: 'fr-FR',
        de: 'de-DE',
        it: 'it-IT',
        pt: 'pt-BR', // Default Portuguese to Brazil
        vi: 'vi-VN',
        zh: 'zh-CN', // Default Chinese to Simplified
        ja: 'ja-JP',
        ko: 'ko-KR',
        ar: 'ar-SA',
        ru: 'ru-RU',
        hi: 'hi-IN',
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

/**
 * Uploads a file to Vercel Blob directly from the client.
 * @param file The file to upload
 * @returns The uploaded attachment (conforming to ai.Attachment) or undefined if upload failed
 */
export const uploadFile = async (
  file: File,
): Promise<Attachment | undefined> => {
  try {
    const newBlob = await upload(file.name, file, {
      access: 'public',
      handleUploadUrl: '/api/chat/files/upload', // Our backend route for token generation
    });

    // Map PutBlobResult to the ai.Attachment structure.
    // `newBlob` contains: url, downloadUrl, pathname, contentType, contentDisposition.
    // `ai.Attachment` expects: url, name (optional), contentType (optional).
    return {
      url: newBlob.url,
      name: file.name, // Use original file name for the attachment's name property
      contentType: newBlob.contentType, // Pass along contentType from Vercel Blob
      // `size` and `originalFilename` (as a separate field) are not part of ai.Attachment
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Client-side upload failed.';
    console.error(
      'Error during client-side file upload to Vercel Blob:',
      errorMessage,
      error,
    );
    return undefined;
  }
};

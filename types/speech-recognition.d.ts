export interface SpeechRecognitionErrorEvent extends Event {
  error: SpeechRecognitionErrorCode;
  message: string;
}

export type SpeechRecognitionErrorCode = 
  | "no-speech"
  | "aborted"
  | "audio-capture"
  | "network"
  | "not-allowed"
  | "service-not-allowed"
  | "language-not-supported"
  | "phrases-not-supported";

export type SpeechRecognitionMode = 
  | "ondevice-preferred" 
  | "ondevice-only" 
  | "cloud-only";

export type AvailabilityStatus = 
  | "unavailable"
  | "downloadable" 
  | "downloading"
  | "available";

export interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

export interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface SpeechRecognitionPhrase {
  phrase: string;
  boost: number;
}

export interface SpeechRecognitionPhraseList {
  length: number;
  item(index: number): SpeechRecognitionPhrase;
  addItem(item: SpeechRecognitionPhrase): void;
  removeItem(index: number): void;
}

export interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  mode: SpeechRecognitionMode;
  phrases: SpeechRecognitionPhraseList | null;
  
  onstart: (event: Event) => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: (event: Event) => void;
  onaudiostart: (event: Event) => void;
  onsoundstart: (event: Event) => void;
  onspeechstart: (event: Event) => void;
  onspeechend: (event: Event) => void;
  onsoundend: (event: Event) => void;
  onaudioend: (event: Event) => void;
  onnomatch: (event: SpeechRecognitionEvent) => void;
  
  start(): void;
  start(audioTrack: MediaStreamTrack): void;
  stop(): void;
  abort(): void;
}

export interface SpeechRecognitionConstructor {
  new(): SpeechRecognition;
  prototype: SpeechRecognition;
  availableOnDevice(lang: string): Promise<AvailabilityStatus>;
  installOnDevice(lang: string): Promise<boolean>;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}
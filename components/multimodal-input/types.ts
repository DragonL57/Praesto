// Virtual Keyboard API types
export interface VirtualKeyboardRect {
    x: number;
    y: number;
    width: number;
    height: number;
}

// Custom interface for the geometry change event that doesn't extend Event
export interface VirtualKeyboardGeometryChangeEvent {
    target: {
        boundingRect: VirtualKeyboardRect;
    };
}

// Define the VirtualKeyboard interface without extending EventTarget
export interface VirtualKeyboard {
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

    const SpeechRecognition: {
        new(): SpeechRecognition;
        prototype: SpeechRecognition;
        availableOnDevice?(language: string): Promise<AvailabilityStatus>;
        installOnDevice?(language: string): Promise<boolean>;
    } | undefined;

    const webkitSpeechRecognition: {
        new(): SpeechRecognition;
        prototype: SpeechRecognition;
        availableOnDevice?(language: string): Promise<AvailabilityStatus>;
        installOnDevice?(language: string): Promise<boolean>;
    } | undefined;
}

// Speech recognition types
export type SpeechRecognitionMode = 'ondevice-preferred' | 'ondevice-only' | 'cloud-only';
export type AvailabilityStatus = 'available' | 'downloadable' | 'unavailable' | 'downloading';

export interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

export interface SpeechRecognitionErrorEvent extends Event {
    error: string;
    message: string;
}

export interface SpeechRecognitionResultList {
    length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}

export interface SpeechRecognitionResult {
    isFinal: boolean;
    length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}

export interface SpeechRecognitionAlternative {
    transcript: string;
    confidence: number;
}

export interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    mode?: SpeechRecognitionMode;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onstart: ((event: Event) => void) | null;
    onend: ((event: Event) => void) | null;
}
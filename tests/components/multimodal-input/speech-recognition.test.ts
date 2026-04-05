import { test, expect } from '@playwright/test';

import {
  buildFullTranscript,
  createTranscriptState,
  processSpeechRecognitionResults,
} from '@/components/multimodal-input/utils';

import type {
  SpeechRecognitionEvent,
  SpeechRecognitionResultList,
} from '@/components/multimodal-input/types';

function createMockResult(result: {
  transcript: string;
  isFinal: boolean;
}): SpeechRecognitionResult {
  return {
    isFinal: result.isFinal,
    length: 1,
    item: () => ({ transcript: result.transcript, confidence: 1 }),
    0: { transcript: result.transcript, confidence: 1 },
  } as unknown as SpeechRecognitionResult;
}

function createMockResultList(
  results: Array<{ transcript: string; isFinal: boolean }>,
): SpeechRecognitionResultList {
  const resultObjects = results.map((r) => createMockResult(r));
  const resultList = {
    length: results.length,
    item: (index: number) => resultObjects[index],
  } as SpeechRecognitionResultList;
  for (let i = 0; i < results.length; i++) {
    Object.defineProperty(resultList, i, {
      get: () => resultObjects[i],
      enumerable: true,
      configurable: true,
    });
  }
  return resultList;
}

function createMockEvent(
  results: Array<{ transcript: string; isFinal: boolean }>,
): SpeechRecognitionEvent {
  const mockResults = createMockResultList(results);
  return {
    results: mockResults,
    resultIndex: 0,
  } as unknown as SpeechRecognitionEvent;
}

test.describe('Speech Recognition Transcript Processing', () => {
  test.describe('createTranscriptState', () => {
    test('should initialize with empty transcript and zero index', () => {
      const state = createTranscriptState();

      expect(state.finalTranscript).toBe('');
      expect(state.lastResultIndex).toBe(0);
    });
  });

  test.describe('processSpeechRecognitionResults', () => {
    test('should accumulate final transcripts from multiple onresult calls', () => {
      const state = createTranscriptState();

      const event1 = createMockEvent([{ transcript: 'Hello', isFinal: true }]);
      processSpeechRecognitionResults(event1, state);

      expect(state.finalTranscript).toBe('Hello ');
      expect(state.lastResultIndex).toBe(1);

      // Web Speech API fires subsequent events with ALL results, not just new ones
      const event2 = createMockEvent([
        { transcript: 'Hello', isFinal: true }, // already processed, should be skipped
        { transcript: 'world', isFinal: true }, // new result
      ]);
      processSpeechRecognitionResults(event2, state);

      expect(state.finalTranscript).toBe('Hello world ');
      expect(state.lastResultIndex).toBe(2);
    });

    test('should skip already processed results to prevent duplication', () => {
      const state = createTranscriptState();

      const event1 = createMockEvent([{ transcript: 'Hello', isFinal: true }]);
      processSpeechRecognitionResults(event1, state);

      expect(state.lastResultIndex).toBe(1);

      const event2 = createMockEvent([
        { transcript: 'Hello', isFinal: true },
        { transcript: 'world', isFinal: true },
      ]);
      processSpeechRecognitionResults(event2, state);

      expect(state.finalTranscript).toBe('Hello world ');
      expect(state.lastResultIndex).toBe(2);
    });

    test('should return interim transcript separately without accumulating', () => {
      const state = createTranscriptState();

      const event = createMockEvent([{ transcript: 'Think', isFinal: false }]);
      const result = processSpeechRecognitionResults(event, state);

      expect(result.interimTranscript).toBe('Think');
      expect(state.finalTranscript).toBe('');
      expect(state.lastResultIndex).toBe(0);
    });

    test('should handle mixed final and interim in same event', () => {
      const state = createTranscriptState();

      const event = createMockEvent([
        { transcript: 'Final one', isFinal: true },
        { transcript: 'Interim', isFinal: false },
      ]);
      const result = processSpeechRecognitionResults(event, state);

      expect(state.finalTranscript).toBe('Final one ');
      expect(result.interimTranscript).toBe('Interim');
      expect(state.lastResultIndex).toBe(1);
    });

    test('should handle empty results', () => {
      const state = createTranscriptState();

      const event = createMockEvent([]);
      const result = processSpeechRecognitionResults(event, state);

      expect(result.finalTranscript).toBe('');
      expect(result.interimTranscript).toBe('');
      expect(state.lastResultIndex).toBe(0);
    });

    test('should not accumulate interim transcripts across events', () => {
      const state = createTranscriptState();

      const event1 = createMockEvent([{ transcript: 'Th', isFinal: false }]);
      const result1 = processSpeechRecognitionResults(event1, state);

      const event2 = createMockEvent([
        { transcript: 'Th', isFinal: false },
        { transcript: 'inking', isFinal: false },
      ]);
      const result2 = processSpeechRecognitionResults(event2, state);

      expect(result2.interimTranscript).toBe('Thinking');
      expect(state.finalTranscript).toBe('');
    });
  });

  test.describe('buildFullTranscript', () => {
    test('should combine base input with final transcript', () => {
      const result = buildFullTranscript('Hello', 'world', '');

      expect(result).toBe('Hello world');
    });

    test('should add space between base and transcript when needed', () => {
      const result = buildFullTranscript('Hello', 'world', '');

      expect(result).toBe('Hello world');
    });

    test('should not add extra space when base ends with space', () => {
      const result = buildFullTranscript('Hello ', 'world', '');

      expect(result).toBe('Hello world');
    });

    test('should append interim transcript after final', () => {
      const result = buildFullTranscript('', 'final', 'interim');

      expect(result).toBe('final interim');
    });

    test('should return only interim when no final', () => {
      const result = buildFullTranscript('', '', 'interim');

      expect(result).toBe('interim');
    });

    test('should return base only when no transcripts', () => {
      const result = buildFullTranscript('base', '', '');

      expect(result).toBe('base');
    });

    test('should handle empty base with final only', () => {
      const result = buildFullTranscript('', 'hello', '');

      expect(result).toBe('hello');
    });
  });

  test.describe('Integration: voice input deduplication', () => {
    test('should not duplicate transcripts across multiple onresult events', () => {
      const state = createTranscriptState();

      const event1 = createMockEvent([{ transcript: 'First', isFinal: true }]);
      processSpeechRecognitionResults(event1, state);

      const event2 = createMockEvent([
        { transcript: 'First', isFinal: true },
        { transcript: 'Second', isFinal: true },
      ]);
      processSpeechRecognitionResults(event2, state);

      const event3 = createMockEvent([
        { transcript: 'First', isFinal: true },
        { transcript: 'Second', isFinal: true },
      ]);
      processSpeechRecognitionResults(event3, state);

      expect(state.finalTranscript).toBe('First Second ');
      expect(state.lastResultIndex).toBe(2);
    });

    test('should accumulate final for submission while showing interim in real-time', () => {
      const state = createTranscriptState();

      const event1 = createMockEvent([{ transcript: 'Hello', isFinal: true }]);
      const result1 = processSpeechRecognitionResults(event1, state);
      let displayText = buildFullTranscript(
        '',
        result1.finalTranscript,
        result1.interimTranscript,
      );
      expect(displayText).toBe('Hello');

      const event2 = createMockEvent([
        { transcript: 'Hello', isFinal: true },
        { transcript: 'w', isFinal: false },
      ]);
      const result2 = processSpeechRecognitionResults(event2, state);
      displayText = buildFullTranscript(
        '',
        result2.finalTranscript,
        result2.interimTranscript,
      );
      expect(displayText).toBe('Hello w');

      const event3 = createMockEvent([
        { transcript: 'Hello', isFinal: true },
        { transcript: 'wo', isFinal: false },
      ]);
      const result3 = processSpeechRecognitionResults(event3, state);
      displayText = buildFullTranscript(
        '',
        result3.finalTranscript,
        result3.interimTranscript,
      );
      expect(displayText).toBe('Hello wo');
    });
  });
});

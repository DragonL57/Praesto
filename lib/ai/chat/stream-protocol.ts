/**
 * Praesto Custom Stream Protocol
 * Standardizes communication between the chat API and the frontend.
 */

export type StreamPartType = 'text' | 'reasoning' | 'tool-call' | 'tool-result' | 'error' | 'metadata';

export interface StreamPart {
  type: StreamPartType;
  data: unknown;
}

/**
 * Protocol Prefixes:
 * '0': Text content delta
 * 'h': Reasoning/Thinking content delta
 * '9': Tool call (sent when AI decides to use a tool)
 * 'a': Tool result (sent after tool execution completes)
 * 'e': Error message
 * 'm': Metadata (e.g., chat title, model info)
 */
export const PROTOCOL_PREFIXES: Record<StreamPartType, string> = {
  'text': '0',
  'reasoning': 'h',
  'tool-call': '9',
  'tool-result': 'a',
  'error': 'e',
  'metadata': 'm',
};

/**
 * Reverse mapping for decoding
 */
export const PREFIX_TO_TYPE: Record<string, StreamPartType> = Object.fromEntries(
  Object.entries(PROTOCOL_PREFIXES).map(([type, prefix]) => [prefix, type as StreamPartType])
);

/**
 * Formats a single part of the stream for sending over the wire.
 * Format: <prefix>:<JSON_data>\n
 */
export function formatStreamPart(type: StreamPartType, data: unknown): string {
  const prefix = PROTOCOL_PREFIXES[type];
  if (!prefix) {
    throw new Error(`Unknown stream part type: ${type}`);
  }
  return `${prefix}:${JSON.stringify(data)}\n`;
}

/**
 * Helper to encode a string into a Uint8Array for the ReadableStream.
 */
export function encodeStreamPart(type: StreamPartType, data: unknown): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(formatStreamPart(type, data));
}

/**
 * Parses a single line from the stream.
 */
export function parseStreamLine(line: string): StreamPart | null {
  if (!line.trim()) return null;

  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) return null;

  const prefix = line.slice(0, colonIndex);
  const dataStr = line.slice(colonIndex + 1);

  const type = PREFIX_TO_TYPE[prefix];
  if (!type) return null;

  try {
    const data = JSON.parse(dataStr);
    return { type, data };
  } catch {
    console.error(`[StreamProtocol] Failed to parse data for type ${type}:`, dataStr);
    return null;
  }
}

/**
 * Centralized stream protocol logic.
 */
export const StreamProtocol = {
  format: formatStreamPart,
  encode: encodeStreamPart,
  parse: parseStreamLine,
  prefixes: PROTOCOL_PREFIXES,
  types: PREFIX_TO_TYPE,
};

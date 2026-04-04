// Model interface and configuration
export interface ChatModel {
  id: string;
  name: string;
  description: string;
  provider?: string;
  isDefault?: boolean;
  supportsTools?: boolean;
  supportsThinking?: boolean;
  extraParams?: Record<string, unknown>;
}

// Model configurations with metadata
// extraParams are passed to Poe via extra_body in the OpenAI SDK
export const chatModels: ChatModel[] = [
  {
    id: 'grok-4.1-fast-reasoning',
    name: 'Grok-4.1',
    description: 'Grok-4.1 Fast Reasoning model via Poe API',
    provider: 'Poe',
    isDefault: true,
    supportsTools: true,
    supportsThinking: true,
    // Grok-4.1 doesn't require extra params for reasoning via Poe's OpenAI-compatible API
  },
  {
    id: 'minimax-m2.5',
    name: 'Minimax M2.5',
    description: 'Minimax M2.5 model via Poe API',
    provider: 'Poe',
    supportsTools: true,
    supportsThinking: true,
    // Minimax thinks by default, no extra params needed
  },
  {
    id: 'gemma-4-31b',
    name: 'Gemma 4 31B',
    description: 'Gemma 4 31B model via Poe API',
    provider: 'Poe',
    supportsTools: true,
    supportsThinking: true,
  },
];

// Default model configuration
const defaultModel = chatModels.find((model) => model.isDefault);
export const DEFAULT_CHAT_MODEL_ID = defaultModel
  ? defaultModel.id
  : chatModels.length > 0
    ? chatModels[0].id
    : 'grok-4.1-fast-reasoning';

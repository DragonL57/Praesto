// Model interface and configuration
export interface ChatModel {
  id: string;
  name: string;
  description: string;
  provider?: string;
  isDefault?: boolean;
  supportsTools?: boolean;
  supportsThinking?: boolean;
}

// Model configurations with metadata
export const chatModels: ChatModel[] = [
  {
    id: 'grok-4.1-fast-reasoning',
    name: 'Grok-4.1',
    description: 'Grok-4.1 Fast Reasoning model via Poe API',
    provider: 'Poe',
    isDefault: true,
    supportsTools: true,
    supportsThinking: true,
  },
  {
    id: 'glm-5',
    name: 'GLM-5',
    description: 'GLM-5 model via Poe API',
    provider: 'Poe',
    supportsTools: true,
    supportsThinking: true,
  },
  {
    id: 'minimax-m2.5',
    name: 'Minimax M2.5',
    description: 'Minimax M2.5 model via Poe API',
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

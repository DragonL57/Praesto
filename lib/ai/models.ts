export interface ChatModel {
  id: string;
  name: string;
  description: string;
  provider?: string;
  isDefault?: boolean;
  supportsTools?: boolean;
  supportsThinking?: boolean;
}

export const chatModels: ChatModel[] = [
  {
    id: 'grok-4.1-fast-reasoning',
    name: 'Grok 4.1',
    description: 'Grok 4.1 Fast Reasoning model via Poe API',
    provider: 'Poe',
    isDefault: true,
    supportsTools: true,
    supportsThinking: true,
  },
  {
    id: 'glm-4.6',
    name: 'GLM-4.6',
    description: 'GLM-4.6 model from Z.AI',
    provider: 'Z.AI',
    supportsTools: true,
    supportsThinking: true,
  },
  {
    id: 'deepseek-v3.2',
    name: 'DeepSeek v3.2',
    description: 'DeepSeek v3.2 model via Poe API (text only, with thinking)',
    provider: 'Poe',
    supportsTools: false,
    supportsThinking: true,
  },
  ];

const defaultModel = chatModels.find(model => model.isDefault);
export const DEFAULT_CHAT_MODEL_ID = defaultModel
  ? defaultModel.id
  : (chatModels.length > 0
    ? chatModels[0].id
    : 'glm-4.6');

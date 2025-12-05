export interface ChatModel {
  id: string;
  name: string;
  description: string;
  provider?: string;
  isDefault?: boolean;
}

export const chatModels: ChatModel[] = [
  {
    id: 'glm-4.6',
    name: 'GLM-4.6',
    description: 'GLM-4.6 model from Z.AI',
    provider: 'Z.AI',
    isDefault: true,
  },
  {
    id: 'glm-4.5',
    name: 'GLM-4.5',
    description: 'GLM-4.5 model from Z.AI',
    provider: 'Z.AI',
  },
  {
    id: 'gemma-3-27b-it',
    name: 'Gemma 3 27B IT',
    description: 'Gemma 3 27B IT model from FPT Cloud',
    provider: 'FPT Cloud',
  },
  {
    id: 'Qwen3-32B',
    name: 'Qwen3-32B',
    description: 'Qwen3-32B model from FPT Cloud',
    provider: 'FPT Cloud',
  },
];

const defaultModel = chatModels.find(model => model.isDefault);
export const DEFAULT_CHAT_MODEL_ID = defaultModel
  ? defaultModel.id
  : (chatModels.length > 0
    ? chatModels[0].id
    : 'glm-4.6');

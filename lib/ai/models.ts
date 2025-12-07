export interface ChatModel {
  id: string;
  name: string;
  description: string;
  provider?: string;
  isDefault?: boolean;
}

export const chatModels: ChatModel[] = [
  {
    id: 'grok-4.1-fast-reasoning',
    name: 'Grok 4.1 Fast Reasoning',
    description: 'Grok 4.1 Fast Reasoning model via Poe API',
    provider: 'Poe',
    isDefault: true,
  },
  {
    id: 'glm-4.6',
    name: 'GLM-4.6',
    description: 'GLM-4.6 model from Z.AI',
    provider: 'Z.AI',
  },
];

const defaultModel = chatModels.find(model => model.isDefault);
export const DEFAULT_CHAT_MODEL_ID = defaultModel
  ? defaultModel.id
  : (chatModels.length > 0
    ? chatModels[0].id
    : 'glm-4.6');

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
    id: 'glm-4.5-air',
    name: 'GLM-4.5 Air',
    description: 'GLM-4.5 Air model from Z.AI',
    provider: 'Z.AI',
  },
];

const defaultModel = chatModels.find(model => model.isDefault);
export const DEFAULT_CHAT_MODEL_ID = defaultModel
  ? defaultModel.id
  : (chatModels.length > 0
    ? chatModels[0].id
    : 'glm-4.6');

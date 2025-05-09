export const DEFAULT_CHAT_MODEL: string = 'chat-model';

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'xai-grok-3',
    name: 'xAI Grok 3',
    description: 'Grok 3 model from xAI',
  },
  {
    id: 'chat-model',
    name: 'GPT-4.1',
    description: 'GPT-4.1 from OpenAI',
  },
  {
    id: 'accounts/fireworks/models/qwen3-235b-a22b',
    name: 'Qwen3 235B',
    description: 'Qwen3 235B reasoning model from Fireworks',
  },
];

export const DEFAULT_CHAT_MODEL: string = 'chat-model';

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model',
    name: 'Chat model',
    description: 'Primary model for all-purpose chat',
  },
  {
    id: 'chat-model-reasoning',
    name: 'Reasoning model',
    description: 'Uses advanced reasoning',
  },
  {
    id: 'google-gemini-pro',
    name: 'Google Gemini Pro',
    description: 'Google Generative AI Gemini 2.5 Pro model',
  },
  {
    id: 'google-gemini-flash',
    name: 'Google Gemini Flash',
    description: 'Google Generative AI Gemini 2.5 Flash model (faster)',
  },
  {
    id: 'google-gemini-search',
    name: 'Google Gemini with Search',
    description: 'Gemini 1.5 Pro with Google Search grounding',
  },
];

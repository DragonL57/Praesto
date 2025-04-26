export const DEFAULT_CHAT_MODEL: string = 'chat-model';

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model',
    name: 'GPT-4.1',
    description: 'GPT-4.1 from OpenAI',
  },
  {
    id: 'google-gemini-flash',
    name: 'Google Gemini Flash',
    description: 'Gemini 2.5 Flash model with thinking enabled',
  },
  {
    id: 'google-gemini-pro',
    name: 'Google Gemini Pro',
    description: 'Gemini 2.5 Pro model',
  },
];

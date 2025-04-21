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
    description: 'Gemini Gemini 2.5 Flash with Google Search grounding',
  },
];

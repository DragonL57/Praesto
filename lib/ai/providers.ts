import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { customProvider } from 'ai';

// Z.AI OpenAI-compatible provider for main chat
const zaiProvider = createOpenAICompatible({
  name: 'z-ai',
  apiKey: process.env.ZAI_API_KEY || '',
  baseURL: 'https://api.z.ai/api/coding/paas/v4',
});

// FPT Cloud LiteLLM OpenAI-compatible provider for title/chat creation
const fptCloudProvider = createOpenAICompatible({
  name: 'fpt-cloud',
  apiKey: process.env.FPT_API_KEY || '',
  baseURL: 'https://mkp-api.fptcloud.jp',
});

// Export the configured provider for the application
export const myProvider = customProvider({
  languageModels: {
    'chat-model': zaiProvider.chatModel('glm-4.6'),
    'title-model': fptCloudProvider.chatModel('gemma-3-27b-it'),
    'artifact-model': zaiProvider.chatModel('glm-4.6'),
  },
});

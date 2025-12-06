import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { customProvider } from 'ai';

// Z.AI OpenAI-compatible provider for main chat
const zaiProvider = createOpenAICompatible({
  name: 'z-ai',
  apiKey: process.env.ZAI_API_KEY || '',
  baseURL: 'https://api.z.ai/api/coding/paas/v4',
});

// Poe API OpenAI-compatible provider
const poeProvider = createOpenAICompatible({
  name: 'poe',
  apiKey: process.env.POE_API_KEY || '',
  baseURL: 'https://api.poe.com/v1',
});

// Export the configured provider for the application
// Model IDs match those defined in models.ts chatModels array
export const myProvider = customProvider({
  languageModels: {
    // Z.AI models - registered with their actual model IDs
    'glm-4.5': zaiProvider.chatModel('glm-4.5'),
    'glm-4.5-air': zaiProvider.chatModel('glm-4.5-air'),
    // Z.AI models - registered with their actual model IDs
    'glm-4.6': zaiProvider.chatModel('glm-4.6'),
    // Poe models - registered with their actual model IDs
    'kimi-k2-thinking': poeProvider.chatModel('kimi-k2-thinking'),
    'deepseek-v3.2': poeProvider.chatModel('deepseek-v3.2'),
    // Aliases for internal use
    'chat-model': poeProvider.chatModel('kimi-k2-thinking'),
    'title-model': zaiProvider.chatModel('glm-4.5-air'),
  },
});

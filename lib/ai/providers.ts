import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { customProvider } from 'ai';

// Z.AI OpenAI-compatible provider for main chat
const zaiProvider = createOpenAICompatible({
  name: 'z-ai',
  apiKey: process.env.ZAI_API_KEY || '',
  baseURL: 'https://api.z.ai/api/coding/paas/v4',
});

// Export the configured provider for the application
// Model IDs match those defined in models.ts chatModels array
export const myProvider = customProvider({
  languageModels: {
    // Z.AI models - registered with their actual model IDs
    'glm-4.6': zaiProvider.chatModel('glm-4.6'),
    'glm-4.5': zaiProvider.chatModel('glm-4.5'),
    'glm-4.5-air': zaiProvider.chatModel('glm-4.5-air'),
    // Aliases for internal use
    'chat-model': zaiProvider.chatModel('glm-4.6'),
    'title-model': zaiProvider.chatModel('glm-4.5-air'),
    'artifact-model': zaiProvider.chatModel('glm-4.6'),
  },
});

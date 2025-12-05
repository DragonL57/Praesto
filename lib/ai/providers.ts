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
// Model IDs match those defined in models.ts chatModels array
export const myProvider = customProvider({
  languageModels: {
    // Z.AI models - registered with their actual model IDs
    'glm-4.6': zaiProvider.chatModel('glm-4.6'),
    'glm-4.5': zaiProvider.chatModel('glm-4.5'),
    // FPT Cloud models
    'gemma-3-27b-it': fptCloudProvider.chatModel('gemma-3-27b-it'),
    'Qwen3-32B': fptCloudProvider.chatModel('Qwen3-32B'),
    // Aliases for internal use
    'chat-model': zaiProvider.chatModel('glm-4.6'),
    'title-model': fptCloudProvider.chatModel('Qwen3-32B'),
    'artifact-model': zaiProvider.chatModel('glm-4.6'),
  },
});

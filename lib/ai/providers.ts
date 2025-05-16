import { customProvider , wrapLanguageModel, extractReasoningMiddleware } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  titleModel,
} from './models.test';
import { fireworks } from '@ai-sdk/fireworks';

// Create the Pollinations.AI OpenAI-compatible provider
export const pollinationsProvider = createOpenAICompatible({
  name: 'pollinations-ai',
  apiKey: process.env.POLLINATIONS_API_KEY || '', // API key if required
  baseURL: 'https://text.pollinations.ai/openai', // Pollinations OpenAI-compatible endpoint
  // Optional: Add headers for tracking/identification
  headers: {
    'X-App-Name': 'UniTaskAI',
    'X-Custom-Header': process.env.POLLINATIONS_CUSTOM_HEADER || '',
  },
  // Optional: Add referrer for analytics and potentially better rate limits
  queryParams: {
    'referrer': 'UniTaskAI',
  },
});

// Define Pollinations-specific model IDs for better type checking and auto-completion
type PollinationsChatModelIds =
  | 'openai-large'   // Large model for chat (GPT-4.1)
  | (string & {});     // Allow other string model IDs

type PollinationsCompletionModelIds =
  | 'openai-large'
  | (string & {});

type PollinationsEmbeddingModelIds = string & {};

type PollinationsImageModelIds = string & {};

// Create a typed provider for better IDE support
export const typedPollinationsProvider = createOpenAICompatible<
  PollinationsChatModelIds,
  PollinationsCompletionModelIds,
  PollinationsEmbeddingModelIds,
  PollinationsImageModelIds
>({
  name: 'pollinations-ai',
  baseURL: 'https://text.pollinations.ai/openai',
  headers: {
    'X-App-Name': 'UniTaskAI',
  },
  queryParams: {
    'referrer': 'UniTaskAI',
  },
});

// Create enhanced reasoning model for Fireworks
export const enhancedQwenModel = wrapLanguageModel({
  model: fireworks('accounts/fireworks/models/qwen3-235b-a22b'),
  middleware: extractReasoningMiddleware({ tagName: 'think' }),
});


// You can swap openai() for openai.chat(), openai.responses(), etc. per model as needed
export const myProvider = isTestEnvironment
  ? customProvider({
    languageModels: {
      // test models from your mocks/stubs
      'chat-model': chatModel,
      'title-model': titleModel,
      'artifact-model': artifactModel,
      'chat-model-reasoning': enhancedQwenModel,
    },
  })
  : customProvider({
    languageModels: {
      // GPT-4.1 from OpenAI for chat
      'chat-model': pollinationsProvider.chatModel('openai-large'),

      // Use gpt-4.1-mini for title generation
      'title-model': pollinationsProvider.chatModel('openai'),

      // Use qwen3 for artifact generation
      'artifact-model': pollinationsProvider.chatModel('openai-large'),

      // Add Fireworks Qwen3 model with reasoning capabilities
      'chat-model-reasoning': enhancedQwenModel,
    },
  });

import { customProvider, wrapLanguageModel, extractReasoningMiddleware } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  titleModel,
} from './models.test';
import { xai } from '@ai-sdk/xai';
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
  | 'openai-large'   // Large model for chat
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
    },
  })
  : customProvider({
    languageModels: {
      // GPT-4.1 from OpenAI for chat
      'chat-model': pollinationsProvider.chatModel('openai-large'),

      // Use gemini 2.0 for title generation (no thinking capability)
      'title-model': pollinationsProvider.chatModel('openai'),

      // Use openai-xlarge for artifact generation
      'artifact-model': pollinationsProvider.chatModel('openai-large'),

      // Add xAI Grok 3 model
      'xai-grok-3': xai('grok-3-fast'),

      // Add Fireworks Qwen3 model with reasoning capabilities
      'accounts/fireworks/models/qwen3-235b-a22b': enhancedQwenModel,
    },
  });

import { customProvider } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google, createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  titleModel,
} from './models.test';

// Create the Pollinations.AI OpenAI-compatible provider
export const pollinationsProvider = createOpenAICompatible({
  name: 'pollinations-ai',
  apiKey: process.env.POLLINATIONS_API_KEY || '', // API key if required
  baseURL: 'https://text.pollinations.ai/openai', // Pollinations OpenAI-compatible endpoint
  // Optional: Add headers for tracking/identification
  headers: {
    'X-App-Name': 'VercelChatUI',
    'X-Custom-Header': process.env.POLLINATIONS_CUSTOM_HEADER || '',
  },
  // Optional: Add referrer for analytics and potentially better rate limits
  queryParams: {
    'referrer': 'VercelChatUI',
  },
});

// Define Pollinations-specific model IDs for better type checking and auto-completion
type PollinationsChatModelIds =
  | 'openai-xlarge'   // Large model for chat
  | (string & {});     // Allow other string model IDs

type PollinationsCompletionModelIds =
  | 'openai-xlarge'
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
    'X-App-Name': 'VercelChatUI',
  },
  queryParams: {
    'referrer': 'VercelChatUI',
  },
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
        'chat-model': pollinationsProvider.chatModel('openai-xlarge'),
        
        // Use openai-xlarge for title generation
        'title-model': pollinationsProvider.chatModel('openai-xlarge'),
        
        // Use openai-xlarge for artifact generation
        'artifact-model': pollinationsProvider.chatModel('openai-xlarge'),
        
        // Keep Google models as they are
        'google-gemini-pro': google('gemini-2.5-pro-exp-03-25'),
        'google-gemini-flash': google('gemini-2.5-flash-preview-04-17'),
        'google-gemini-search': google('gemini-2.5-flash-preview-04-17', { useSearchGrounding: true }),
      },
      // Remove image models from Pollinations provider
    });

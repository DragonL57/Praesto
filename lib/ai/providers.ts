import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { google } from '@ai-sdk/google';
import {
  customProvider,
  wrapLanguageModel,
  defaultSettingsMiddleware,
  convertToModelMessages,
  smoothStream,
  stepCountIs,
  type UIMessage
} from 'ai';

// Import tools and utilities
import { getWeather } from './tools/get-weather';
import { webSearch } from './tools/web-search';
import { readWebsiteContent } from './tools/read-website-content';
import { systemPrompt } from './prompts';
import { isProductionEnvironment } from '@/lib/constants';

// Model interface and configuration
export interface ChatModel {
  id: string;
  name: string;
  description: string;
  provider?: string;
  isDefault?: boolean;
  supportsTools?: boolean;
  supportsThinking?: boolean;
}

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

// Enhanced Grok-4.1-fast-reasoning model
const enhancedGrok41FastReasoningModel = wrapLanguageModel({
  model: poeProvider.chatModel('grok-4.1-fast-reasoning'),
  middleware: defaultSettingsMiddleware({
    settings: {
      temperature: 1,
    }
  })
});

// Inception Mercury Coder model
const inceptionMercuryCoderModel = wrapLanguageModel({
  model: poeProvider.chatModel('inception-mercury-coder'),
  middleware: defaultSettingsMiddleware({
    settings: {
      temperature: 0.7,
    }
  })
});

const enhancedGlmModel = wrapLanguageModel({
  model: zaiProvider.chatModel('glm-4.6'),
  middleware: defaultSettingsMiddleware({
    settings: {
      temperature: 0.7,
      providerOptions: {
        'z-ai': {
          thinking: {
            type: 'enabled'
          }
        }
      }
    }
  })
});

const lightWeightModel = wrapLanguageModel({
  model: zaiProvider.chatModel('glm-4.5-air'),
  middleware: defaultSettingsMiddleware({
    settings: {
      temperature: 0.5,
    }
  })
});

// Google Gemini models
const gemini3FlashModel = wrapLanguageModel({
  model: google('gemini-3-flash-preview'),
  middleware: defaultSettingsMiddleware({
    settings: {
      temperature: 1,
    }
  })
});


// Model configurations with metadata
export const chatModels: ChatModel[] = [
  {
    id: 'glm-4.6',
    name: 'GLM-4.6',
    description: 'GLM-4.6 model from Z.AI',
    provider: 'Z.AI',
    isDefault: true,
    supportsTools: true,
    supportsThinking: true,
  },
  {
    id: 'grok-4.1-fast-reasoning',
    name: 'Grok-4.1',
    description: 'Grok-4.1 Fast Reasoning model via Poe API',
    provider: 'Poe',
    supportsTools: true,
    supportsThinking: true,
  },
  {
    id: 'inception-mercury-coder',
    name: 'Inception Mercury Coder',
    description: 'Inception Mercury Coder - Specialized coding model via Poe API',
    provider: 'Poe',
    supportsTools: true,
    supportsThinking: false,
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    description: 'Google Gemini 3 Flash Preview - Latest generation with advanced thinking',
    provider: 'Google',
    supportsTools: true,
    supportsThinking: true,
  },
];

// Default model configuration
const defaultModel = chatModels.find(model => model.isDefault);
export const DEFAULT_CHAT_MODEL_ID = defaultModel
  ? defaultModel.id
  : (chatModels.length > 0
    ? chatModels[0].id
    : 'glm-4.6');

// Export the configured provider for the application
// Model IDs match those defined in chatModels array above
export const myProvider = customProvider({
  languageModels: {
    // Enhanced Z.AI models with middleware
    'glm-4.5': zaiProvider.chatModel('glm-4.5'),
    'glm-4.5-air': lightWeightModel,
    'glm-4.6': enhancedGlmModel,

    // Enhanced Poe models with middleware
    'grok-4.1-fast-reasoning': enhancedGrok41FastReasoningModel,
    'inception-mercury-coder': inceptionMercuryCoderModel,

    // Google Gemini models with middleware
    'gemini-3-flash-preview': gemini3FlashModel,

    // Aliases for internal use (using enhanced models)
    'chat-model': enhancedGlmModel,
    'title-model': lightWeightModel,
  },
});

// Helper functions for model configuration
export function getModelConfiguration(modelId: string) {
  const currentModel = chatModels.find(model => model.id === modelId) ||
    chatModels.find(model => model.id === 'chat-model') ||
    chatModels[0];

  return {
    model: currentModel,
    supportsTools: currentModel?.supportsTools ?? true,
    supportsThinking: currentModel?.supportsThinking ?? true,
  };
}

// Get provider options for a specific model
export function getProviderOptions(supportsThinking: boolean) {
  const baseOptions = {};

  return {
    openai: baseOptions,
    'z-ai': {
      thinking: {
        type: supportsThinking ? 'enabled' : 'disabled'
      },
      ...baseOptions
    },
    poe: {
      ...baseOptions
    },
    google: {
      ...baseOptions
    }
  };
}

// Get standard model options
export function getModelOptions() {
  return {
    temperature: 1,
    maxTokens: 128000, // Set max context length to 128,000 tokens for all models
  };
}

// Get available tools for models that support them
export function getAvailableTools() {
  return {
    experimental_activeTools: [
      'getWeather',
      'webSearch',
      'readWebsiteContent',
    ] as ('getWeather' | 'webSearch' | 'readWebsiteContent')[],
    tools: {
      getWeather,
      webSearch,
      readWebsiteContent,
    },
  };
}

// Get stream text configuration
export function getStreamTextConfig(
  modelId: string,
  messages: Array<Omit<UIMessage, 'id'>>,
  userTimeContext?: {
    date: string;
    time: string;
    dayOfWeek: string;
    timeZone: string;
  }
) {
  const { supportsTools, supportsThinking } = getModelConfiguration(modelId);
  const modelInstance = myProvider.languageModel(modelId);
  const modelOptions = getModelOptions();
  const providerOptions = getProviderOptions(supportsThinking);

  return {
    model: modelInstance,
    system: systemPrompt({ selectedChatModel: modelId, userTimeContext }),
    messages: convertToModelMessages(messages),
    stopWhen: stepCountIs(10),
    ...modelOptions,
    providerOptions,
    experimental_transform: smoothStream({ chunking: 'line' }),
    experimental_telemetry: {
      isEnabled: isProductionEnvironment,
      functionId: 'stream-text',
    },
    ...(supportsTools && getAvailableTools()),
  };
}

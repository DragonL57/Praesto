import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import {
  customProvider,
  wrapLanguageModel,
  defaultSettingsMiddleware,
  convertToModelMessages,
  smoothStream,
  stepCountIs,
  type UIMessage,
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
    },
  }),
});

// Fast non-reasoning Grok model for quick responses
const grok41FastNonReasoningModel = wrapLanguageModel({
  model: poeProvider.chatModel('grok-4.1-fast-non-reasoning'),
  middleware: defaultSettingsMiddleware({
    settings: {
      temperature: 0.7,
    },
  }),
});

const glm5Model = wrapLanguageModel({
  model: poeProvider.chatModel('glm-5'),
  middleware: defaultSettingsMiddleware({
    settings: {
      temperature: 1,
    },
  }),
});

const minimaxM25Model = wrapLanguageModel({
  model: poeProvider.chatModel('minimax-m2.5'),
  middleware: defaultSettingsMiddleware({
    settings: {
      temperature: 0.8,
    },
  }),
});

// Model configurations with metadata
export const chatModels: ChatModel[] = [
  {
    id: 'grok-4.1-fast-reasoning',
    name: 'Grok-4.1',
    description: 'Grok-4.1 Fast Reasoning model via Poe API',
    provider: 'Poe',
    isDefault: true,
    supportsTools: true,
    supportsThinking: true,
  },
  {
    id: 'glm-5',
    name: 'GLM-5',
    description: 'GLM-5 model via Poe API',
    provider: 'Poe',
    supportsTools: true,
    supportsThinking: true,
  },
  {
    id: 'minimax-m2.5',
    name: 'Minimax M2.5',
    description: 'Minimax M2.5 model via Poe API',
    provider: 'Poe',
    supportsTools: true,
    supportsThinking: true,
  },
];

// Default model configuration
const defaultModel = chatModels.find((model) => model.isDefault);
export const DEFAULT_CHAT_MODEL_ID = defaultModel
  ? defaultModel.id
  : chatModels.length > 0
    ? chatModels[0].id
    : 'grok-4.1-fast-reasoning';

// Export the configured provider for the application
// Model IDs match those defined in chatModels array above
export const myProvider = customProvider({
  languageModels: {
    // Enhanced Poe models with middleware
    'grok-4.1-fast-reasoning': enhancedGrok41FastReasoningModel,
    'grok-4.1-fast-non-reasoning': grok41FastNonReasoningModel,
    'glm-5': glm5Model,
    'minimax-m2.5': minimaxM25Model,

    // Aliases for internal use (using enhanced models)
    'chat-model': enhancedGrok41FastReasoningModel,
    'title-model': grok41FastNonReasoningModel,
    'fast-model': grok41FastNonReasoningModel,
  },
});

// Helper functions for model configuration
export function getModelConfiguration(modelId: string) {
  const currentModel =
    chatModels.find((model) => model.id === modelId) ||
    chatModels.find((model) => model.id === 'chat-model') ||
    chatModels[0];

  return {
    model: currentModel,
    supportsTools: currentModel?.supportsTools ?? true,
    supportsThinking: currentModel?.supportsThinking ?? true,
  };
}

// Get provider options for a specific model
export function getProviderOptions(
  supportsThinking: boolean,
  _modelId?: string,
  _thinkingLevel?: string,
) {
  const baseOptions = {};

  return {
    openai: baseOptions,
    poe: {
      thinking: {
        type: supportsThinking ? 'enabled' : 'disabled',
      },
      ...baseOptions,
    },
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
  },
  thinkingLevel?: string,
) {
  const { supportsTools, supportsThinking } = getModelConfiguration(modelId);
  const modelInstance = myProvider.languageModel(modelId);
  const modelOptions = getModelOptions();
  const providerOptions = getProviderOptions(
    supportsThinking,
    modelId,
    thinkingLevel,
  );

  // Filter out tool parts with state 'input-available' before sending to model
  const filteredMessages = messages.map((msg) => ({
    ...msg,
    parts: Array.isArray(msg.parts)
      ? msg.parts.filter(
        (part) =>
          !(
            part &&
            typeof part === 'object' &&
            'state' in part &&
            ((part as { state?: string }).state === 'input-available' ||
              (part as { state?: string }).state === 'call')
          ),
      )
      : msg.parts,
  }));

  const baseConfig = {
    model: modelInstance,
    system: systemPrompt({ selectedChatModel: modelId, userTimeContext }),
    messages: convertToModelMessages(filteredMessages),
    stopWhen: stepCountIs(10),
    ...modelOptions,
    providerOptions,
    experimental_transform: smoothStream({ chunking: 'line' }),
    experimental_telemetry: {
      isEnabled: isProductionEnvironment,
      functionId: 'stream-text',
    },
  };

  // Use custom function calling tools for models that support them
  if (supportsTools) {
    return {
      ...baseConfig,
      ...getAvailableTools(),
    };
  }

  return baseConfig;
}

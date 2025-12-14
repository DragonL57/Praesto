import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
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

// Enhanced models with default settings and middleware
const enhancedDeepSeekModel = wrapLanguageModel({
  model: poeProvider.chatModel('deepseek-v3.2'),
  middleware: defaultSettingsMiddleware({
    settings: {
      temperature: 0.6,
      providerOptions: {
        poe: {
          thinking: {
            type: 'enabled'
          }
        }
      }
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

// Enhanced Claude Haiku 4.5 model with thinking support
const enhancedClaudeHaikuModel = wrapLanguageModel({
  model: poeProvider.chatModel('claude-haiku-4.5'),
  middleware: defaultSettingsMiddleware({
    settings: {
      temperature: 0.7,
      providerOptions: {
        poe: {
          extra_body: {
            thinking_budget: 16384
          }
        }
      }
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
    id: 'deepseek-v3.2',
    name: 'DeepSeek v3.2',
    description: 'DeepSeek v3.2 model via Poe API (with thinking)',
    provider: 'Poe',
    supportsTools: true,
    supportsThinking: true,
  },
  {
    id: 'claude-haiku-4.5',
    name: 'Claude Haiku 4.5',
    description: 'Claude Haiku 4.5 model via Poe API (with thinking)',
    provider: 'Poe',
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
    'deepseek-v3.2': enhancedDeepSeekModel,
    'claude-haiku-4.5': enhancedClaudeHaikuModel,

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
export function getProviderOptions(modelId: string, supportsThinking: boolean) {
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
      thinking: {
        type: supportsThinking ? 'enabled' : 'disabled'
      },
      // Enable thinking mode for DeepSeek v3.2 using the exact format from the API example
      ...(modelId === 'deepseek-v3.2' && {
        extra_body: {
          enable_thinking: false
        }
      })
    }
  };
}

// Get standard model options
export function getModelOptions() {
  return {
    temperature: 1,
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
  const providerOptions = getProviderOptions(modelId, supportsThinking);

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

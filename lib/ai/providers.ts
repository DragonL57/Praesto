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

const enhancedGpt5ChatModel = wrapLanguageModel({
  model: poeProvider.chatModel('gpt-5-chat'),
  middleware: defaultSettingsMiddleware({
    settings: {
      temperature: 0.7,
    }
  })
});

const enhancedZenoSonarReasoningModel = wrapLanguageModel({
  model: poeProvider.chatModel('zeno-sonar-reasoning'),
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

// Google Gemini models with thinking configuration
const gemini3ProModel = wrapLanguageModel({
  model: google('gemini-3-pro-preview'),
  middleware: defaultSettingsMiddleware({
    settings: {
      temperature: 1,
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingLevel: 'high', // Use 'high' for Gemini 3 Pro for maximum reasoning
            includeThoughts: true, // Enable thought summaries
          }
        }
      }
    }
  })
});

const gemini3FlashModel = wrapLanguageModel({
  model: google('gemini-3-flash-preview'),
  middleware: defaultSettingsMiddleware({
    settings: {
      temperature: 1,
      providerOptions: {
        google: {
          thinkingConfig: {
            thinkingLevel: 'high', // Use 'high' for Gemini 3 models for maximum reasoning
            includeThoughts: true, // Enable thought summaries
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
    id: 'grok-4.1-fast-reasoning',
    name: 'Grok-4.1',
    description: 'Grok-4.1 Fast Reasoning model via Poe API',
    provider: 'Poe',
    supportsTools: true,
    supportsThinking: true,
  },
  {
    id: 'gpt-5-chat',
    name: 'GPT-5 Chat',
    description: 'GPT-5 Chat model via Poe API - supports image reading and analysis',
    provider: 'Poe',
    supportsTools: true,
    supportsThinking: false,
  },
  {
    id: 'zeno-sonar-reasoning',
    name: 'Zeno Sonar Reasoning',
    description: 'Zeno Sonar Reasoning model via Poe API - advanced reasoning capabilities',
    provider: 'Poe',
    supportsTools: true,
    supportsThinking: true,
  },
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro Preview',
    description: 'Google Gemini 3 Pro - Most capable model with advanced reasoning',
    provider: 'Google',
    supportsTools: true,
    supportsThinking: true,
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash Preview',
    description: 'Google Gemini 3 Flash Preview - Pro-level intelligence at Flash speed',
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
    'gpt-5-chat': enhancedGpt5ChatModel,
    'zeno-sonar-reasoning': enhancedZenoSonarReasoningModel,

    // Google Gemini models with middleware
    'gemini-3-pro-preview': gemini3ProModel,
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
export function getProviderOptions(supportsThinking: boolean, modelId?: string, thinkingLevel?: string) {
  const baseOptions = {};

  // Gemini 3 models use thinkingLevel
  const isGemini3 = modelId?.includes('gemini-3');
  const isGemini3Flash = modelId?.includes('gemini-3-flash');

  // Validate thinking level based on model
  let validatedThinkingLevel = thinkingLevel || 'high';
  if (isGemini3Flash) {
    // Flash supports: minimal, low, medium, high
    if (!['minimal', 'low', 'medium', 'high'].includes(validatedThinkingLevel)) {
      validatedThinkingLevel = 'high';
    }
  } else if (isGemini3) {
    // Pro supports: low, high
    if (!['low', 'high'].includes(validatedThinkingLevel)) {
      validatedThinkingLevel = 'high';
    }
  }

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
      ...(supportsThinking && isGemini3 && {
        thinkingConfig: {
          thinkingLevel: validatedThinkingLevel as 'minimal' | 'low' | 'medium' | 'high',
          includeThoughts: true,
        }
      }),
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
  },
  thinkingLevel?: string
) {
  const { supportsTools, supportsThinking } = getModelConfiguration(modelId);
  const modelInstance = myProvider.languageModel(modelId);
  const modelOptions = getModelOptions();
  const providerOptions = getProviderOptions(supportsThinking, modelId, thinkingLevel);

  // Filter out tool parts with state 'input-available' before sending to model
  const filteredMessages = messages.map(msg => ({
    ...msg,
    parts: Array.isArray(msg.parts)
      ? msg.parts.filter(
        (part) =>
          !(
            part &&
            typeof part === 'object' &&
            'state' in part &&
            ((part as { state?: string }).state === 'input-available' || (part as { state?: string }).state === 'call')
          )
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

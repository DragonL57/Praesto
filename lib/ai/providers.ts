import 'server-only';
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
import { chatModels } from './models';
import { systemPrompt } from './prompts';
import { isProductionEnvironment } from '@/lib/constants';

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
export async function getAvailableTools() {
  const { getTools } = await import('./tools');
  return getTools();
}

// Get stream text configuration
export async function getStreamTextConfig(
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
    const tools = await getAvailableTools();
    return {
      ...baseConfig,
      ...tools,
    };
  }

  return baseConfig;
}

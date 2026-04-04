import 'server-only';
import OpenAI from 'openai';

// Import tools and utilities
import { chatModels } from './models';
import { systemPrompt } from './prompts';
// messages are OpenAI/Poe formatted message objects

// Poe API OpenAI-compatible provider client
export const openai = new OpenAI({
  apiKey: process.env.POE_API_KEY || '',
  baseURL: 'https://api.poe.com/v1',
});

// Model ID to Poe bot name mapping
const MODEL_BOT_MAP: Record<string, string> = {
  'chat-model': 'grok-4.1-fast-reasoning',
  'title-model': 'grok-4.1-fast-non-reasoning',
  'fast-model': 'grok-4.1-fast-non-reasoning',
};

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
    extraParams: currentModel?.extraParams,
  };
}

// Get standard model options
export function getModelOptions() {
  return {
    temperature: 1,
    max_tokens: 8192, // Use a more reasonable output limit for better stability
  };
}

// Get available tools for models that support them
export async function getAvailableTools() {
  const { getTools } = await import('./tools');
  return getTools();
}

/**
 * Get chat completion parameters for OpenAI client
 */
export async function getChatCompletionParams(
  modelId: string,
  messages: Record<string, unknown>[],
  userTimeContext?: {
    date: string;
    time: string;
    dayOfWeek: string;
    timeZone: string;
  },
  userMessage?: string,
) {
  const { supportsTools, extraParams } = getModelConfiguration(modelId);
  const modelOptions = getModelOptions();

  // Map modelId to actual Poe bot name
  const actualModel = MODEL_BOT_MAP[modelId] || modelId;

  // Base config with standard options
  const baseConfig: Record<string, unknown> = {
    model: actualModel,
    messages: [
      {
        role: 'system',
        content: systemPrompt({ userTimeContext, userMessage }),
      },
      ...messages,
    ],
    ...modelOptions,
    stream: true,
  };

  // Process extraParams: prioritize top-level known params, put others in extra_body
  if (extraParams) {
    const { max_tokens, temperature, ...otherParams } = extraParams as Record<
      string,
      unknown
    >;

    // Override top-level params if specified in extraParams
    if (max_tokens !== undefined) baseConfig.max_tokens = max_tokens;
    if (temperature !== undefined) baseConfig.temperature = temperature;

    // Add remaining parameters to extra_body (standard for Poe/OpenAI extensions)
    if (Object.keys(otherParams).length > 0) {
      baseConfig.extra_body = {
        ...otherParams,
      };
    }
  }

  // Use custom function calling tools for models that support them
  if (supportsTools) {
    const { tools } = await getAvailableTools();
    baseConfig.tools = Object.entries(tools).map(
      ([name, tool]: [string, unknown]) => ({
        type: 'function',
        function: {
          name,
          description: (tool as Record<string, unknown>)?.description,
          parameters: (tool as Record<string, unknown>)?.parameters,
        },
      }),
    );
  }

  return baseConfig;
}

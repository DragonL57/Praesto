import 'server-only';
import OpenAI from 'openai';

// Import tools and utilities
import { chatModels } from './models';
import { systemPrompt } from './prompts';

// Poe API OpenAI-compatible provider client
export const openai = new OpenAI({
  apiKey: process.env.POE_API_KEY || '',
  baseURL: 'https://api.poe.com/v1',
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

// Get standard model options
export function getModelOptions() {
  return {
    temperature: 1,
    max_tokens: 128000, // Set max context length to 128,000 tokens for all models
  };
}

// Get available tools for models that support them
export async function getAvailableTools() {
  const { getTools } = await import('./tools');
  return getTools();
}

/**
 * Get chat completion parameters for OpenAI client
 * This replaces getStreamTextConfig for Vercel AI SDK
 */
export async function getChatCompletionParams(
  modelId: string,
  messages: any[],
  userTimeContext?: {
    date: string;
    time: string;
    dayOfWeek: string;
    timeZone: string;
  },
  _thinkingLevel?: string,
) {
  const { supportsTools, supportsThinking } = getModelConfiguration(modelId);
  const modelOptions = getModelOptions();

  // Map modelId to actual Poe bot name if needed
  let actualModel = modelId;
  if (modelId === 'chat-model') actualModel = 'grok-4.1-fast-reasoning';
  if (modelId === 'title-model' || modelId === 'fast-model') actualModel = 'grok-4.1-fast-non-reasoning';

  const baseConfig: any = {
    model: actualModel,
    messages: [
      {
        role: 'system',
        content: systemPrompt({ selectedChatModel: actualModel, userTimeContext }),
      },
      ...messages,
    ],
    ...modelOptions,
    stream: true,
  };

  // Add Poe-specific extra_body parameters if needed
  if (supportsThinking) {
    baseConfig.extra_body = {
      thinking: 'enabled',
    };
  }

  // Use custom function calling tools for models that support them
  if (supportsTools) {
    const { tools } = await getAvailableTools();
    // Transform tools to OpenAI format if they are not already
    // (Assuming tools will be refactored to OpenAI format)
    baseConfig.tools = Object.entries(tools).map(([name, tool]: [string, any]) => ({
      type: 'function',
      function: {
        name,
        description: tool.description,
        parameters: tool.parameters, // Assuming these are JSON schemas
      },
    }));
  }

  return baseConfig;
}

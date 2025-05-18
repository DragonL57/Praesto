export interface ChatModel {
  id: string;
  name: string;
  description: string;
  provider?: string; // Optional: e.g., 'OpenAI', 'Anthropic', 'Fireworks', 'XAI'
  isDefault?: boolean; // Optional: to mark a default model
  // Add any other properties relevant to your models, e.g.:
  // contextWindow?: number;
  // strengths?: string[];
}

export const chatModels: ChatModel[] = [

  {
    id: 'chat-model',
    name: 'GPT-4.1',
    description: 'GPT-4.1 from OpenAI',
  },
  {
    id: 'chat-model-reasoning',
    name: 'Qwen3 235B',
    description: 'Qwen3 235B reasoning model from Fireworks',
  },
  {
    id: 'gemini-2.5-flash-preview-04-17',
    name: 'Gemini 2.5 Flash (Preview)',
    description: 'Gemini 2.5 Flash preview model from Google Generative AI',
    provider: 'Google',
  },
  // Add other models as needed from your application context
];

const defaultModel = chatModels.find(model => model.isDefault);
// Fallback logic for DEFAULT_CHAT_MODEL_ID:
// 1. Use the ID of the model marked as isDefault.
// 2. If no model is marked as default, use the ID of the first model in the array.
// 3. If the array is empty (should not happen with this static definition), use a placeholder ID.
export const DEFAULT_CHAT_MODEL_ID = defaultModel
  ? defaultModel.id
  : (chatModels.length > 0
    ? chatModels[0].id
    : 'chat-model'); // Ultimate fallback to a sensible default ID

import { customProvider } from 'ai';
import { openai } from '@ai-sdk/openai';
import { google, createGoogleGenerativeAI } from '@ai-sdk/google';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

// You can swap openai() for openai.chat(), openai.responses(), etc. per model as needed
export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        // test models from your mocks/stubs
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        // Use OpenAI production models
        // 'chat-model'
        'chat-model': openai.chat('gpt-4.1'),
        // 'chat-model-reasoning' - OAI "reasoning" models (adjust per your needs)
        'chat-model-reasoning': openai('o4-mini', { reasoningEffort: 'medium' }),
        // 'title-model': uses turbo for lightweight tasks
        'title-model': openai('gpt-4.1'),
        // 'artifact-model': could be creative or code-related
        'artifact-model': openai('gpt-4.1'),
        // Google Generative AI models
        'google-gemini-pro': google('gemini-2.5-pro-exp-03-25'),
        'google-gemini-flash': google('gemini-2.5-flash-preview-04-17'),
        'google-gemini-search': google('gemini-2.0-flash', { useSearchGrounding: true }),
      },
      imageModels: {
        // OpenAI's image API (DALL-E)
        'small-model': openai.image('dall-e-3'),
        // Google Generative AI image model
        'google-image': google('gemini-2.0-flash', { structuredOutputs: true })
      },
      embeddingModels: {
        // Google Generative AI embedding model
        'google-embedding': google.textEmbeddingModel('text-embedding-004')
      }
    });

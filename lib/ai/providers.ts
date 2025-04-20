import { customProvider } from 'ai';
import { openai } from '@ai-sdk/openai';
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
      },
      imageModels: {
        // OpenAI's image API (DALL-E)
        'small-model': openai.image('dall-e-3'),
      },
    });

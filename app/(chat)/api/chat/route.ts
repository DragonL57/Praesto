import {
  appendResponseMessages,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai';
import type { UIMessage } from 'ai';
// eslint-disable-next-line import/no-unresolved
import { auth } from '@/app/(auth)/auth';
// eslint-disable-next-line import/no-unresolved
import { systemPrompt } from '@/lib/ai/prompts';
// eslint-disable-next-line import/no-unresolved
import { deleteChatById, getChatById, saveChat, saveMessages, updateChatTimestamp } from '@/lib/db/queries';
// eslint-disable-next-line import/no-unresolved
import { generateUUID, getMostRecentUserMessage, getTrailingMessageId, } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
// eslint-disable-next-line import/no-unresolved
import { createDocument } from '@/lib/ai/tools/create-document';
// eslint-disable-next-line import/no-unresolved
import { updateDocument } from '@/lib/ai/tools/update-document';
// eslint-disable-next-line import/no-unresolved
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
// eslint-disable-next-line import/no-unresolved
import { getWeather } from '@/lib/ai/tools/get-weather';
// eslint-disable-next-line import/no-unresolved
import { webSearch } from '@/lib/ai/tools/web-search';
// eslint-disable-next-line import/no-unresolved
import { readWebsiteContent } from '@/lib/ai/tools/read-website-content';
// eslint-disable-next-line import/no-unresolved
import { getYoutubeTranscript } from '@/lib/ai/tools/get-youtube-transcript';
// eslint-disable-next-line import/no-unresolved
import { isProductionEnvironment } from '@/lib/constants';
// eslint-disable-next-line import/no-unresolved
import { myProvider } from '@/lib/ai/providers';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const {
      id,
      messages,
      selectedChatModel,
      userTimeContext,
    }: {
      id: string;
      messages: Array<UIMessage>;
      selectedChatModel: string;
      userTimeContext?: {
        date: string;
        time: string;
        dayOfWeek: string;
        timeZone: string;
      };
    } = await request.json();

    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userMessage = getMostRecentUserMessage(messages);

    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });

      await saveChat({ id, userId: session.user.id, title });
    } else {
      if (chat.userId !== session.user.id) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: userMessage.id,
          role: 'user',
          parts: userMessage.parts,
          attachments: userMessage.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });

    // Update the chat timestamp immediately when the user sends a message
    // This ensures the conversation moves to the top of the sidebar right away
    await updateChatTimestamp({ id });

    return createDataStreamResponse({
      execute: (dataStream) => {
        const isGemini25Model =
          selectedChatModel === 'google-gemini-pro' ||
          selectedChatModel === 'google-gemini-flash';

        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, userTimeContext }),
          messages,
          maxSteps: 5,
          providerOptions: isGemini25Model
            ? {
                google: {
                  thinkingConfig: {
                    thinkingBudget: 24576, // Maximum thinking budget
                  },
                },
              }
            : undefined,
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning'
              ? []
              : [
                  'getWeather',
                  'createDocument',
                  'updateDocument',
                  'requestSuggestions',
                  'webSearch',
                  'readWebsiteContent',
                  'getYoutubeTranscript',
                ],
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          tools: {
            getWeather,
            webSearch,
            readWebsiteContent,
            getYoutubeTranscript,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
          },
          onFinish: async ({ response }) => {
            if (session.user?.id) {
              try {
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === 'assistant',
                  ),
                });

                if (!assistantId) {
                  throw new Error('No assistant message found!');
                }

                const [, assistantMessage] = appendResponseMessages({
                  messages: [userMessage],
                  responseMessages: response.messages,
                });

                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId: id,
                      role: assistantMessage.role,
                      parts: assistantMessage.parts,
                      attachments:
                        assistantMessage.experimental_attachments ?? [],
                      createdAt: new Date(),
                    },
                  ],
                });

                // Update the chat timestamp to move it to the top of the sidebar
                await updateChatTimestamp({ id });
              } catch {
                console.error('Failed to save chat');
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: () => {
        return 'Oops, an error occurred!';
      },
    });
  } catch {
    return new Response('An error occurred while processing your request!', {
      status: 404,
    });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch {
    return new Response('An error occurred while processing your request!', {
      status: 500 });
  }
}

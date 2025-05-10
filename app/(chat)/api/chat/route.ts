import {
  appendResponseMessages,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from 'ai';
import type { UIMessage } from 'ai';
// eslint-disable-next-line import/no-unresolved
import { auth } from '@/app/auth';
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
import { think } from '@/lib/ai/tools/think';
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
      personaId,
      userTimeContext,
    }: {
      id: string;
      messages: Array<UIMessage>;
      selectedChatModel: string;
      personaId?: string;
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

    // Try to get the chat, handling possible race conditions with retries
    let chat = null;
    let retries = 0;
    const MAX_RETRIES = 3;

    while (retries < MAX_RETRIES) {
      try {
        chat = await getChatById({ id });

        if (!chat) {
          try {
            const title = await generateTitleFromUserMessage({
              message: userMessage,
            });

            chat = await saveChat({ id, userId: session.user.id, title });
            break;
          } catch (error) {
            if (error instanceof Error &&
              error.message.includes('duplicate key value violates unique constraint')) {
              // If it's a duplicate key error, another request likely created the chat first
              // Wait briefly and retry getting the chat
              await new Promise(resolve => setTimeout(resolve, 100));
              retries++;
              continue;
            }
            // For other errors, rethrow
            throw error;
          }
        } else {
          // Check authorization
          if (chat.userId !== session.user.id) {
            return new Response('Unauthorized', { status: 401 });
          }
          // Chat exists and user is authorized, break the loop
          break;
        }
      } catch (error) {
        // Handle any errors in getChatById
        console.error('[Chat creation error]', error);
        retries++;
        // If we've tried too many times, throw the error
        if (retries >= MAX_RETRIES) {
          throw error;
        }
        // Wait briefly before retrying
        await new Promise(resolve => setTimeout(resolve, 100 * retries));
      }
    }

    // Final check - get the chat one more time if needed
    if (!chat) {
      chat = await getChatById({ id });
      if (!chat) {
        return new Response('Failed to create or retrieve chat', { status: 500 });
      }
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
        const isFireworksQwenModel =
          selectedChatModel === 'accounts/fireworks/models/qwen3-235b-a22b';

        const isXaiGrokModel =
          selectedChatModel === 'xai-grok-3';

        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt({ selectedChatModel, personaId, userTimeContext }),
          messages,
          maxSteps: 10,
          providerOptions: isFireworksQwenModel
            ? {
              fireworks: {
                // Any Fireworks-specific options could go here in the future
              },
            }
            : isXaiGrokModel
              ? { /* No specific provider options needed for now */ }
              : undefined,
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning'
              ? []
              : [
                'think',
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
            think,
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
          onError: (error) => {
            console.error('[STREAMTEXT ERROR]', error);
            // Optionally, if you want to ensure the client also sees an error propagated
            // dataStream.closeWithError(error); 
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
              } catch (error) {
                console.error('Failed to save chat', error);
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
      onError: (error: unknown) => {
        console.error('[API CHAT STREAMING ERROR]', error instanceof Error ? error.message : error, error instanceof Error ? error.stack : undefined);
        if (error instanceof Error) {
          console.error('[API CHAT STREAMING ERROR] Name:', error.name);
          console.error('[API CHAT STREAMING ERROR] Message:', error.message);
          if (error.stack) {
            console.error('[API CHAT STREAMING ERROR] Stack:', error.stack);
          }
          if (error.cause) {
            console.error('[API CHAT STREAMING ERROR] Cause:', error.cause);
          }
        } else {
          console.error('[API CHAT STREAMING ERROR] (Unknown error type):', error);
        }
        return 'An error occurred during streaming. Please try again. (Details logged on server)';
      },
    });
  } catch (error) {
    console.error('[API CHAT ROUTE ERROR]', error);
    return new Response('An error occurred while processing your request. Please try again.', {
      status: 500,
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
      status: 500
    });
  }
}

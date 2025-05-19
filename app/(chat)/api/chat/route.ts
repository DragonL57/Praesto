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

// Imports for officeparser and file fetching
import { parseOfficeAsync } from 'officeparser';
import { Buffer } from 'buffer'; // Node.js Buffer
// Assuming Vercel Blob client might be needed for fetching private blobs,
// or a robust fetch for public URLs. For now, standard fetch.
// import { head } from '@vercel/blob'; // To check existence/metadata if needed

import { cookies } from 'next/headers';

// --- Configuration for Extracted Text Formatting ---
const ATTACHMENT_TEXT_HEADER_PREFIX = "\n\n--- Content from attachment:";
const ATTACHMENT_TEXT_FOOTER = "---\n--- End of attachment ---";
const ATTACHMENT_ERROR_NOTE_PREFIX = "\n\n--- System Note: An error occurred while trying to extract text content from attachment:";
const ATTACHMENT_ERROR_NOTE_SUFFIX = ". The file might be corrupted, password-protected, or in an unsupported format. ---";
// --- End of Configuration ---

export const maxDuration = 60;

// Define an interface for the expected 'data' object from the frontend
interface RequestData {
  useReasoning?: boolean;
}

export async function POST(request: Request) {
  try {
    // First, get the full JSON body
    const requestBody = await request.json();

    // Destructure known top-level properties
    const {
      id,
      messages,
      userTimeContext, // This will be our object containing useReasoning
    }: {
      id: string;
      messages: Array<UIMessage>;
      userTimeContext?: {
        date: string;
        time: string;
        dayOfWeek: string;
        timeZone: string;
      };
      data?: RequestData; // Make data optional and use the interface
    } = requestBody;

    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userMessage = getMostRecentUserMessage(messages);

    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    // Store a copy of the original user message parts for saving to DB
    const originalUserMessageParts = userMessage.parts.map(part => ({ ...part }));

    // --- TEXT EXTRACTION FROM ATTACHMENTS ---
    let combinedUserTextAndAttachments = '';

    // Get the original typed text from the user message parts
    const originalUserTypedText = userMessage.parts
      .filter(part => part.type === 'text')
      .map(part => (part as { type: 'text'; text: string }).text)
      .join('\n');

    combinedUserTextAndAttachments = originalUserTypedText;

    if (userMessage.experimental_attachments && userMessage.experimental_attachments.length > 0) {
      const imageAttachments = userMessage.experimental_attachments.filter(att => att.contentType?.startsWith('image/'));
      const documentAttachments = userMessage.experimental_attachments.filter(att => !att.contentType?.startsWith('image/'));

      console.log(`Processing attachments: ${imageAttachments.length} images, ${documentAttachments.length} documents`);

      for (const attachment of userMessage.experimental_attachments) {
        if (attachment.url) {
          // Skip text extraction for image files - modern AI models can process these directly
          if (attachment.contentType?.startsWith('image/')) {
            console.log(`Skipping text extraction for image: ${attachment.name || 'unknown image'} (${attachment.contentType})`);
            continue;
          }

          try {
            console.log(`Fetching attachment from URL: ${attachment.url}`);
            const response = await fetch(attachment.url);
            if (!response.ok) {
              throw new Error(`Failed to fetch file: ${response.statusText}`);
            }
            const fileArrayBuffer = await response.arrayBuffer();
            const fileBuffer = Buffer.from(fileArrayBuffer);

            console.log(`Parsing file: ${attachment.name || 'unknown file'} (${attachment.contentType})`);
            const extractedText = await parseOfficeAsync(fileBuffer);

            if (extractedText && extractedText.trim().length > 0) {
              combinedUserTextAndAttachments += `${ATTACHMENT_TEXT_HEADER_PREFIX} ${attachment.name || 'file'} ---\n${extractedText.trim()}${ATTACHMENT_TEXT_FOOTER}`;
              console.log(`Successfully extracted text from ${attachment.name || 'file'}. Length: ${extractedText.length}`);
            } else {
              // This case means parsing was successful, but no text content was found (e.g., an empty .txt file or a PDF with only images).
              console.log(`No text extracted or text was empty for ${attachment.name || 'file'} (parsing successful).`);
            }
          } catch (error) {
            console.error(`Error processing attachment ${attachment.name || attachment.url}:`, error);
            // Add a notification to the combined text ONLY when an actual parsing error occurs.
            combinedUserTextAndAttachments += `${ATTACHMENT_ERROR_NOTE_PREFIX} ${attachment.name || 'file'}${ATTACHMENT_ERROR_NOTE_SUFFIX}`;
          }
        }
      }
    }

    // Update userMessage.parts to contain a single text part with the combined content.
    // The attachments themselves are still part of userMessage.experimental_attachments for record-keeping or other UI purposes.
    if (combinedUserTextAndAttachments !== originalUserTypedText) { // Only update if text was actually added from attachments
      const nonTextParts = userMessage.parts.filter(part => part.type !== 'text');
      userMessage.parts = [
        ...nonTextParts,
        { type: 'text', text: combinedUserTextAndAttachments }
      ];
      console.log('User message parts updated: non-text parts preserved, text consolidated with attachments.');
      console.log('Final combined text for AI:', combinedUserTextAndAttachments);
    } else {
      // If no new text was added from attachments, userMessage.parts already contains the originalUserTypedText.
      // No change needed to userMessage.parts in this specific text-consolidation step.
      console.log('No new text from attachments. Original user message parts retained.');
    }
    // --- END OF TEXT EXTRACTION ---

    // Prepare messages for streamText:
    // 1. For the current userMessage, its .parts are already updated with combined text (if attachments were processed).
    // 2. For user messages, preserve image attachments but remove non-image attachments
    // 
    // Mixed-attachment case handled as follows:
    // - Image attachments: Preserved in experimental_attachments field for direct model viewing
    // - Document attachments: Their extracted text is included in the message text part
    //   with appropriate headers/footers, while the original attachments are filtered out
    //   to avoid redundancy (since their content is already in the message text)
    const messagesForStreamText = messages.map(msg => {
      let processedMsg = { ...msg }; // Start with a shallow copy

      // If it's a user message, handle attachments appropriately
      if (processedMsg.role === 'user' && msg.experimental_attachments) {
        // Filter to keep only image attachments
        const imageAttachments = msg.experimental_attachments.filter(
          attachment => attachment.contentType?.startsWith('image/')
        );

        // If there are image attachments, keep them; otherwise set to undefined
        processedMsg = {
          ...processedMsg,
          experimental_attachments: imageAttachments.length > 0 ? imageAttachments : undefined,
        };
      } else if (processedMsg.role === 'user') {
        // If user message but no attachments, ensure experimental_attachments is undefined
        processedMsg = {
          ...processedMsg,
          experimental_attachments: undefined,
        };
      }

      // If this specific message is the most recent user message we just processed,
      // ensure its parts are the ones we potentially modified with extracted text.
      if (msg.id === userMessage.id) {
        processedMsg.parts = userMessage.parts;
      }

      return processedMsg;
    });

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
          parts: originalUserMessageParts, // Use the original parts for saving
          attachments: userMessage.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });

    // Update the chat timestamp immediately when the user sends a message
    // This ensures the conversation moves to the top of the sidebar right away
    await updateChatTimestamp({ id });

    return createDataStreamResponse({
      execute: async (dataStream) => {
        // Use the model selected by the user (from the chat-model cookie), fallback to 'chat-model'
        const cookieStore = await cookies();
        const cookieModel = cookieStore.get('chat-model')?.value;
        const finalSelectedChatModel = cookieModel || 'chat-model';

        const finalModelMessages = messagesForStreamText.map(msg => ({
          ...msg,
          parts: [...msg.parts],
          experimental_attachments: msg.experimental_attachments ? [...msg.experimental_attachments] : undefined
        }));

        // Prepare model options for the selected model
        const modelOptions = {
          maxTokens: 8192,
          temperature: 1,
        };
        const modelInstance = myProvider.languageModel(finalSelectedChatModel);

        const result = streamText({
          model: modelInstance,
          system: systemPrompt({ selectedChatModel: finalSelectedChatModel, userTimeContext }),
          messages: finalModelMessages,
          maxSteps: 10,
          ...modelOptions,
          providerOptions: {
            openai: {
              maxTokens: 8192
            }
          },
          experimental_activeTools: [
            'think',
            'getWeather',
            'createDocument',
            'updateDocument',
            'requestSuggestions',
            'webSearch',
            'readWebsiteContent',
            'getYoutubeTranscript',
          ],
          experimental_transform: smoothStream({ chunking: 'line' }),
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

        // Log information about image attachments being sent to the model
        const finalImageAttachmentsForLogging = finalModelMessages
          .filter(msg => msg.role === 'user' && msg.experimental_attachments?.length)
          .flatMap(msg => msg.experimental_attachments || [])
          .filter(attachment => attachment.contentType?.startsWith('image/'));

        if (finalImageAttachmentsForLogging.length > 0) {
          console.log(`Sending ${finalImageAttachmentsForLogging.length} image attachments to the final model (${finalSelectedChatModel}):`,
            finalImageAttachmentsForLogging.map(img => `${img.name} (${img.contentType})`));
        }

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
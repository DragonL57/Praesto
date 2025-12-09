
import { Buffer } from 'node:buffer'; // Node.js Buffer
import { cookies } from 'next/headers';
import { parseOfficeAsync } from 'officeparser';

import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  smoothStream,
  stepCountIs,
  streamText,
  type FileUIPart,
  type UIMessage,
  type UIMessageStreamWriter,
} from 'ai';

import { auth } from '@/app/auth';
import { deleteChatById, getChatById, saveChat, saveMessages, updateChatTimestamp } from '@/lib/db/queries';
import { generateUUID, getMostRecentUserMessage } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { readWebsiteContent } from '@/lib/ai/tools/read-website-content';
import { systemPrompt } from '@/lib/ai/prompts';
import { webSearch } from '@/lib/ai/tools/web-search';
import { chatModels } from '@/lib/ai/models';

// Helper types for file parts
type FileAttachment = {
  url: string;
  name?: string;
  contentType?: string;
  mediaType?: string;
};

// Extract file parts from message parts (AI SDK 5.x approach)
function getFilePartsFromMessage(message: UIMessage): FileAttachment[] {
  return message.parts
    .filter((part): part is FileUIPart => part.type === 'file')
    .map(part => ({
      url: part.url,
      name: (part as FileUIPart & { name?: string }).name,
      contentType: part.mediaType,
      mediaType: part.mediaType,
    }));
}

// --- Configuration for Extracted Text Formatting ---
const ATTACHMENT_TEXT_HEADER_PREFIX = "\n\n--- Content from attachment:";
const ATTACHMENT_TEXT_FOOTER = "---\n--- End of attachment ---";
const ATTACHMENT_ERROR_NOTE_PREFIX = "\n\n--- System Note: An error occurred while trying to extract text content from attachment:";
const ATTACHMENT_ERROR_NOTE_SUFFIX = ". The file might be corrupted, password-protected, or in an unsupported format. ---";
const ATTACHMENT_TEXT_TRUNCATED_SUFFIX = " [Content truncated as it exceeded 100,000 characters]";
const MAX_EXTRACTED_TEXT_CHARS = 100000; // Maximum number of characters for extracted text
// --- End of Configuration ---

export const maxDuration = 300;

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

    // AI SDK 5.x: Use file parts from message.parts instead of experimental_attachments
    const fileParts = getFilePartsFromMessage(userMessage);
    if (fileParts.length > 0) {
      const imageAttachments = fileParts.filter(att => att.contentType?.startsWith('image/') || att.mediaType?.startsWith('image/'));
      const documentAttachments = fileParts.filter(att => !att.contentType?.startsWith('image/') && !att.mediaType?.startsWith('image/'));

      console.log(`Processing attachments: ${imageAttachments.length} images, ${documentAttachments.length} documents`);

      for (const attachment of fileParts) {
        if (attachment.url) {
          // Skip text extraction for image files - modern AI models can process these directly
          const isImage = attachment.contentType?.startsWith('image/') || attachment.mediaType?.startsWith('image/');
          if (isImage) {
            console.log(`Skipping text extraction for image: ${attachment.name || 'unknown image'} (${attachment.contentType || attachment.mediaType})`);
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

            console.log(`Parsing file: ${attachment.name || 'unknown file'} (${attachment.contentType || attachment.mediaType})`);
            const extractedText = await parseOfficeAsync(fileBuffer);

            if (extractedText && extractedText.trim().length > 0) {
              // Limit extracted text to MAX_EXTRACTED_TEXT_CHARS characters
              let finalText = extractedText.trim();
              let truncationNote = '';

              if (finalText.length > MAX_EXTRACTED_TEXT_CHARS) {
                finalText = finalText.substring(0, MAX_EXTRACTED_TEXT_CHARS);
                truncationNote = ATTACHMENT_TEXT_TRUNCATED_SUFFIX;
                console.log(`Text from ${attachment.name || 'file'} was truncated from ${extractedText.length} to ${MAX_EXTRACTED_TEXT_CHARS} characters.`);
              }

              combinedUserTextAndAttachments += `${ATTACHMENT_TEXT_HEADER_PREFIX} ${attachment.name || 'file'} ---\n${finalText}${truncationNote}${ATTACHMENT_TEXT_FOOTER}`;
              console.log(`Successfully extracted text from ${attachment.name || 'file'}. Length: ${finalText.length}${truncationNote ? ' (truncated)' : ''}`);
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
    // 2. AI SDK 5.x uses parts array for both text and files
    // 
    // Mixed-attachment case handled as follows:
    // - Image attachments: Preserved as file parts in message.parts for direct model viewing
    // - Document attachments: Their extracted text is included in the message text part
    //   with appropriate headers/footers, while preserving image file parts
    const messagesForStreamText = messages.map(msg => {
      const processedMsg = { ...msg }; // Start with a shallow copy

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

    // AI SDK 5.x: Attachments are now stored as file parts within message.parts
    await saveMessages({
      messages: [
        {
          chatId: id,
          id: userMessage.id,
          role: 'user',
          parts: originalUserMessageParts, // Use the original parts for saving (includes file parts)
          attachments: [], // Legacy field - attachments are now in parts as file type
          createdAt: new Date(),
        },
      ],
    });

    // Update the chat timestamp immediately when the user sends a message
    // This ensures the conversation moves to the top of the sidebar right away
    await updateChatTimestamp({ id });

    // Use the model selected by the user (from the chat-model cookie), fallback to 'chat-model'
    const cookieStore = await cookies();
    const cookieModel = cookieStore.get('chat-model')?.value;
    const finalSelectedChatModel = cookieModel || 'chat-model';

    // Get model configuration to check tool support
    const currentModel = chatModels.find(model => model.id === finalSelectedChatModel) ||
                         chatModels.find(model => model.id === 'chat-model') ||
                         chatModels[0];
    const supportsTools = currentModel?.supportsTools ?? true;
    const supportsThinking = currentModel?.supportsThinking ?? true;

    // AI SDK 5.x: Messages already use parts array, no need for experimental_attachments
    const finalModelMessages = messagesForStreamText.map(msg => ({
      ...msg,
      parts: [...msg.parts],
    }));

    // Prepare model options for the selected model
    // GLM-4.6 supports up to 128K output tokens
    const modelOptions = {
      maxTokens: 128000,
      temperature: 1,
    };
    const modelInstance = myProvider.languageModel(finalSelectedChatModel);

    // Log information about image file parts being sent to the model
    const finalImagePartsForLogging = finalModelMessages
      .filter(msg => msg.role === 'user')
      .flatMap(msg => msg.parts.filter((part): part is FileUIPart => part.type === 'file' && (part.mediaType?.startsWith('image/') ?? false)));

    if (finalImagePartsForLogging.length > 0) {
      console.log(`Sending ${finalImagePartsForLogging.length} image file parts to the final model (${finalSelectedChatModel}):`,
        finalImagePartsForLogging.map(img => `${img.mediaType}`));
    }

    // AI SDK 5.x: Create the UI message stream with execute callback
    const stream = createUIMessageStream({
      execute: async ({ writer }: { writer: UIMessageStreamWriter }) => {
        const result = streamText({
          model: modelInstance,
          system: systemPrompt({ selectedChatModel: finalSelectedChatModel, userTimeContext }),
          messages: convertToModelMessages(finalModelMessages),
          stopWhen: stepCountIs(10),
          ...modelOptions,

          providerOptions: {
            openai: {
              maxTokens: 128000
            },
            'z-ai': {
              thinking: {
                type: supportsThinking ? 'enabled' : 'disabled'
              },
              maxTokens: 128000
            },
            poe: {
              thinking: {
                type: supportsThinking ? 'enabled' : 'disabled'
              },
              maxTokens: 128000,
              // Enable thinking mode for DeepSeek v3.2 using the exact format from the API example
              ...(finalSelectedChatModel === 'deepseek-v3.2' && {
                extra_body: {
                  enable_thinking: true
                }
              })
            }
          },

          experimental_transform: smoothStream({ chunking: 'line' }),

          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },

          // Only add tools if the model supports them
          ...(supportsTools && {
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
          }),
        });

        // AI SDK 5.x: Merge the result stream into the UI message stream
        writer.merge(result.toUIMessageStream({
          sendReasoning: true,
        }));

        // Wait for the stream to finish before saving messages
        const response = await result.response;

        if (session.user?.id) {
          try {
            // AI SDK 5.x: Response messages are AssistantModelMessage[], need to extract ID differently
            const assistantMessages = response.messages.filter(
              (message) => message.role === 'assistant'
            );

            if (assistantMessages.length === 0) {
              throw new Error('No assistant message found!');
            }

            // Get the last assistant message and generate an ID for it
            const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
            const assistantId = generateUUID();

            // AI SDK 5.x: AssistantContent can be string or array, convert to UIMessage parts format
            const content = lastAssistantMessage.content;
            const contentArray = typeof content === 'string'
              ? [{ type: 'text' as const, text: content }]
              : content;

            const uiParts = contentArray.map((part: { type: string; text?: string; toolCallId?: string; toolName?: string; args?: unknown }) => {
              if (part.type === 'text') {
                return { type: 'text' as const, text: part.text || '' };
              }
              if (part.type === 'tool-call') {
                return {
                  type: 'tool-invocation' as const,
                  toolInvocationId: part.toolCallId,
                  toolName: part.toolName,
                  args: part.args,
                  state: 'result' as const,
                };
              }
              return part;
            });

            await saveMessages({
              messages: [
                {
                  id: assistantId,
                  chatId: id,
                  role: 'assistant' as const,
                  parts: uiParts,
                  attachments: [], // Legacy field - attachments are now in parts
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
      generateId: generateUUID,
    });

    // Return the stream as a response
    return createUIMessageStreamResponse({ stream });
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
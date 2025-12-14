
import { Buffer } from 'node:buffer'; // Node.js Buffer
import { cookies } from 'next/headers';
import { parseOfficeAsync } from 'officeparser';

import {
  createUIMessageStreamResponse,
  streamText,
  type FileUIPart,
  type TextUIPart,
  type UIMessage,
} from 'ai';

import { auth } from '@/app/auth';
import { deleteChatById, getChatById, saveChat, saveMessages, updateChatTimestamp } from '@/lib/db/queries';
import { generateUUID, getMostRecentUserMessage } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { getStreamTextConfig } from '@/lib/ai/providers';

// Define file attachment interface for internal use
interface FileAttachment {
  url: string;
  name?: string;
  contentType?: string;
  mediaType?: string;
}

// Type definitions for tool calls and results
interface ToolCall {
  toolName: string;
  toolCallId: string;
  args?: Record<string, unknown>;
}

interface ToolResult {
  toolName: string;
  toolCallId: string;
  result?: unknown;
}


// Extract file parts from message parts (AI SDK 5.x approach)
function getFilePartsFromMessage(message: UIMessage) {
  return message.parts
    .filter((part): part is FileUIPart => part.type === 'file')
    .map((part: FileUIPart): FileAttachment => ({
      url: part.url ?? '',
      name: part.filename,
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
      .filter((part): part is TextUIPart => part.type === 'text')
      .map(part => part.text)
      .join('\n');

    combinedUserTextAndAttachments = originalUserTypedText;

    // AI SDK 5.x: Use file parts from message.parts instead of experimental_attachments
    const fileParts = getFilePartsFromMessage(userMessage);
    if (fileParts.length > 0) {
      const imageAttachments = fileParts.filter((att: FileAttachment) => att.contentType?.startsWith('image/') || att.mediaType?.startsWith('image/'));
      const documentAttachments = fileParts.filter((att: FileAttachment) => !att.contentType?.startsWith('image/') && !att.mediaType?.startsWith('image/'));

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
        { type: 'text', text: combinedUserTextAndAttachments } as TextUIPart
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

    
    // AI SDK 5.x: Messages already use parts array, no need for experimental_attachments
    const finalModelMessages = messagesForStreamText.map(msg => ({
      ...msg,
      parts: [...msg.parts],
    }));

    // Log information about image file parts being sent to the model
    const finalImagePartsForLogging = finalModelMessages
      .filter(msg => msg.role === 'user')
      .flatMap(msg => msg.parts.filter((part): part is FileUIPart => part.type === 'file' && (part.mediaType?.startsWith('image/') ?? false)));

    if (finalImagePartsForLogging.length > 0) {
      console.log(`Sending ${finalImagePartsForLogging.length} image file parts to the final model (${finalSelectedChatModel}):`,
        finalImagePartsForLogging.map(img => `${img.mediaType}`));
    }

    // AI SDK 5.x: Direct approach - use streamText with custom onFinish to capture and save
    const streamTextConfig = getStreamTextConfig(finalSelectedChatModel, finalModelMessages, userTimeContext);

    // Generate a unique ID for the assistant message before streaming starts
    const assistantId = generateUUID();

    const result = streamText({
      ...streamTextConfig,
      onFinish: async ({ text, toolCalls, toolResults }) => {
        // When streaming completes, we have access to all the data we need
        if (session.user?.id) {
          try {
            // Build the complete parts array including text, reasoning, and tool results
            const uiParts: Array<UIMessage['parts'][number]> = [];

            // Process the complete response text to extract thinking and clean content
            if (text) {
              // Parse Poe API thinking format (lines starting with >)
              const lines = text.split('\n');
              const thinkingLines: string[] = [];
              const nonThinkingLines: string[] = [];
              let inThinkingBlock = false;

              for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('>')) {
                  // This is a thinking line
                  inThinkingBlock = true;
                  // Remove the > prefix and any following space
                  const thinkingContent = trimmedLine.substring(1).trim();
                  if (thinkingContent) {
                    thinkingLines.push(thinkingContent);
                  }
                } else if (!(inThinkingBlock && trimmedLine === '')) {
                  // Non-thinking line or meaningful line, end of thinking block
                  inThinkingBlock = false;
                  nonThinkingLines.push(line);
                }
              }

              // Add reasoning part if we found thinking content
              if (thinkingLines.length > 0) {
                const thinkingContent = thinkingLines.join('\n').trim();
                if (thinkingContent) {
                  uiParts.push({
                    type: 'reasoning',
                    text: thinkingContent,
                  });
                }
              }

              // Add cleaned text content if present
              const cleanText = nonThinkingLines.join('\n').trim();
              if (cleanText) {
                uiParts.push({ type: 'text', text: cleanText });
              }
            }

            // Add tool calls and results
            if (toolCalls && toolCalls.length > 0) {
              toolCalls.forEach(toolCall => {
                // Add the tool call part for the tool invocation
                uiParts.push({
                  type: `tool-${toolCall.toolName}`,
                  toolCallId: toolCall.toolCallId,
                  input: (toolCall as ToolCall).args || toolCall,
                  state: 'input-available' as const,
                });
              });
            }

            // Add tool results
            if (toolResults && toolResults.length > 0) {
              toolResults.forEach(toolResult => {
                uiParts.push({
                  type: `tool-${toolResult.toolName}`,
                  toolCallId: toolResult.toolCallId,
                  input: {}, // Input is required for output-available state, but we might not have it
                  state: 'output-available' as const,
                  output: (toolResult as ToolResult).result || toolResult,
                });
              });
            }

            // Save the complete message with all parts
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
          } catch (error) {
            console.error('Failed to save chat:', error);
          }
        }
      }
    });

    // Create UI message stream with reasoning enabled and proper error handling
    try {
      const stream = result.toUIMessageStream({
        sendReasoning: true,
      });

      // Return the stream as a response
      return createUIMessageStreamResponse({ stream });
    } catch (error) {
      console.error('[API CHAT ROUTE ERROR]', error);
      return new Response('An error occurred while processing your request. Please try again.', {
        status: 500,
      });
    }
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

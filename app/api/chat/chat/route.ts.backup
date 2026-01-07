// Type for a step in the result.steps array
interface Step {
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  // Add other properties as needed
}

// Type for reasoning array elements
type ReasoningItem = string | { text: string };

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
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
  updateChatTimestamp,
} from '@/lib/db/queries';
import { generateUUID, getMostRecentUserMessage } from '@/lib/utils';
import { generateTitleFromUserMessage } from '@/lib/actions/chat';
import { getStreamTextConfig } from '@/lib/ai/providers';
import { getCalendarTools } from '@/lib/ai/calendar-tools';

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
    .map(
      (part: FileUIPart): FileAttachment => ({
        url: part.url ?? '',
        name: part.filename,
        contentType: part.mediaType,
        mediaType: part.mediaType,
      }),
    );
}

// --- Configuration for Extracted Text Formatting ---
const ATTACHMENT_TEXT_HEADER_PREFIX = '\n\n--- Content from attachment:';
const ATTACHMENT_TEXT_FOOTER = '---\n--- End of attachment ---';
const ATTACHMENT_ERROR_NOTE_PREFIX =
  '\n\n--- System Note: An error occurred while trying to extract text content from attachment:';
const ATTACHMENT_ERROR_NOTE_SUFFIX =
  '. The file might be corrupted, password-protected, or in an unsupported format. ---';
const ATTACHMENT_TEXT_TRUNCATED_SUFFIX =
  ' [Content truncated as it exceeded 100,000 characters]';
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

    // Debug: Log the user message structure as received
    console.log(
      'User message received:',
      JSON.stringify(
        {
          id: userMessage.id,
          role: userMessage.role,
          parts: userMessage.parts.map((p) => ({
            type: p.type,
            ...(p.type === 'text'
              ? { textLength: (p as TextUIPart).text.length }
              : {}),
            ...(p.type === 'file'
              ? {
                url: (p as FileUIPart).url,
                filename: (p as FileUIPart).filename,
                mediaType: (p as FileUIPart).mediaType,
              }
              : {}),
          })),
        },
        null,
        2,
      ),
    );

    // Store a copy of the original user message parts for saving to DB
    const originalUserMessageParts = userMessage.parts.map((part) => ({
      ...part,
    }));

    // --- TEXT EXTRACTION FROM ATTACHMENTS ---
    let combinedUserTextAndAttachments = '';

    // Get the original typed text from the user message parts
    const originalUserTypedText = userMessage.parts
      .filter((part): part is TextUIPart => part.type === 'text')
      .map((part) => part.text)
      .join('\n');

    combinedUserTextAndAttachments = originalUserTypedText;

    // Use the model selected by the user (from the chat-model cookie), fallback to 'chat-model'
    const cookieStore = await cookies();
    const cookieModel = cookieStore.get('chat-model')?.value;
    const finalSelectedChatModel = cookieModel || 'chat-model';

    // AI SDK 5.x: Use file parts from message.parts instead of experimental_attachments
    const fileParts = getFilePartsFromMessage(userMessage);
    if (fileParts.length > 0) {
      const imageAttachments = fileParts.filter(
        (att: FileAttachment) =>
          att.contentType?.startsWith('image/') ||
          att.mediaType?.startsWith('image/'),
      );
      const pdfAttachments = fileParts.filter(
        (att: FileAttachment) =>
          att.contentType === 'application/pdf' ||
          att.mediaType === 'application/pdf',
      );
      const documentAttachments = fileParts.filter(
        (att: FileAttachment) =>
          !att.contentType?.startsWith('image/') &&
          !att.mediaType?.startsWith('image/') &&
          att.contentType !== 'application/pdf' &&
          att.mediaType !== 'application/pdf',
      );

      console.log(
        `Processing attachments: ${imageAttachments.length} images, ${pdfAttachments.length} PDFs, ${documentAttachments.length} documents`,
      );

      for (const attachment of fileParts) {
        if (attachment.url) {
          // Skip text extraction for image files - modern AI models can process these directly
          const isImage =
            attachment.contentType?.startsWith('image/') ||
            attachment.mediaType?.startsWith('image/');
          if (isImage) {
            console.log(
              `Skipping text extraction for image: ${attachment.name || 'unknown image'} (${attachment.contentType || attachment.mediaType})`,
            );
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

            console.log(
              `Parsing file: ${attachment.name || 'unknown file'} (${attachment.contentType || attachment.mediaType})`,
            );
            const extractedText = await parseOfficeAsync(fileBuffer);

            if (extractedText && extractedText.trim().length > 0) {
              // Limit extracted text to MAX_EXTRACTED_TEXT_CHARS characters
              let finalText = extractedText.trim();
              let truncationNote = '';

              if (finalText.length > MAX_EXTRACTED_TEXT_CHARS) {
                finalText = finalText.substring(0, MAX_EXTRACTED_TEXT_CHARS);
                truncationNote = ATTACHMENT_TEXT_TRUNCATED_SUFFIX;
                console.log(
                  `Text from ${attachment.name || 'file'} was truncated from ${extractedText.length} to ${MAX_EXTRACTED_TEXT_CHARS} characters.`,
                );
              }

              combinedUserTextAndAttachments += `${ATTACHMENT_TEXT_HEADER_PREFIX} ${attachment.name || 'file'} ---\n${finalText}${truncationNote}${ATTACHMENT_TEXT_FOOTER}`;
              console.log(
                `Successfully extracted text from ${attachment.name || 'file'}. Length: ${finalText.length}${truncationNote ? ' (truncated)' : ''}`,
              );
            } else {
              // This case means parsing was successful, but no text content was found (e.g., an empty .txt file or a PDF with only images).
              console.log(
                `No text extracted or text was empty for ${attachment.name || 'file'} (parsing successful).`,
              );
            }
          } catch (error) {
            console.error(
              `Error processing attachment ${attachment.name || attachment.url}:`,
              error,
            );
            // Add a notification to the combined text ONLY when an actual parsing error occurs.
            combinedUserTextAndAttachments += `${ATTACHMENT_ERROR_NOTE_PREFIX} ${attachment.name || 'file'}${ATTACHMENT_ERROR_NOTE_SUFFIX}`;
          }
        }
      }
    }

    // Update userMessage.parts to contain a single text part with the combined content.
    // The attachments themselves are still part of userMessage.experimental_attachments for record-keeping or other UI purposes.
    if (combinedUserTextAndAttachments !== originalUserTypedText) {
      // Only update if text was actually added from attachments
      const nonTextParts = userMessage.parts.filter(
        (part) => part.type !== 'text',
      );
      userMessage.parts = [
        ...nonTextParts,
        { type: 'text', text: combinedUserTextAndAttachments } as TextUIPart,
      ];
      console.log(
        'User message parts updated: non-text parts preserved, text consolidated with attachments.',
      );
      console.log(
        'Final combined text for AI:',
        combinedUserTextAndAttachments,
      );
    } else {
      // If no new text was added from attachments, userMessage.parts already contains the originalUserTypedText.
      // No change needed to userMessage.parts in this specific text-consolidation step.
      console.log(
        'No new text from attachments. Original user message parts retained.',
      );
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
    const messagesForStreamText = messages.map((msg) => {
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

    // Prepare final messages for the model
    const finalModelMessages = messagesForStreamText.map((msg) => ({
      ...msg,
      parts: msg.parts.map((part) => ({ ...part })),
    }));

    // Log information about image file parts being sent to the model
    const finalImagePartsForLogging = finalModelMessages
      .filter((msg) => msg.role === 'user')
      .flatMap((msg) =>
        msg.parts.filter(
          (part): part is FileUIPart =>
            part.type === 'file' &&
            (part.mediaType?.startsWith('image/') ?? false),
        ),
      );

    if (finalImagePartsForLogging.length > 0) {
      console.log(
        `Sending ${finalImagePartsForLogging.length} image file parts to the final model (${finalSelectedChatModel}):`,
        finalImagePartsForLogging.map((img) => ({
          mediaType: img.mediaType,
          url: img.url,
          filename: img.filename,
        })),
      );
    }

    // Debug: Log the complete message structure before conversion
    console.log(
      'Messages before streamText:',
      JSON.stringify(
        finalModelMessages.map((m) => ({
          role: m.role,
          parts: m.parts.map((p) => ({
            type: p.type,
            ...(p.type === 'file'
              ? {
                url: (p as FileUIPart).url,
                mediaType: (p as FileUIPart).mediaType,
              }
              : {}),
          })),
        })),
        null,
        2,
      ),
    );

    // AI SDK 5.x: Direct approach - use streamText with custom onFinish to capture and save
    const streamTextConfig = getStreamTextConfig(
      finalSelectedChatModel,
      finalModelMessages,
      userTimeContext,
    );

    // Add calendar tools (server-only, loaded dynamically)
    const calendarTools = await getCalendarTools();

    // Merge calendar tools if the config supports tools
    let configWithCalendar = streamTextConfig;
    if ('tools' in streamTextConfig && streamTextConfig.tools) {
      const toolsConfig = streamTextConfig as typeof streamTextConfig & {
        experimental_activeTools?: readonly string[];
        tools: Record<string, unknown>;
      };

      configWithCalendar = {
        ...streamTextConfig,
        experimental_activeTools: [
          ...(toolsConfig.experimental_activeTools || []),
          ...calendarTools.experimental_activeTools,
        ] as readonly string[],
        tools: {
          ...toolsConfig.tools,
          ...calendarTools.tools,
        },
      } as typeof streamTextConfig;
    }

    const assistantId = generateUUID();

    const result = streamText({
      ...configWithCalendar,
      // Debug: Log every step as it finishes
      onStepFinish: ({ text, toolCalls, toolResults, finishReason, usage }) => {
        console.log('[AI TOOL DEBUG] Step finished');
        console.log(
          '[AI TOOL DEBUG] toolCalls:',
          JSON.stringify(toolCalls, null, 2),
        );
        console.log(
          '[AI TOOL DEBUG] toolResults:',
          JSON.stringify(toolResults, null, 2),
        );
        console.log('[AI TOOL DEBUG] text:', text);
        console.log('[AI TOOL DEBUG] finishReason:', finishReason);
        console.log('[AI TOOL DEBUG] usage:', usage);
      },
      onFinish: async ({ text, reasoning }) => {
        // When streaming completes, we have access to all the data we need
        if (session.user?.id) {
          try {
            // DEBUG: Log the entire result object after streaming
            console.log(
              '[AI TOOL DEBUG] result object after streaming:',
              JSON.stringify(result, null, 2),
            );

            // --- Aggregate toolCalls/toolResults from all steps for robust persistence ---
            const allSteps: Step[] = Array.isArray(result?.steps)
              ? result.steps
              : [];
            let allToolCalls: ToolCall[] = [];
            let allToolResults: ToolResult[] = [];

            // Fallback: If steps is missing/empty, extract from result.response.messages (POE/OpenAI format)
            if (!allSteps || allSteps.length === 0) {
              const response = result?.response
                ? await result.response
                : undefined;
              const messages = response?.messages || [];
              for (const msg of messages) {
                if (msg.role === 'assistant' && Array.isArray(msg.content)) {
                  for (const part of msg.content) {
                    if (part.type === 'tool-call') {
                      // POE format: input property is the tool call args
                      allToolCalls.push({
                        toolName: part.toolName,
                        toolCallId: part.toolCallId,
                        args:
                          part.input && typeof part.input === 'object'
                            ? (part.input as Record<string, unknown>)
                            : {},
                      });
                    }
                  }
                }
                if (msg.role === 'tool' && Array.isArray(msg.content)) {
                  for (const part of msg.content) {
                    if (part.type === 'tool-result') {
                      // POE format: output property is { type: 'json', value: ... } or just the value
                      let resultValue: unknown;
                      if (
                        part.output &&
                        typeof part.output === 'object' &&
                        'value' in part.output
                      ) {
                        resultValue = part.output.value;
                      } else if (part.output !== undefined) {
                        resultValue = part.output;
                      }
                      allToolResults.push({
                        toolName: part.toolName,
                        toolCallId: part.toolCallId,
                        result: resultValue,
                      });
                    }
                  }
                }
              }
            } else {
              allToolCalls = allSteps.flatMap((step) => step?.toolCalls || []);
              allToolResults = allSteps.flatMap(
                (step) => step?.toolResults || [],
              );
            }

            // DEBUG: Log allToolCalls and allToolResults before building uiParts
            console.log(
              '[AI TOOL DEBUG] allToolCalls:',
              JSON.stringify(allToolCalls, null, 2),
            );
            console.log(
              '[AI TOOL DEBUG] allToolResults:',
              JSON.stringify(allToolResults, null, 2),
            );

            const uiParts: Array<UIMessage['parts'][number]> = [];

            // 1. Reasoning/thought signature (if any)
            if (reasoning) {
              const reasoningText = Array.isArray(reasoning)
                ? reasoning
                  .map((r: ReasoningItem) =>
                    typeof r === 'string' ? r : r.text,
                  )
                  .join('\n')
                : typeof reasoning === 'string'
                  ? reasoning
                  : '';
              if (reasoningText) {
                uiParts.push({ type: 'reasoning', text: reasoningText });
              }
            }

            // 2. Tool call(s) (input-available) from all steps
            allToolCalls.forEach((toolCall: ToolCall) => {
              uiParts.push({
                type: `tool-${toolCall.toolName}`,
                toolCallId: toolCall.toolCallId,
                state: 'input-available',
                input: toolCall.args || {},
              });
            });

            // 3. Tool result(s) (output-available) from all steps
            allToolResults.forEach((toolResult: ToolResult) => {
              const matchingCall = allToolCalls.find(
                (tc) => tc.toolCallId === toolResult.toolCallId,
              );
              uiParts.push({
                type: `tool-${toolResult.toolName}`,
                toolCallId: toolResult.toolCallId,
                state: 'output-available',
                input: matchingCall?.args || {},
                output: toolResult.result ?? {},
              });
            });

            // 4. If there was a tool call but no tool result, create a fallback tool result part with the text as output
            if (allToolCalls.length > 0 && allToolResults.length === 0) {
              allToolCalls.forEach((tc: ToolCall) => {
                uiParts.push({
                  type: `tool-${tc.toolName}`,
                  toolCallId: tc.toolCallId,
                  state: 'output-available',
                  input: tc.args || {},
                  output: text ? { text } : {},
                });
              });
            }

            // 5. Text (summary/response)
            if (text) {
              // Remove "**Thinking...**" header if present
              const processedText = text.replace(
                /^\*\*Thinking\.{3,}\*\*\s*\n*/i,
                '',
              );
              const lines = processedText.split('\n');
              const thinkingLines: string[] = [];
              const nonThinkingLines: string[] = [];
              let inThinkingBlock = false;
              for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('>')) {
                  inThinkingBlock = true;
                  const thinkingContent = trimmedLine.substring(1).trim();
                  if (thinkingContent) thinkingLines.push(thinkingContent);
                } else if (
                  trimmedLine.startsWith('*') &&
                  trimmedLine.endsWith('*') &&
                  (trimmedLine.toLowerCase().includes('thinking') ||
                    inThinkingBlock)
                ) {
                  inThinkingBlock = true;
                  const thinkingContent = trimmedLine
                    .substring(1, trimmedLine.length - 1)
                    .trim();
                  if (thinkingContent) thinkingLines.push(thinkingContent);
                } else if (!(inThinkingBlock && trimmedLine === '')) {
                  if (
                    !trimmedLine.startsWith('*') &&
                    !trimmedLine.startsWith('>')
                  )
                    inThinkingBlock = false;
                  if (!inThinkingBlock || trimmedLine !== '')
                    nonThinkingLines.push(line);
                }
              }
              // Add reasoning part if we found thinking content (and no reasoning part already added)
              if (thinkingLines.length > 0 && !reasoning) {
                const thinkingContent = thinkingLines.join('\n').trim();
                if (thinkingContent) {
                  uiParts.push({ type: 'reasoning', text: thinkingContent });
                }
              }
              // Add cleaned text content if present
              const cleanText = nonThinkingLines.join('\n').trim();
              if (cleanText) {
                uiParts.push({ type: 'text', text: cleanText });
              }
            }

            // DEBUG: Log the full uiParts array before saving
            console.log(
              '[AI TOOL DEBUG] FINAL uiParts to save:',
              JSON.stringify(uiParts, null, 2),
            );

            // Log the full uiParts array before saving
            console.log(
              '[AI TOOL DEBUG] About to save assistant message parts:',
              JSON.stringify(uiParts, null, 2),
            );
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
      },
    });

    // Create UI message stream with reasoning enabled and proper error handling
    try {
      // Debug: Log all steps after streamText finishes
      if (result?.steps) {
        console.log(
          '[AI TOOL DEBUG] All steps:',
          JSON.stringify(result.steps, null, 2),
        );
      }

      const stream = result.toUIMessageStream({
        sendReasoning: true,
      });

      // ...existing code...
      let accumulatedText = '';
      let hasSeenContent = false;

      const transformedStream = stream.pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            // ...existing code...
            if (chunk && typeof chunk === 'object' && 'type' in chunk) {
              if (
                chunk.type === 'text-delta' &&
                'textDelta' in chunk &&
                typeof chunk.textDelta === 'string'
              ) {
                const delta = chunk.textDelta;
                if (
                  delta.includes('**Thinking') ||
                  delta.includes('Thinking...') ||
                  delta.trim().startsWith('>') ||
                  (!hasSeenContent && delta.trim() === '')
                ) {
                  return;
                }
                accumulatedText += delta;
                if (
                  delta.includes('#') ||
                  delta.includes('##') ||
                  accumulatedText.length > 50
                ) {
                  hasSeenContent = true;
                }
                if (!hasSeenContent) {
                  return;
                }
                let cleanedDelta = delta;
                cleanedDelta = cleanedDelta.replace(
                  /\*\*Thinking\.{3,}\*\*/gi,
                  '',
                );
                cleanedDelta = cleanedDelta.replace(/Thinking\.{3,}/gi, '');
                const lines = cleanedDelta.split('\n');
                const filteredLines = lines.filter(
                  (line) => !line.trim().startsWith('>'),
                );
                cleanedDelta = filteredLines.join('\n');
                if (cleanedDelta.trim()) {
                  controller.enqueue({ ...chunk, textDelta: cleanedDelta });
                }
              } else {
                controller.enqueue(chunk);
              }
            } else {
              controller.enqueue(chunk);
            }
          },
          flush(_controller) {
            accumulatedText = '';
            hasSeenContent = false;
          },
        }),
      );

      return createUIMessageStreamResponse({ stream: transformedStream });
    } catch (error) {
      console.error('[API CHAT ROUTE ERROR]', error);
      return new Response(
        'An error occurred while processing your request. Please try again.',
        {
          status: 500,
        },
      );
    }
  } catch (error) {
    console.error('[API CHAT ROUTE ERROR]', error);
    return new Response(
      'An error occurred while processing your request. Please try again.',
      {
        status: 500,
      },
    );
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
      status: 500,
    });
  }
}

import { cookies } from 'next/headers';
import { auth } from '@/app/auth';
import {
  getChatById,
  getChatsByUserId,
  updateChatTitleById,
  deleteChatById,
  saveMessages,
  updateChatTimestamp,
  saveChat,
} from '@/lib/db/queries';
import { getMostRecentUserMessage, generateUUID } from '@/lib/utils';
import { openai, getChatCompletionParams, getAvailableTools } from '@/lib/ai/providers';
import {
  processMessageAttachments,
  updateMessageWithProcessedText,
} from '@/lib/ai/chat/attachments';
import { generateTitleFromUserMessage } from '@/lib/actions/chat';

import type { UIMessage } from 'ai';
import type { UserTimeContext } from '@/lib/ai/chat/types';

export const maxDuration = 300;

/**
 * Helper to convert UI messages to OpenAI format
 */
function convertToOpenAIMessages(messages: UIMessage[]): any[] {
  return messages.map((m) => {
    // In UI messages, content is often empty and text is in parts
    const content = m.parts
      ? m.parts
          .filter((part) => part.type === 'text')
          .map((part) => (part as { text: string }).text)
          .join('\n')
      : (m as any).content || '';

    return {
      role: m.role,
      content,
    };
  });
}

/**
 * Manually format data for the AI SDK Data Stream Protocol (v1)
 * 0: text delta
 * 9: tool call
 * a: tool result
 * e: error
 * d: metadata/data
 */
function formatStreamPart(type: 'text' | 'tool-call' | 'tool-result' | 'error' | 'data', data: any): string {
  const prefixMap = {
    'text': '0',
    'tool-call': '9',
    'tool-result': 'a',
    'error': 'e',
    'data': '2', // Custom data is usually 2 or d depending on version
  };
  
  const prefix = prefixMap[type];
  return `${prefix}:${JSON.stringify(data)}\n`;
}

export async function POST(request: Request) {
  try {
    const requestBody = await request.json();
    const { id, messages, userTimeContext }: {
      id: string;
      messages: Array<UIMessage>;
      userTimeContext?: UserTimeContext;
    } = requestBody;

    const session = await auth();
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userMessage = getMostRecentUserMessage(messages);
    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    // Store original parts for database persistence
    const originalUserMessageParts = JSON.parse(JSON.stringify(userMessage.parts));
    const originalUserTypedText = userMessage.parts
      .filter((part) => part.type === 'text')
      .map((part) => (part as { text: string }).text)
      .join('\n');

    // Process attachments and extract text
    const combinedText = await processMessageAttachments(userMessage);
    updateMessageWithProcessedText(userMessage, combinedText, originalUserTypedText);

    // Get selected model from cookie
    const cookieStore = await cookies();
    const cookieModel = cookieStore.get('chat-model')?.value || 'chat-model';

    // Handle chat persistence (create or verify chat)
    const chat = await getChatById({ id });
    const userId = session.user.id;
    if (!chat) {
      const title = await generateTitleFromUserMessage({ message: userMessage });
      await saveChat({ id, userId, title });
    } else if (chat.userId !== userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Save user message
    await saveMessages({
      messages: [{
        chatId: id,
        id: userMessage.id,
        role: 'user',
        parts: originalUserMessageParts,
        attachments: [],
        createdAt: new Date(),
      }],
    });
    await updateChatTimestamp({ id });

    // Prepare messages for OpenAI
    const openAIMessages = convertToOpenAIMessages(messages);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const { tools: availableTools } = await getAvailableTools();
        const assistantId = generateUUID();
        let fullContent = '';
        const toolResults: any[] = [];

        async function runCompletion(msgs: any[]) {
          const params = await getChatCompletionParams(cookieModel, msgs, userTimeContext);
          const responseStream = await openai.chat.completions.create(params as any);

          const toolCalls: any[] = [];

          // Use for await on the stream
          for await (const chunk of (responseStream as any)) {
            const delta = chunk.choices[0]?.delta;
            if (!delta) continue;

            // Handle text content
            if (delta.content) {
              fullContent += delta.content;
              controller.enqueue(encoder.encode(formatStreamPart('text', delta.content)));
            }

            // Handle tool calls
            if (delta.tool_calls) {
              for (const toolCallDelta of delta.tool_calls) {
                if (toolCallDelta.index !== undefined) {
                  if (!toolCalls[toolCallDelta.index]) {
                    toolCalls[toolCallDelta.index] = {
                      id: toolCallDelta.id,
                      type: 'function',
                      function: { name: '', arguments: '' },
                    };
                  }
                  
                  const tc = toolCalls[toolCallDelta.index];
                  if (toolCallDelta.id) tc.id = toolCallDelta.id;
                  if (toolCallDelta.function?.name) tc.function.name += toolCallDelta.function.name;
                  if (toolCallDelta.function?.arguments) tc.function.arguments += toolCallDelta.function.arguments;
                }
              }
            }
          }

          // Execute tool calls if any
          if (toolCalls.length > 0) {
            const filteredToolCalls = toolCalls.filter(Boolean);
            const toolMessages = [...msgs, { role: 'assistant', tool_calls: filteredToolCalls }];
            
            for (const tc of filteredToolCalls) {
              const toolName = tc.function.name;
              const toolArgsString = tc.function.arguments || '{}';
              let toolArgs = {};
              try {
                toolArgs = JSON.parse(toolArgsString);
              } catch (e) {
                console.error('Failed to parse tool arguments:', toolArgsString);
              }
              
              // Write tool-call to stream for UI
              controller.enqueue(encoder.encode(formatStreamPart('tool-call', {
                toolCallId: tc.id,
                toolName,
                args: toolArgs,
              })));

              const tool = (availableTools as any)[toolName];
              if (tool) {
                try {
                  const result = await tool.execute(toolArgs);
                  toolResults.push({ toolCallId: tc.id, toolName, result, args: toolArgs });
                  
                  // Write tool-result to stream for UI
                  controller.enqueue(encoder.encode(formatStreamPart('tool-result', {
                    toolCallId: tc.id,
                    toolName,
                    result,
                  })));

                  toolMessages.push({
                    role: 'tool',
                    tool_call_id: tc.id,
                    content: JSON.stringify(result),
                  });
                } catch (error) {
                  console.error(`Error executing tool ${toolName}:`, error);
                  toolMessages.push({
                    role: 'tool',
                    tool_call_id: tc.id,
                    content: JSON.stringify({ error: 'Failed to execute tool' }),
                  });
                }
              }
            }
            
            // Recurse for continuation after tool results
            await runCompletion(toolMessages);
          }
        }

        try {
          await runCompletion(openAIMessages);

          // Finalize and save assistant message to DB
          const uiParts: any[] = [];
          if (fullContent) uiParts.push({ type: 'text', text: fullContent });
          
          for (const tr of toolResults) {
            uiParts.push({
              type: `tool-${tr.toolName}`,
              toolCallId: tr.toolCallId,
              state: 'output-available',
              input: tr.args,
              output: tr.result,
            });
          }

          await saveMessages({
            messages: [{
              id: assistantId,
              chatId: id,
              role: 'assistant',
              parts: uiParts,
              attachments: [],
              createdAt: new Date(),
            }],
          });
          await updateChatTimestamp({ id });
        } catch (error) {
          console.error('[Stream error]', error);
          controller.enqueue(encoder.encode(formatStreamPart('error', 'An error occurred during streaming')));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'x-vercel-ai-data-stream': 'v1',
      },
    });
  } catch (error) {
    console.error('[API CHAT ROUTE ERROR]', error);
    return new Response('An error occurred', { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, title }: { id: string; title: string } = await request.json();
    const session = await auth();
    if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

    const chat = await getChatById({ id });
    if (!chat || chat.userId !== session.user.id) return new Response('Unauthorized', { status: 401 });

    await updateChatTitleById({ chatId: id, title });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (_error) {
    return new Response('Error', { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  try {
    if (!id) {
      const { chats: userChats } = await getChatsByUserId({
        id: session.user.id,
        limit: 1000,
        startingAfter: null,
        endingBefore: null,
      });
      await Promise.all(userChats.map((chat) => deleteChatById({ id: chat.id })));
    } else {
      const chat = await getChatById({ id });
      if (!chat || chat.userId !== session.user.id) return new Response('Unauthorized', { status: 401 });
      await deleteChatById({ id });
    }
    return new Response('Deleted', { status: 200 });
  } catch (_error) {
    return new Response('Error', { status: 500 });
  }
}

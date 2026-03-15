import { cookies } from 'next/headers';
import { auth } from '@/app/auth';
import {
  getChatById,
  updateChatTitleById,
  deleteChatById,
  saveMessages,
  updateChatTimestamp,
  saveChat,
  getChatsByUserId,
} from '@/lib/db/queries';
import { getMostRecentUserMessage, generateUUID } from '@/lib/utils';
import { openai, getChatCompletionParams, getAvailableTools } from '@/lib/ai/providers';
import {
  processMessageAttachments,
  updateMessageWithProcessedText,
} from '@/lib/ai/chat/attachments';
import { generateTitleFromUserMessage } from '@/lib/actions/chat';

import type { Message, MessagePart } from '@/lib/ai/types';
import type { UserTimeContext } from '@/lib/ai/chat/types';

export const maxDuration = 300;

/**
 * Helper to convert UI messages to OpenAI format
 */
function convertToOpenAIMessages(messages: Message[]): any[] {
  const result: any[] = [];

  for (const m of messages) {
    if (m.role === 'user' || m.role === 'system') {
      const content = m.parts
        ? m.parts
            .filter((part) => part.type === 'text')
            .map((part) => (part as { text: string }).text)
            .join('\n')
        : (m as any).content || '';
      
      result.push({ role: m.role, content: content || '' });
    } 
    else if (m.role === 'assistant') {
      const textParts = m.parts?.filter((p) => p.type === 'text') || [];
      const content = textParts.map((p: any) => p.text).join('\n').trim();

      const toolCallParts = m.parts?.filter(p => p.type === 'tool-call') || [];
      
      if (toolCallParts.length > 0) {
        result.push({
          role: 'assistant',
          content: content || null, // MUST be null if tool_calls is present
          tool_calls: toolCallParts.map((p: any) => ({
            id: p.toolCallId,
            type: 'function',
            function: {
              name: p.toolName,
              arguments: typeof p.args === 'string' ? p.args : JSON.stringify(p.args || {}),
            },
          })),
        });
      } else {
        result.push({ role: 'assistant', content: content || '' });
      }
    } 
    else if (m.role === 'tool') {
      const toolResultPart = m.parts.find(p => p.type === 'tool-result');
      if (toolResultPart && 'toolCallId' in toolResultPart) {
        const toolResult = (toolResultPart as any).result;
        result.push({
          role: 'tool',
          tool_call_id: (toolResultPart as any).toolCallId,
          content: typeof toolResult === 'string' 
            ? toolResult 
            : JSON.stringify(toolResult ?? {}),
        });
      }
    }
  }

  return result;
}

/**
 * Manually format data for the Praesto Data Stream Protocol
 */
function formatStreamPart(type: 'text' | 'reasoning' | 'tool-call' | 'tool-result' | 'error', data: any): string {
  const prefixMap = {
    'text': '0',
    'reasoning': 'h',
    'tool-call': '9',
    'tool-result': 'a',
    'error': 'e',
  };
  
  const prefix = prefixMap[type];
  return `${prefix}:${JSON.stringify(data)}\n`;
}

export async function POST(request: Request) {
  try {
    const requestBody = await request.json();
    const { id, messages, userTimeContext }: {
      id: string;
      messages: Array<Message>;
      userTimeContext?: UserTimeContext;
    } = requestBody;

    const session = await auth();
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userMessage = getMostRecentUserMessage(messages as any);
    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    const originalUserMessageParts = JSON.parse(JSON.stringify(userMessage.parts));
    const originalUserTypedText = userMessage.parts
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join('\n');

    const combinedText = await processMessageAttachments(userMessage as any);
    updateMessageWithProcessedText(userMessage as any, combinedText, originalUserTypedText);

    const cookieStore = await cookies();
    const cookieModel = cookieStore.get('chat-model')?.value || 'chat-model';

    const chat = await getChatById({ id });
    const userId = session.user.id;
    if (!chat) {
      const title = await generateTitleFromUserMessage({ message: userMessage as any });
      await saveChat({ id, userId, title });
    } else if (chat.userId !== userId) {
      return new Response('Unauthorized', { status: 401 });
    }

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

    const openAIMessages = convertToOpenAIMessages(messages);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const { tools: availableTools } = await getAvailableTools();
        const assistantId = generateUUID();
        let fullContent = '';
        let fullReasoning = '';
        const allToolResultsForDB: any[] = [];
        const allToolCallsForDB: any[] = [];

        async function runCompletion(msgs: any[], retryCount = 0) {
          try {
            const params = await getChatCompletionParams(cookieModel, msgs, userTimeContext);
            
            // Note: parallel_tool_calls is omitted for Poe compatibility
            
            const responseStream = await openai.chat.completions.create(params as any);
            const toolCalls: any[] = [];

            try {
              for await (const chunk of (responseStream as any)) {
                const delta = chunk.choices[0]?.delta;
                if (!delta) continue;

                if (delta.content) {
                  fullContent += delta.content;
                  controller.enqueue(encoder.encode(formatStreamPart('text', delta.content)));
                }

                const reasoning = (delta as any).reasoning_content || (delta as any).thinking;
                if (reasoning) {
                  fullReasoning += reasoning;
                  controller.enqueue(encoder.encode(formatStreamPart('reasoning', reasoning)));
                }

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
            } catch (streamError: any) {
              console.error(`[Upstream Stream Error] (Attempt ${retryCount + 1}):`, streamError);
              if (retryCount < 1 && !fullContent && toolCalls.length === 0) {
                return runCompletion(msgs, retryCount + 1);
              }
              throw streamError;
            }

            if (toolCalls.length > 0) {
              const filteredToolCalls = toolCalls.filter(Boolean);
              
              for (const tc of filteredToolCalls) {
                allToolCallsForDB.push({
                  id: tc.id,
                  name: tc.function.name,
                  args: JSON.parse(tc.function.arguments || '{}')
                });
              }

              const toolMessages = [...msgs, { 
                role: 'assistant', 
                content: null,
                tool_calls: filteredToolCalls 
              }];
              
              for (const tc of filteredToolCalls) {
                const toolName = tc.function.name;
                const toolArgsString = tc.function.arguments || '{}';
                let toolArgs = {};
                try {
                  toolArgs = JSON.parse(toolArgsString);
                } catch {
                  console.error('Failed to parse tool arguments:', toolArgsString);
                }
                
                controller.enqueue(encoder.encode(formatStreamPart('tool-call', {
                  toolCallId: tc.id,
                  toolName,
                  args: toolArgs,
                })));

                const tool = (availableTools as any)[toolName];
                if (tool) {
                  try {
                    const result = await tool.execute(toolArgs);
                    allToolResultsForDB.push({ toolCallId: tc.id, toolName, result, args: toolArgs });
                    
                    controller.enqueue(encoder.encode(formatStreamPart('tool-result', {
                      toolCallId: tc.id,
                      toolName,
                      result,
                    })));

                    toolMessages.push({
                      role: 'tool',
                      tool_call_id: tc.id,
                      content: typeof result === 'string' ? result : JSON.stringify(result),
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
              
              await runCompletion(toolMessages);
            }
          } catch (error: any) {
            console.error(`[Completion Error] (Attempt ${retryCount + 1}):`, error);
            if (retryCount < 2 && (error.type === 'internal_error' || error.status === 500)) {
              const delay = Math.pow(2, retryCount) * 1000;
              await new Promise(resolve => setTimeout(resolve, delay));
              return runCompletion(msgs, retryCount + 1);
            }
            throw error;
          }
        }

        try {
          await runCompletion(openAIMessages);

          const uiParts: MessagePart[] = [];
          if (fullReasoning) uiParts.push({ type: 'reasoning', text: fullReasoning });
          if (fullContent) uiParts.push({ type: 'text', text: fullContent });
          
          for (const tc of allToolCallsForDB) {
            uiParts.push({
              type: 'tool-call',
              toolCallId: tc.id,
              toolName: tc.name,
              args: tc.args,
              state: 'input-available'
            } as any);
          }

          for (const tr of allToolResultsForDB) {
            uiParts.push({
              type: 'tool-result',
              toolCallId: tr.toolCallId,
              toolName: tr.toolName,
              result: tr.result,
              args: tr.args,
              state: 'output-available'
            } as any);
          }

          await saveMessages({
            messages: [{
              id: assistantId,
              chatId: id,
              role: 'assistant',
              parts: uiParts as any,
              attachments: [],
              createdAt: new Date(),
            }],
          });
          await updateChatTimestamp({ id });
        } catch (error: any) {
          console.error('[Stream error final catch]', error);
          controller.enqueue(encoder.encode(formatStreamPart('error', error.message || 'An error occurred during streaming')));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
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

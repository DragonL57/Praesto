import 'server-only';
import { generateUUID } from '@/lib/utils';
import { openai, getChatCompletionParams, getAvailableTools } from '@/lib/ai/providers';
import { 
  getChatById, 
  saveChat, 
  saveMessages, 
  updateChatTimestamp,
  getMessageById,
  deleteMessagesByChatIdAfterTimestamp
} from '@/lib/db/queries';
import { generateTitleFromUserMessage } from '@/lib/actions/chat';
import { processMessageAttachments, updateMessageWithProcessedText } from './attachments';
import { StreamProtocol } from './stream-protocol';
import type { Message, MessagePart } from '@/lib/ai/types';
import type { UserTimeContext } from './types';

/**
 * Orchestrates the entire chat process: message processing, completion, and streaming.
 */
export async function handleChatRequest({
  id,
  userId,
  messages,
  userTimeContext,
  modelId,
  controller,
}: {
  id: string;
  userId: string;
  messages: Message[];
  userTimeContext?: UserTimeContext;
  modelId: string;
  controller: ReadableStreamDefaultController;
}) {
  const send = (type: any, data: any) => controller.enqueue(StreamProtocol.encode(type, data));

  try {
    // 1. Process attachments and update the latest user message
    const userMessage = messages[messages.length - 1];
    if (!userMessage || userMessage.role !== 'user') {
      throw new Error('No user message found to process');
    }

    const originalParts = JSON.parse(JSON.stringify(userMessage.parts));
    const originalTypedText = userMessage.parts
      .filter((part: any) => part.type === 'text')
      .map((part: any) => part.text)
      .join('\n');

    const combinedText = await processMessageAttachments(userMessage as any);
    updateMessageWithProcessedText(userMessage as any, combinedText, originalTypedText);

    // 2. Manage Chat initialization and title generation
    const chat = await getChatById({ id });
    if (!chat) {
      const title = await generateTitleFromUserMessage({ message: userMessage as any });
      await saveChat({ id, userId, title });
      // Send title metadata to frontend immediately so UI can update
      send('metadata', { title });
    } else if (chat.userId !== userId) {
      throw new Error('Unauthorized access to chat');
    }

    // 2.1 Handle Retry logic: if message exists, delete it and everything after it
    const [existingMessage] = await getMessageById({ id: userMessage.id });
    if (existingMessage) {
      console.log(`[ChatService] Retry detected for message ${userMessage.id}. Cleaning up trailing history.`);
      await deleteMessagesByChatIdAfterTimestamp({
        chatId: existingMessage.chatId,
        timestamp: existingMessage.createdAt,
      });
    }

    // 3. Save User Message to Database
    await saveMessages({
      messages: [{
        chatId: id,
        id: userMessage.id,
        role: 'user',
        parts: originalParts,
        attachments: [],
        createdAt: new Date(),
      }],
    });
    await updateChatTimestamp({ id });

    // 4. Run AI Completion loop
    const assistantId = generateUUID();
    let finalFullContent = '';
    let finalFullReasoning = '';
    const allToolCallsForUI: any[] = [];
    const allToolResultsForUI: any[] = [];
    const { tools: availableTools } = await getAvailableTools();

    // Inner recursive function to handle potential tool-call loops
    const runCompletion = async (currentMsgs: any[], retryCount = 0): Promise<void> => {
      let stepContent = '';
      let stepReasoning = '';
      const stepToolCalls: any[] = [];

      try {
        const params = await getChatCompletionParams(modelId, currentMsgs, userTimeContext);
        
        // Execute completion with Poe API (OpenAI-compatible)
        const responseStream = await openai.chat.completions.create(params as any);

        for await (const chunk of (responseStream as any)) {
          const delta = chunk.choices[0]?.delta;
          if (!delta) continue;

          // Handle text content
          if (delta.content) {
            stepContent += delta.content;
            finalFullContent += delta.content;
            send('text', delta.content);
          }

          // Handle reasoning/thinking
          const reasoning = (delta as any).reasoning_content || (delta as any).thinking;
          if (reasoning) {
            stepReasoning += reasoning;
            finalFullReasoning += reasoning;
            send('reasoning', reasoning);
          }

          // Accumulate tool calls
          if (delta.tool_calls) {
            for (const tcDelta of delta.tool_calls) {
              if (tcDelta.index === undefined) continue;
              
              if (!stepToolCalls[tcDelta.index]) {
                stepToolCalls[tcDelta.index] = { 
                  id: tcDelta.id, 
                  type: 'function', 
                  function: { name: '', arguments: '' } 
                };
              }
              
              const tc = stepToolCalls[tcDelta.index];
              if (tcDelta.id) tc.id = tcDelta.id;
              if (tcDelta.function?.name) tc.function.name += tcDelta.function.name;
              if (tcDelta.function?.arguments) tc.function.arguments += tcDelta.function.arguments;
            }
          }
        }

        // Process accumulated tool calls
        const filteredToolCalls = stepToolCalls.filter(Boolean);
        if (filteredToolCalls.length > 0) {
          // Build history for the next step
          const toolMessages = [...currentMsgs, { 
            role: 'assistant', 
            content: stepContent || null, 
            reasoning_content: stepReasoning || undefined,
            tool_calls: filteredToolCalls 
          }];

          for (const tc of filteredToolCalls) {
            const toolName = tc.function.name;
            const toolArgsString = tc.function.arguments || '{}';
            let toolArgs = {};
            try { 
              toolArgs = JSON.parse(toolArgsString); 
            } catch {
              console.error('[ChatService] Failed to parse tool arguments:', toolArgsString);
            }
            
            // Add to UI tracking
            allToolCallsForUI.push({ id: tc.id, name: toolName, args: toolArgs });
            send('tool-call', { toolCallId: tc.id, toolName, args: toolArgs });

            const tool = (availableTools as any)[toolName];
            if (tool) {
              try {
                const result = await tool.execute(toolArgs);
                allToolResultsForUI.push({ toolCallId: tc.id, toolName, result, args: toolArgs });
                
                send('tool-result', { toolCallId: tc.id, toolName, result });

                toolMessages.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  content: typeof result === 'string' ? result : JSON.stringify(result),
                });
              } catch (toolError) {
                const errorMessage = toolError instanceof Error ? toolError.message : String(toolError);
                console.error(`[ChatService] Error executing tool ${toolName}:`, toolError);

                const errorResult = { error: 'Failed to execute tool', details: errorMessage };
                allToolResultsForUI.push({ toolCallId: tc.id, toolName, result: errorResult, args: toolArgs });

                send('tool-result', { toolCallId: tc.id, toolName, result: errorResult });

                toolMessages.push({
                  role: 'tool',
                  tool_call_id: tc.id,
                  content: JSON.stringify(errorResult),
                });
              }            }
          }
          
          // Recursive call for follow-up response after tool execution
          await runCompletion(toolMessages);
        }
      } catch (error: any) {
        console.error(`[Completion Error] (Attempt ${retryCount + 1}):`, error);
        
        // Robust retry for upstream errors
        const isRetryable = error.type === 'internal_error' || error.status === 500 || error.status === 429;
        if (retryCount < 2 && isRetryable) {
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Reset step progress for this attempt
          // Note: In a real stream we'd need to tell the UI we're retrying if content was already sent,
          // but for now we just try to continue.
          return runCompletion(currentMsgs, retryCount + 1);
        }
        throw error;
      }
    };

    // Convert UI messages to the internal OpenAI format
    const openAIMessages = convertToOpenAIMessages(messages);
    await runCompletion(openAIMessages);

    // 5. Construct and Save Assistant Message with all parts
    const uiParts: MessagePart[] = [];
    if (finalFullReasoning) uiParts.push({ type: 'reasoning', text: finalFullReasoning });
    if (finalFullContent) uiParts.push({ type: 'text', text: finalFullContent });
    
    // Map tool calls for UI persistence
    allToolCallsForUI.forEach(tc => {
      uiParts.push({
        type: 'tool-call',
        toolCallId: tc.id,
        toolName: tc.name,
        args: tc.args,
        state: 'input-available'
      } as any);
    });

    // Map tool results for UI persistence
    allToolResultsForUI.forEach(tr => {
      uiParts.push({
        type: 'tool-result',
        toolCallId: tr.toolCallId,
        toolName: tr.toolName,
        result: tr.result,
        args: tr.args,
        state: 'output-available'
      } as any);
    });

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

  } catch (error: any) {
    console.error('[ChatService Final Catch]', error);
    send('error', error.message || 'An error occurred during completion');
  } finally {
    controller.close();
  }
}

/**
 * Helper to convert UI messages to the format expected by OpenAI/Poe API
 */
export function convertToOpenAIMessages(messages: Message[]): any[] {
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

      const reasoningParts = m.parts?.filter((p) => p.type === 'reasoning') || [];
      const reasoning = reasoningParts.map((p: any) => p.text).join('\n').trim();

      // Get reasoning from raw property if parts are missing (for internal recursion)
      const finalReasoning = reasoning || (m as any).reasoning_content || (m as any).thinking;

      const toolCallParts = m.parts?.filter(p => p.type === 'tool-call') || [];
      
      const assistantMsg: any = {
        role: 'assistant',
        content: content || null,
      };

      if (finalReasoning) {
        // Use reasoning_content (standard) or thinking (Poe/some vendors)
        assistantMsg.reasoning_content = finalReasoning;
      }

      if (toolCallParts.length > 0) {
        assistantMsg.tool_calls = toolCallParts.map((p: any) => ({
          id: p.toolCallId,
          type: 'function',
          function: {
            name: p.toolName,
            arguments: typeof p.args === 'string' ? p.args : JSON.stringify(p.args || {}),
          },
        }));
      }

      result.push(assistantMsg);
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

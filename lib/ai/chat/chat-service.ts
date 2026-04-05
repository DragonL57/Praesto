import 'server-only';
import { generateUUID } from '@/lib/utils';
import { getAvailableTools } from '@/lib/ai/providers';
import {
  COUNCIL_AGENTS,
  COUNCIL_SYNTHESIZER_PROMPT,
} from '@/lib/ai/council-prompts';
import { runCouncilDebate } from './council-service';
import {
  getChatById,
  saveChat,
  saveMessages,
  updateChatTimestamp,
  getMessageById,
  deleteMessagesByChatIdAfterTimestamp,
} from '@/lib/db/queries';
import { generateTitleFromUserMessage } from '@/lib/actions/chat';
import {
  processMessageAttachments,
  updateMessageWithProcessedText,
} from './attachments';
import { StreamProtocol } from './stream-protocol';
import type { StreamPartType } from './stream-protocol';
import type { Message, MessagePart } from '@/lib/ai/types';
import type { UserTimeContext } from './types';
import { convertToOpenAIMessages } from './message-converter';
import { createUITracker } from './ui-tracker';
import { createCompletionLoop } from './completion-loop';

export async function handleChatRequest({
  id,
  userId,
  messages,
  userTimeContext,
  modelId,
  controller,
  abortSignal,
  councilMode = false,
}: {
  id: string;
  userId: string;
  messages: Message[];
  userTimeContext?: UserTimeContext;
  modelId: string;
  controller: ReadableStreamDefaultController;
  abortSignal?: AbortSignal;
  councilMode?: boolean;
}) {
  const encoder = new TextEncoder();

  const send = (type: StreamPartType | string, data: unknown) => {
    if (controller.desiredSize === null) return;
    try {
      const formatted = StreamProtocol.format(type as StreamPartType, data);
      controller.enqueue(encoder.encode(formatted));
    } catch (e) {
      const isClosedError =
        e instanceof TypeError && e.message.includes('already closed');
      if (!isClosedError) {
        console.error('[ChatService] Error enqueuing stream part:', e);
      }
    }
  };

  try {
    // 1. Process attachments
    const userMessage = messages[messages.length - 1];
    if (!userMessage || userMessage.role !== 'user') {
      throw new Error('No user message found to process');
    }

    const originalParts = JSON.parse(JSON.stringify(userMessage.parts));
    const originalTypedText = userMessage.parts
      .filter((part: MessagePart) => part.type === 'text')
      .map((part) => (part as { text: string }).text)
      .join('\n');

    const combinedText = await processMessageAttachments(userMessage);
    updateMessageWithProcessedText(
      userMessage,
      combinedText,
      originalTypedText,
    );

    // 2. Manage Chat initialization and title generation
    const chat = await getChatById({ id });
    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });
      await saveChat({ id, userId, title });
      send('metadata', { title });
    } else if (chat.userId !== userId) {
      throw new Error('Unauthorized access to chat');
    }

    // 2.1 Handle Retry logic
    const [existingMessage] = await getMessageById({ id: userMessage.id });
    if (existingMessage) {
      console.error(
        `[ChatService] Retry detected for message ${userMessage.id}. Cleaning up trailing history.`,
      );
      await deleteMessagesByChatIdAfterTimestamp({
        chatId: existingMessage.chatId,
        timestamp: existingMessage.createdAt,
      });
    }

    // 3. Save User Message
    await saveMessages({
      messages: [
        {
          chatId: id,
          id: userMessage.id,
          role: 'user',
          parts: originalParts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });
    await updateChatTimestamp({ id });

    // 4. Run AI Completion loop
    const assistantId = generateUUID();
    const { uiParts, addPartToUI, addCouncilToUI } = createUITracker();

    const { tools: availableTools } = await getAvailableTools();
    const toolsRegistry = availableTools as Record<
      string,
      {
        description?: string;
        parameters?: unknown;
        execute: (
          args?: Record<string, unknown>,
          options?: { abortSignal?: AbortSignal },
        ) => Promise<unknown>;
      }
    >;

    const latestUserText = messages
      .filter((m) => m.role === 'user')
      .flatMap((m) => m.parts.filter((p) => p.type === 'text'))
      .map((p) => (p as { text: string }).text)
      .join('\n');

    const { runCompletion } = createCompletionLoop({
      send,
      addPartToUI,
      toolsRegistry,
      modelId,
      userTimeContext,
      latestUserText,
      abortSignal,
    });

    const openAIMessages = convertToOpenAIMessages(messages);

    if (councilMode) {
      const userQuestion = latestUserText || '';
      const conversationContext = messages
        .slice(-6)
        .map((m) => {
          const role = m.role === 'user' ? 'User' : 'Assistant';
          const text = m.parts
            .filter((p) => p.type === 'text')
            .map((p) => (p as { text: string }).text)
            .join(' ');
          return `${role}: ${text}`;
        })
        .join('\n');

      const previousCouncilSyntheses = messages
        .filter((m) => m.role === 'assistant')
        .flatMap((m) => m.parts)
        .filter(
          (p) =>
            p.type === 'council-debate' &&
            (p as Record<string, unknown>).isComplete === true,
        )
        .map((p, i) => {
          const councilPart = p as Record<string, unknown>;
          const agents = (councilPart.agents || []) as Array<
            Record<string, unknown>
          >;
          const summary = agents
            .map((a) => {
              const name = typeof a.name === 'string' ? a.name : '';
              const content = typeof a.content === 'string' ? a.content : '';
              return `${name}: ${content.substring(0, 300)}`;
            })
            .join('\n');
          return `## Previous Council Turn ${i + 1}:\n${summary}`;
        })
        .join('\n\n');

      const [debateContext] = await runCouncilDebate({
        userQuestion,
        conversationContext,
        previousCouncilSyntheses: previousCouncilSyntheses || undefined,
        toolsRegistry,
        callbacks: {
          send,
          addCouncilToUI,
          addPartToUI: (part) => addPartToUI(part as MessagePart),
        },
        abortSignal,
      });

      const synthesisOpenAIMessages = [
        ...openAIMessages.slice(0, -1),
        {
          role: 'assistant' as const,
          content: `[Council Debate Complete. ${COUNCIL_AGENTS.researcher.name}, ${COUNCIL_AGENTS.analyst.name}, and ${COUNCIL_AGENTS.contrarian.name} have debated across multiple rounds. Synthesizing final answer...]`,
        },
        {
          role: 'user' as const,
          content: `${COUNCIL_SYNTHESIZER_PROMPT}\n\nCouncil debate transcript:\n\n${debateContext}`,
        },
      ];

      await runCompletion(synthesisOpenAIMessages);
    } else {
      await runCompletion(openAIMessages);
    }

    if (abortSignal?.aborted) return;

    // 5. Save Assistant Message
    await saveMessages({
      messages: [
        {
          id: assistantId,
          chatId: id,
          role: 'assistant',
          parts: uiParts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });
    await updateChatTimestamp({ id });
  } catch (error: unknown) {
    const err = error as unknown as Record<string, unknown> | Error | undefined;
    console.error('[ChatService Final Catch]', err);
    const message =
      err instanceof Error
        ? err.message
        : String(
            (err as Record<string, unknown>)?.message ??
              'An error occurred during completion',
          );
    send('error', message);
  } finally {
    try {
      if (controller.desiredSize !== null) {
        controller.close();
      }
    } catch (e) {
      const isClosedError =
        e instanceof TypeError && e.message.includes('already closed');
      if (!isClosedError) {
        console.error('[ChatService] Error closing stream controller:', e);
      }
    }
  }
}

export { convertToOpenAIMessages } from './message-converter';

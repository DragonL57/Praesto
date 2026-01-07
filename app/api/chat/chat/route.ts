import { cookies } from 'next/headers';
import { createUIMessageStreamResponse, streamText } from 'ai';

import { auth } from '@/app/auth';
import { deleteChatById, getChatById } from '@/lib/db/queries';
import { getMostRecentUserMessage } from '@/lib/utils';
import { getStreamTextConfig } from '@/lib/ai/providers';
import { getCalendarTools } from '@/lib/ai/calendar-tools';

import type { UIMessage } from 'ai';
import type { UserTimeContext, RequestData } from '@/lib/ai/chat/types';
import {
  processMessageAttachments,
  updateMessageWithProcessedText,
} from '@/lib/ai/chat/attachments';
import {
  handleChatPersistence,
  createOnFinishHandler,
  createOnStepFinishHandler,
} from '@/lib/ai/chat/handlers';
import { createStreamTransformer } from '@/lib/ai/chat/stream-transformer';

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const requestBody = await request.json();

    const {
      id,
      messages,
      userTimeContext,
    }: {
      id: string;
      messages: Array<UIMessage>;
      userTimeContext?: UserTimeContext;
      data?: RequestData;
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
    const originalUserMessageParts = userMessage.parts.map((part) => ({
      ...part,
    }));

    // Process attachments and extract text
    const originalUserTypedText = userMessage.parts
      .filter((part) => part.type === 'text')
      .map((part) => (part as { text: string }).text)
      .join('\n');

    const combinedText = await processMessageAttachments(userMessage);

    // Update message with processed text if needed
    updateMessageWithProcessedText(
      userMessage,
      combinedText,
      originalUserTypedText,
    );

    // Get selected model from cookie
    const cookieStore = await cookies();
    const cookieModel = cookieStore.get('chat-model')?.value;
    const finalSelectedChatModel = cookieModel || 'chat-model';

    // Handle chat persistence (create or verify chat, save user message)
    await handleChatPersistence(
      id,
      session.user.id,
      userMessage,
      originalUserMessageParts,
    );

    // Prepare messages for AI
    const messagesForStreamText = messages.map((msg) => {
      const processedMsg = { ...msg };
      if (msg.id === userMessage.id) {
        processedMsg.parts = userMessage.parts;
      }
      return processedMsg;
    });

    // Get stream text configuration
    const streamTextConfig = getStreamTextConfig(
      finalSelectedChatModel,
      messagesForStreamText,
      userTimeContext,
    );

    // Add calendar tools
    const calendarTools = await getCalendarTools();
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

    // Create stream with handlers
    const result = streamText({
      ...configWithCalendar,
      onStepFinish: createOnStepFinishHandler(),
      onFinish: createOnFinishHandler(id, session.user.id),
    });

    // Store result globally for onFinish handler access
    (globalThis as { __currentStreamResult?: unknown }).__currentStreamResult =
      result;
    // Create UI message stream
    const stream = result.toUIMessageStream({
      sendReasoning: true,
    });

    // Transform stream to clean up thinking markers
    const transformedStream = stream.pipeThrough(createStreamTransformer());

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
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session?.user) {
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

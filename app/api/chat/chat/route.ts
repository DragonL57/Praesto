import { cookies } from 'next/headers';
import { createUIMessageStreamResponse, streamText } from 'ai';

import { auth } from '@/app/auth';
import {
  deleteChatById,
  getChatById,
  getChatsByUserId,
  updateChatTitleById,
} from '@/lib/db/queries';
import { getMostRecentUserMessage } from '@/lib/utils';
import { getStreamTextConfig } from '@/lib/ai/providers';

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
    // Tools are now included by default in getStreamTextConfig via getAvailableTools
    const streamTextConfig = await getStreamTextConfig(
      finalSelectedChatModel,
      messagesForStreamText,
      userTimeContext,
    );

    // Create stream with handlers
    const result = streamText({
      ...streamTextConfig,
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

export async function PATCH(request: Request) {
  try {
    const { id, title }: { id: string; title: string } = await request.json();

    if (!id || !title) {
      return new Response('Missing required fields', { status: 400 });
    }

    const session = await auth();

    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const chat = await getChatById({ id });

    if (!chat) {
      return new Response('Chat not found', { status: 404 });
    }

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await updateChatTitleById({ chatId: id, title });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error renaming chat:', error);
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const session = await auth();

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // If no ID is provided, delete all chats for the user
    if (!id) {
      const { chats: userChats } = await getChatsByUserId({
        id: session.user.id,
        limit: 1000,
        startingAfter: null,
        endingBefore: null,
      });

      if (userChats.length > 0) {
        await Promise.all(userChats.map((chat) => deleteChatById({ id: chat.id })));
      }

      return new Response(
        JSON.stringify({ success: true, deleted: userChats.length }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Delete single chat
    const chat = await getChatById({ id });

    if (!chat) {
      return new Response('Chat not found', { status: 404 });
    }

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    console.error('Error deleting chat(s):', error);
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}

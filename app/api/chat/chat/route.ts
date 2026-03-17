import { cookies } from 'next/headers';
import { auth } from '@/app/auth';
import {
  getChatById,
  updateChatTitleById,
  deleteChatById,
  getChatsByUserId,
} from '@/lib/db/queries';
import { handleChatRequest } from '@/lib/ai/chat/chat-service';

import type { Message } from '@/lib/ai/types';
import type { UserTimeContext } from '@/lib/ai/chat/types';

export const maxDuration = 300;

/**
 * Main Chat Endpoint (POST)
 * Refactored to use handleChatRequest for business logic and streaming.
 */
export async function POST(request: Request) {
  try {
    const { id, messages, userTimeContext }: {
      id: string;
      messages: Array<Message>;
      userTimeContext?: UserTimeContext;
    } = await request.json();

    // 1. Authenticate user
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 2. Identify the selected model from cookies (fallback to default)
    const cookieStore = await cookies();
    const modelId = cookieStore.get('chat-model')?.value || 'chat-model';

    // 3. Create a readable stream and delegate to the chat service
    const stream = new ReadableStream({
      start(controller) {
        // We do NOT await here so the Response can be returned immediately
        handleChatRequest({
          id,
          userId,
          messages,
          userTimeContext,
          modelId,
          controller,
          abortSignal: request.signal,
        }).catch((err) => {
          console.error('[Stream Error]', err);
          if (controller.desiredSize !== null) {
            controller.error(err);
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[API CHAT ROUTE ERROR]', error);
    return new Response('An internal error occurred', { status: 500 });
  }
}

/**
 * Update Chat Title (PATCH)
 */
export async function PATCH(request: Request) {
  try {
    const { id, title }: { id: string; title: string } = await request.json();
    const session = await auth();
    if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

    const chat = await getChatById({ id });
    if (!chat || chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await updateChatTitleById({ chatId: id, title });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error('[API CHAT PATCH ERROR]', error);
    return new Response('Error', { status: 500 });
  }
}

/**
 * Delete Chat(s) (DELETE)
 */
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const session = await auth();
    if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

    const userId = session.user.id;

    if (!id) {
      // Bulk delete all chats for the user
      const { chats: userChats } = await getChatsByUserId({
        id: userId,
        limit: 1000,
        startingAfter: null,
        endingBefore: null,
      });
      await Promise.all(userChats.map((chat) => deleteChatById({ id: chat.id })));
    } else {
      // Delete specific chat
      const chat = await getChatById({ id });
      if (!chat || chat.userId !== userId) {
        return new Response('Unauthorized', { status: 401 });
      }
      await deleteChatById({ id });
    }
    return new Response('Deleted', { status: 200 });
  } catch (error) {
    console.error('[API CHAT DELETE ERROR]', error);
    return new Response('Error', { status: 500 });
  }
}

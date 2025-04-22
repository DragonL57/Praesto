import { auth } from '@/app/(auth)/auth';
import { getChatById, updateChatTitleById } from '@/lib/db/queries';

export async function POST(request: Request) {
  try {
    const { id, title }: { id: string; title: string } = await request.json();

    if (!id || !title) {
      return new Response('Missing required fields', { status: 400 });
    }

    const session = await auth();

    if (!session || !session.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Check if the chat exists and belongs to the user
    const chat = await getChatById({ id });
    
    if (!chat) {
      return new Response('Chat not found', { status: 404 });
    }

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Update the chat title
    await updateChatTitleById({ chatId: id, title });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error renaming chat:', error);
    return new Response('An error occurred while processing your request', {
      status: 500,
    });
  }
}
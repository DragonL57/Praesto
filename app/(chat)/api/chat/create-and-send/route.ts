import type { NextRequest } from 'next/server';
// eslint-disable-next-line import/no-unresolved
import { auth } from '@/app/auth';
// eslint-disable-next-line import/no-unresolved
import { saveChat, saveMessages } from '@/lib/db/queries';
// eslint-disable-next-line import/no-unresolved
import { generateUUID } from '@/lib/utils';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const body = await request.json();
  const { prompt } = body;
  if (!prompt) {
    return new Response('Missing prompt', { status: 400 });
  }

  const chatId = generateUUID();
  const title = prompt.slice(0, 40) + (prompt.length > 40 ? '...' : '');

  await saveChat({ id: chatId, userId: session.user.id, title });
  await saveMessages({
    messages: [
      {
        chatId,
        id: generateUUID(),
        role: 'user',
        parts: [{ type: 'text', text: prompt }],
        attachments: [],
        createdAt: new Date(),
      },
    ],
  });

  return Response.json({ chatId });
}

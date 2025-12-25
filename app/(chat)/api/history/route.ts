import { headers } from 'next/headers';
// eslint-disable-next-line import/no-unresolved
import { auth } from '@/app/auth';
import type { NextRequest } from 'next/server';
// eslint-disable-next-line import/no-unresolved
import { getChatsByUserId } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  await headers(); // Explicitly read headers
  const { searchParams } = request.nextUrl;

  const limit = Number.parseInt(searchParams.get('limit') || '10');
  const startingAfter = searchParams.get('starting_after');
  const endingBefore = searchParams.get('ending_before');

  if (startingAfter && endingBefore) {
    return Response.json(
      'Only one of starting_after or ending_before can be provided!',
      { status: 400 },
    );
  }

  const session = await auth();

  if (!session?.user?.id) {
    return Response.json('Unauthorized!', { status: 401 });
  }

  try {
    const chats = await getChatsByUserId({
      id: session.user.id,
      limit,
      startingAfter,
      endingBefore,
    });

    return Response.json(chats);
  } catch {
    return Response.json('Failed to fetch chats!', { status: 500 });
  }
}

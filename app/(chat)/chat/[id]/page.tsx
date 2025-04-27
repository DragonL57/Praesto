import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
// eslint-disable-next-line import/no-unresolved
import { auth } from '@/app/(auth)/auth';
// eslint-disable-next-line import/no-unresolved
import { Chat } from '@/components/chat';
// eslint-disable-next-line import/no-unresolved
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';
// eslint-disable-next-line import/no-unresolved
import { DataStreamHandler } from '@/components/data-stream-handler';
// eslint-disable-next-line import/no-unresolved
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import type { DBMessage } from '@/lib/db/schema';
import type { Attachment, UIMessage } from 'ai';
// eslint-disable-next-line import/no-unresolved
import { PageTransition } from '@/components/ui/page-transition';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const session = await auth();
  const isAuthenticated = !!session?.user;

  if (chat.visibility === 'private') {
    if (!isAuthenticated) {
      return notFound();
    }

    if (!session?.user || session.user.id !== chat.userId) {
      return notFound();
    }
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  function convertToUIMessages(messages: Array<DBMessage>): Array<UIMessage> {
    return messages.map((message) => ({
      id: message.id,
      parts: message.parts as UIMessage['parts'],
      role: message.role as UIMessage['role'],
      // Note: content will soon be deprecated in @ai-sdk/react
      content: '',
      createdAt: message.createdAt,
      experimental_attachments:
        (message.attachments as Array<Attachment>) ?? [],
    }));
  }

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get('chat-model');

  if (!chatModelFromCookie) {
    return (
      <PageTransition>
        <Chat
          id={chat.id}
          initialMessages={convertToUIMessages(messagesFromDb)}
          selectedChatModel={DEFAULT_CHAT_MODEL}
          selectedVisibilityType={chat.visibility}
          isReadonly={!session?.user || session.user.id !== chat.userId}
        />
        <DataStreamHandler id={id} />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <Chat
        id={chat.id}
        initialMessages={convertToUIMessages(messagesFromDb)}
        selectedChatModel={chatModelFromCookie.value}
        selectedVisibilityType={chat.visibility}
        isReadonly={!session?.user || session.user.id !== chat.userId}
      />
      <DataStreamHandler id={id} />
    </PageTransition>
  );
}

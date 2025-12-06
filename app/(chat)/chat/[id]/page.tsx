import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { Chat } from '@/components/chat';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { PageTransition } from '@/components/ui/page-transition';
import { auth } from '@/app/auth';
import { DEFAULT_CHAT_MODEL_ID } from '@/lib/ai/models';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';

import type { Attachment } from '@/lib/ai/types';
import type { DBMessage } from '@/lib/db/schema';
import type { UIMessage } from 'ai';

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
    /* FIXME(@ai-sdk-upgrade-v5): The `experimental_attachments` property has been replaced with the parts array. Please manually migrate following https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0#attachments--file-parts */
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
  const modelIdFromCookie =
    cookieStore.get('chat-model')?.value || DEFAULT_CHAT_MODEL_ID;

  return (
    <PageTransition>
      <Chat
        id={chat.id}
        initialMessages={convertToUIMessages(messagesFromDb)}
        selectedChatModel={modelIdFromCookie}
        selectedVisibilityType={chat.visibility}
        isReadonly={!session?.user || session.user.id !== chat.userId}
      />
      <DataStreamHandler id={id} />
    </PageTransition>
  );
}

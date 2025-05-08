import { notFound } from 'next/navigation';
// eslint-disable-next-line import/no-unresolved
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';
// eslint-disable-next-line import/no-unresolved
import { DataStreamHandler } from '@/components/data-stream-handler';
// eslint-disable-next-line import/no-unresolved
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import type { DBMessage } from '@/lib/db/schema';
import type { Attachment, UIMessage } from 'ai';
import { SharedChat } from '@/components/shared-chat';
import { PageTransition } from '@/components/ui/page-transition';

export const metadata = {
  title: 'Shared Conversation | UniTaskAI',
  description: 'View a shared AI conversation',
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page(props: PageProps) {
  const params = await props.params;
  // Access the id directly from params
  const { id } = params;

  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  // Only allow access to public chats
  if (chat.visibility !== 'public') {
    notFound();
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  function convertToUIMessages(messages: Array<DBMessage>): Array<UIMessage> {
    return messages.map((message) => ({
      id: message.id,
      parts: message.parts as UIMessage['parts'],
      role: message.role as UIMessage['role'],
      content: '',
      createdAt: message.createdAt,
      experimental_attachments:
        (message.attachments as Array<Attachment>) ?? [],
    }));
  }

  return (
    <PageTransition>
      <SharedChat
        id={chat.id}
        initialMessages={convertToUIMessages(messagesFromDb)}
        selectedChatModel={DEFAULT_CHAT_MODEL}
        _selectedVisibilityType="public"
        isReadonly={true}
      />
      <DataStreamHandler id={id} />
    </PageTransition>
  );
}
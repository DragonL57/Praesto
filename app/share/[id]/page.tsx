import { notFound } from 'next/navigation';

import { DataStreamHandler } from '@/components/data-stream-handler';
import { PageTransition } from '@/components/ui/page-transition';
import { SharedChat } from '@/components/shared';
import { DEFAULT_CHAT_MODEL_ID } from '@/lib/ai/providers';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';

import type { Attachment } from '@/lib/ai/types';
import type { DBMessage } from '@/lib/db/schema';
import type { UIMessage } from 'ai';

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
    /* FIXME(@ai-sdk-upgrade-v5): The `experimental_attachments` property has been replaced with the parts array. Please manually migrate following https://ai-sdk.dev/docs/migration-guides/migration-guide-5-0#attachments--file-parts */
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
        selectedChatModel={DEFAULT_CHAT_MODEL_ID}
        _selectedVisibilityType="public"
        isReadonly={true}
      />
      <DataStreamHandler id={id} />
    </PageTransition>
  );
}

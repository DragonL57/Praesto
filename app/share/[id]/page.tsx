import { notFound } from 'next/navigation';

import { PageTransition } from '@/components/ui/page-transition';
import { SharedChat } from '@/components/shared';
import { DEFAULT_CHAT_MODEL_ID } from '@/lib/ai/models';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';

import type { Message, MessagePart, MessageRole } from '@/lib/ai/types';
import type { DBMessage } from '@/lib/db/schema';

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

  function convertToMessages(messages: Array<DBMessage>): Array<Message> {
    return messages.map((message) => ({
      id: message.id,
      parts: message.parts as MessagePart[],
      role: message.role as MessageRole,
      createdAt: message.createdAt,
    }));
  }

  return (
    <PageTransition>
      <SharedChat
        id={chat.id}
        initialMessages={convertToMessages(messagesFromDb)}
        selectedChatModel={DEFAULT_CHAT_MODEL_ID}
        _selectedVisibilityType="public"
        isReadonly={true}
      />
    </PageTransition>
  );
}


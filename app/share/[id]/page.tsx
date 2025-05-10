import { notFound } from 'next/navigation';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import type { DBMessage } from '@/lib/db/schema';
import type { Attachment, UIMessage } from 'ai';
import { SharedChat } from '@/components/shared-chat';
import { PageTransition } from '@/components/ui/page-transition';
import { Suspense } from 'react';
import { createReactCachedFunction } from '@/lib/cache';

export const metadata = {
  title: 'Shared Conversation | UniTaskAI',
  description: 'View a shared AI conversation',
};

// Define the function first
function mapMessagesToUIMessages(messages: Array<DBMessage>): Array<UIMessage> {
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

// Create the cached version
const getCachedConverter = createReactCachedFunction(mapMessagesToUIMessages);

// Create a loading fallback for better user experience
function SharedChatLoadingFallback() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <div className="inline-block size-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" aria-hidden="true" />
      <span className="ml-2 text-lg text-muted-foreground">Loading shared conversation...</span>
    </div>
  );
}

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page(props: PageProps) {
  const params = await props.params;
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
  
  // Get the cached converter function and then use it
  const convertToUIMessages = await getCachedConverter;
  const initialMessages = convertToUIMessages(messagesFromDb);

  return (
    <PageTransition>
      <Suspense fallback={<SharedChatLoadingFallback />}>
        <SharedChat
          id={chat.id}
          initialMessages={initialMessages}
          selectedChatModel={DEFAULT_CHAT_MODEL}
          _selectedVisibilityType="public"
          isReadonly={true}
        />
      </Suspense>
    </PageTransition>
  );
}
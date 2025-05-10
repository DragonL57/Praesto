import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
// eslint-disable-next-line import/no-unresolved
import { auth } from '@/app/auth';
import { Suspense } from 'react';
import type { Metadata, ResolvingMetadata } from 'next';
// eslint-disable-next-line import/no-unresolved
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';
// eslint-disable-next-line import/no-unresolved
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import type { DBMessage, Chat as ChatType } from '@/lib/db/schema';
import type { Attachment, UIMessage } from 'ai';
// eslint-disable-next-line import/no-unresolved
import { PageTransition } from '@/components/ui/page-transition';
// eslint-disable-next-line import/no-unresolved
import { Chat } from '@/components/chat';

// Simple loading fallback component
function ChatLoadingFallback() {
  return (
    <div className="flex h-[90vh] w-full items-center justify-center">
      <div className="inline-block size-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" aria-hidden="true" />
      <span className="ml-2 text-lg text-muted-foreground">Loading conversation...</span>
    </div>
  );
}

// Generate metadata for SEO (async function)
export async function generateMetadata(
  props: { params: { id: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  // According to Next.js v15 upgrade docs, for async functions we must await the params
  const params = await props.params;
  const chatId = params.id;

  // Fetch basic chat info for metadata
  const chat = await getChatById({ id: chatId }).catch(() => null) as ChatType | null;
  
  // Get parent metadata for defaults
  const parentMetadata = await parent;
  const previousImages = parentMetadata?.openGraph?.images || [];

  if (!chat) {
    return {
      title: 'Chat Not Found',
      description: 'The requested chat could not be found.',
    };
  }

  const chatTitle = chat.title || 'Conversation';

  return {
    title: `${chatTitle} | UniTaskAI Chat`,
    description: `Continue your conversation about ${chatTitle} with UniTaskAI's chat assistant.`,
    openGraph: {
      title: `${chatTitle} | UniTaskAI Chat`,
      description: `Interactive AI conversation about ${chatTitle}`,
      type: 'article',
      images: previousImages,
    }
  };
}

// Convert DB messages to UI messages - extracted as separate function
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

export default async function Page(
  props: { params: { id: string } }
) {
  // According to Next.js v15 upgrade docs, for async functions we must await the params
  const params = await props.params;
  const chatId = params.id;
  
  // Parallel data fetching for better performance
  const [chat, session, messagesFromDb, cookieStore] = await Promise.all([
    getChatById({ id: chatId }).catch(() => null) as Promise<ChatType | null>,
    auth(),
    getMessagesByChatId({ id: chatId }).catch(() => []) as Promise<DBMessage[]>,
    cookies()
  ]);

  if (!chat) {
    notFound();
  }

  const isAuthenticated = !!session?.user;

  // Permission check
  if (chat.visibility === 'private') {
    if (!isAuthenticated || !session?.user || session.user.id !== chat.userId) {
      notFound();
    }
  }

  // Get chat model from cookie or use default
  const chatModelFromCookie = cookieStore.get('chat-model');
  const selectedChatModel = chatModelFromCookie?.value || DEFAULT_CHAT_MODEL;
  
  // Convert DB messages to UI messages
  const initialMessages = convertToUIMessages(messagesFromDb);
  
  // Is the user allowed to edit this chat?
  const isReadonly = !session?.user || session.user.id !== chat.userId;

  return (
    <PageTransition>
      <Suspense fallback={<ChatLoadingFallback />}>
        <Chat
          id={chat.id}
          initialMessages={initialMessages}
          selectedChatModel={selectedChatModel}
          selectedVisibilityType={chat.visibility}
          isReadonly={isReadonly}
        />
      </Suspense>
    </PageTransition>
  );
}

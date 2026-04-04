import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { Chat } from '@/components/chat';
import { PageTransition } from '@/components/ui/page-transition';
import { auth } from '@/app/auth';
import { DEFAULT_CHAT_MODEL_ID } from '@/lib/ai/models';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';

import type { Message, MessagePart, MessageRole } from '@/lib/ai/types';
import type { DBMessage } from '@/lib/db/schema';

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

  function convertToMessages(messages: Array<DBMessage>): Array<Message> {
    return messages.map((message) => {
      const originalParts = message.parts as MessagePart[];
      let processedParts = [...originalParts];

      // Process text parts to extract embedded thinking content (for older messages)
      if (message.role === 'assistant') {
        const newParts: MessagePart[] = [];

        originalParts.forEach((part) => {
          // Preserve tool-call and tool-result parts as-is
          if (
            part.type &&
            (part.type.startsWith('tool-') ||
              part.type === 'tool-call' ||
              part.type === 'tool-result')
          ) {
            newParts.push(part);
            return;
          }

          if (part.type === 'text' && typeof (part as { text: string }).text === 'string') {
            const partText = (part as { text: string }).text;
            // Check for embedded Poe API thinking format (lines starting with >)
            const lines = partText.split('\n');
            const thinkingLines: string[] = [];
            const nonThinkingLines: string[] = [];
            let inThinkingBlock = false;

            for (const line of lines) {
              const trimmedLine = line.trim();
              if (trimmedLine.startsWith('>')) {
                // This is a thinking line
                inThinkingBlock = true;
                // Remove the > prefix and any following space
                const thinkingContent = trimmedLine.substring(1).trim();
                if (thinkingContent) {
                  thinkingLines.push(thinkingContent);
                }
              } else if (!(inThinkingBlock && trimmedLine === '')) {
                // Non-thinking line or meaningful line, end of thinking block
                inThinkingBlock = false;
                nonThinkingLines.push(line);
              }
            }

            // If we found thinking content, add it as a reasoning part
            if (thinkingLines.length > 0) {
              const thinkingContent = thinkingLines.join('\n').trim();
              if (thinkingContent) {
                newParts.push({
                  type: 'reasoning',
                  text: thinkingContent,
                });
              }
            }

            // Add cleaned text content if present
            const cleanText = nonThinkingLines.join('\n').trim();
            if (cleanText) {
              newParts.push({
                type: 'text',
                text: cleanText,
              });
            } else if (thinkingLines.length === 0) {
              // No thinking content found, keep original part
              newParts.push(part);
            }
          } else {
            // Non-text part (file, reasoning, etc.), keep as-is
            newParts.push(part);
          }
        });

        processedParts = newParts;
      }

      return {
        id: message.id,
        role: message.role as MessageRole,
        parts: processedParts,
        createdAt: message.createdAt,
      };
    });
  }

  const cookieStore = await cookies();
  const modelIdFromCookie =
    cookieStore.get('chat-model')?.value || DEFAULT_CHAT_MODEL_ID;

  return (
    <PageTransition>
      <Chat
        id={chat.id}
        initialMessages={convertToMessages(messagesFromDb)}
        selectedChatModel={modelIdFromCookie}
        selectedVisibilityType={chat.visibility}
        isReadonly={!session?.user || session.user.id !== chat.userId}
      />
    </PageTransition>
  );
}


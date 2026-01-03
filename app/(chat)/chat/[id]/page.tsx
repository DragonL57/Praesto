import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { Chat } from '@/components/chat';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { PageTransition } from '@/components/ui/page-transition';
import { auth } from '@/app/auth';
import { DEFAULT_CHAT_MODEL_ID } from '@/lib/ai/providers';
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
    return messages.map((message) => {
      const originalParts = message.parts as UIMessage['parts'];
      let processedParts = [...originalParts];

      console.log(
        'Processing message:',
        message.id,
        'with',
        originalParts.length,
        'parts',
      );
      console.log('Parts structure:', JSON.stringify(originalParts, null, 2));

      // Process text parts to extract embedded thinking content (for older messages)
      // Also ensure tool-related parts are preserved
      if (message.role === 'assistant') {
        const newParts: UIMessage['parts'] = [];

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

          if (part.type === 'text' && typeof part.text === 'string') {
            // Check for embedded Poe API thinking format (lines starting with >)
            const lines = part.text.split('\n');
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
                console.log(
                  'Found thinking content in old message:',
                  `${thinkingContent.substring(0, 100)}...`,
                );
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

      const finalMessage = {
        id: message.id,
        parts: processedParts,
        role: message.role as UIMessage['role'],
        // Note: content will soon be deprecated in @ai-sdk/react
        content: '',
        createdAt: message.createdAt,
        experimental_attachments:
          (message.attachments as Array<Attachment>) ?? [],
      };

      console.log('Final message parts:', finalMessage.parts.length);
      console.log(
        'Final parts structure:',
        JSON.stringify(finalMessage.parts, null, 2),
      );

      return finalMessage;
    });
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

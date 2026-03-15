'use server';

import type { UIMessage } from 'ai';
import { openai } from '@/lib/ai/providers';
import {
  deleteMessagesByChatIdAfterTimestamp,
  deleteMessageById,
  getMessageById,
  updateChatVisiblityById,
} from '@/lib/db/queries';
import type { VisibilityType } from '@/components/visibility-selector';

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  const userContent = message.parts
    .filter((part) => part.type === 'text')
    .map((part) => (part as { text: string }).text)
    .join('\n');

  const response = await openai.chat.completions.create({
    model: 'grok-4.1-fast-non-reasoning',
    messages: [
      {
        role: 'system',
        content: `
    - You are a conversation title generator.
    - Your goal is to generate a short, concise title (MAX 4 WORDS) for a conversation based on the user's first message.
    - IF the user asks for news, headlines, or updates on current events, you MUST use the exact title: "Latest News Headlines".
    - OTHERWISE, summarize the user's message in 4 words or less.
    - Do not use quotes, colons, or any other punctuation.
    - Do not output the whole message; only the short title.
    
    Example for news:
    User: "Show me the latest news headlines"
    Title: "Latest News Headlines"`,
      },
      {
        role: 'user',
        content: userContent,
      },
    ],
    temperature: 0.7,
    max_tokens: 20,
  });

  return response.choices[0].message.content?.trim() || 'New Chat';
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  // Check if message exists before accessing its properties
  if (!message) {
    console.error(`No message found with id: ${id}`);
    return;
  }

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function deleteMessage({
  id,
  chatId,
}: {
  id: string;
  chatId: string;
}) {
  await deleteMessageById({
    messageId: id,
    chatId,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisiblityById({ chatId, visibility });
}

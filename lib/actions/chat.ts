'use server';

import { generateText } from 'ai';
import type { UIMessage } from 'ai';
// eslint-disable-next-line import/no-unresolved
import {
    deleteMessagesByChatIdAfterTimestamp,
    deleteMessageById,
    getMessageById,
    updateChatVisiblityById,
} from '@/lib/db/queries';
import type { VisibilityType } from '@/components/visibility-selector';
// eslint-disable-next-line import/no-unresolved
import { myProvider } from '@/lib/ai/providers';

export async function generateTitleFromUserMessage({
    message,
}: {
    message: UIMessage;
}) {
    const { text: title } = await generateText({
        model: myProvider.languageModel('title-model'),
        system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 4 words long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
        prompt: JSON.stringify(message),
    });

    return title;
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

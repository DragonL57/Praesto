import type { UIMessage } from 'ai';
import {
    saveMessages,
    updateChatTimestamp,
    getChatById,
    saveChat,
} from '@/lib/db/queries';
import { generateTitleFromUserMessage } from '@/lib/actions/chat';

export async function handleChatPersistence(
    chatId: string,
    userId: string,
    userMessage: UIMessage,
    originalUserMessageParts: UIMessage['parts'],
) {
    const chat = await getChatById({ id: chatId });

    if (!chat) {
        const title = await generateTitleFromUserMessage({ message: userMessage });
        await saveChat({ id: chatId, userId, title });
    } else {
        if (chat.userId !== userId) {
            throw new Error('Unauthorized');
        }
    }

    // Save user message
    await saveMessages({
        messages: [
            {
                chatId,
                id: userMessage.id,
                role: 'user',
                parts: originalUserMessageParts,
                attachments: [],
                createdAt: new Date(),
            },
        ],
    });

    // Update timestamp
    await updateChatTimestamp({ id: chatId });
}

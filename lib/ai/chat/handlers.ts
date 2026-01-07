import type { UIMessage } from 'ai';
import {
    saveMessages,
    updateChatTimestamp,
    getChatById,
    saveChat,
} from '@/lib/db/queries';
import { generateTitleFromUserMessage } from '@/lib/actions/chat';
import { generateUUID } from '@/lib/utils';
import {
    buildAssistantMessageParts,
    extractToolCallsAndResults,
} from './message-builder';

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

export function createOnFinishHandler(
    chatId: string,
    userId: string | undefined,
) {
    const assistantId = generateUUID();

    return async (event: {
        text: string;
        reasoning?: Array<{ text: string }>;
        [key: string]: unknown;
    }) => {
        if (!userId) return;

        try {
            // Access the result from the outer scope (will be set by caller)
            const result = (
                globalThis as {
                    __currentStreamResult?: {
                        steps?: unknown[];
                        response?: Promise<{ messages?: unknown[] }>;
                    };
                }
            ).__currentStreamResult as
                | {
                    steps?: Array<{
                        toolCalls?: Array<{
                            toolName: string;
                            toolCallId: string;
                            args?: Record<string, unknown>;
                        }>;
                        toolResults?: Array<{
                            toolName: string;
                            toolCallId: string;
                            result?: unknown;
                        }>;
                    }>;
                    response?: Promise<{ messages?: unknown[] }>;
                }
                | undefined;

            const { allToolCalls, allToolResults } = await extractToolCallsAndResults(
                result ?? { steps: [], response: undefined },
            );

            const uiParts = buildAssistantMessageParts(
                event.text,
                event.reasoning,
                allToolCalls,
                allToolResults,
            );

            await saveMessages({
                messages: [
                    {
                        id: assistantId,
                        chatId,
                        role: 'assistant' as const,
                        parts: uiParts,
                        attachments: [],
                        createdAt: new Date(),
                    },
                ],
            });

            await updateChatTimestamp({ id: chatId });
        } catch (error) {
            console.error('Failed to save chat:', error);
        }
    };
}

export function createOnStepFinishHandler() {
    return () => {
        // Step finished - handlers are processing
    };
}

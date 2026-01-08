import { auth } from '@/app/auth';
import { SUGGESTIONS_AGENT_PROMPT } from '@/lib/ai/suggestions-prompt';
import { myProvider } from '@/lib/ai/providers';
import { generateText } from 'ai';
import type { UIMessage } from 'ai';

export const maxDuration = 30;

interface Suggestion {
    title: string;
    label: string;
    action: string;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        console.log('[SUGGESTIONS API] Received body:', JSON.stringify(body).substring(0, 200));

        const { messages }: { messages: Array<UIMessage> } = body;

        const session = await auth();

        if (!session?.user?.id) {
            return new Response('Unauthorized', { status: 401 });
        }

        // Validate messages
        if (!messages || messages.length === 0) {
            console.error('[SUGGESTIONS API] No messages provided:', { messages });
            return Response.json(
                { error: 'No messages provided' },
                { status: 400 },
            );
        }

        // Use fast model for suggestions (grok-4.1-fast-non-reasoning)
        const model = myProvider.languageModel('fast-model');

        // Build conversation context for the suggestions agent
        // Take last 4 messages max to keep context relevant but concise
        const recentMessages = messages.slice(-4);
        const conversationContext = recentMessages
            .map((msg) => {
                const role = msg.role === 'user' ? 'User' : 'Assistant';
                const textParts = msg.parts
                    .filter((part) => part.type === 'text')
                    .map((part) => (part as { text: string }).text)
                    .join('\n');
                return `${role}: ${textParts}`;
            })
            .join('\n\n');

        console.log('[SUGGESTIONS] Conversation context:', conversationContext);

        // Generate suggestions using the separate agent
        const result = await generateText({
            model,
            system: SUGGESTIONS_AGENT_PROMPT,
            prompt: `Based on this conversation, generate 4 contextual follow-up suggestions:\n\n${conversationContext}`,
            temperature: 0.7,
        });

        console.log('[SUGGESTIONS] Generated text:', result.text);

        // Parse the JSON response
        let suggestions: Suggestion[];
        try {
            // Try to extract JSON from the response
            const text = result.text.trim();

            // Handle cases where model might wrap JSON in markdown code blocks
            let jsonText = text;
            if (text.startsWith('```json')) {
                jsonText = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (text.startsWith('```')) {
                jsonText = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }

            suggestions = JSON.parse(jsonText);

            // Validate structure
            if (!Array.isArray(suggestions) || suggestions.length !== 4) {
                throw new Error('Invalid suggestions format');
            }

            // Validate each suggestion has required fields
            for (const suggestion of suggestions) {
                if (
                    !suggestion.title ||
                    !suggestion.label ||
                    !suggestion.action ||
                    typeof suggestion.title !== 'string' ||
                    typeof suggestion.label !== 'string' ||
                    typeof suggestion.action !== 'string'
                ) {
                    throw new Error('Invalid suggestion structure');
                }
            }
        } catch (parseError) {
            console.error('[SUGGESTIONS PARSE ERROR]', parseError);
            console.error('[SUGGESTIONS RAW TEXT]', result.text);

            // Fallback to default suggestions if parsing fails
            suggestions = [
                {
                    title: 'Tell me more',
                    label: 'about this topic',
                    action: 'Can you tell me more about this topic?',
                },
                {
                    title: 'Explain further',
                    label: 'with examples',
                    action: 'Can you explain that further with some examples?',
                },
                {
                    title: 'Related topics',
                    label: 'I should know about',
                    action: 'What are some related topics I should know about?',
                },
                {
                    title: 'Practical application',
                    label: 'how to use this',
                    action: 'How can I practically apply this information?',
                },
            ];
        }

        return Response.json(suggestions, { status: 200 });
    } catch (error) {
        console.error('[GENERATE SUGGESTIONS ERROR]', error);
        return Response.json(
            { error: 'Failed to generate suggestions' },
            { status: 500 },
        );
    }
}

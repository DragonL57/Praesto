import { validateSession } from '@/lib/session-validator';
import { SUGGESTIONS_AGENT_PROMPT } from '@/lib/ai/suggestions-prompt';
import { openai } from '@/lib/ai/providers';
import type { Message } from '@/lib/ai/types';

export const maxDuration = 30;

interface Suggestion {
  title: string;
  label: string;
  action: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages }: { messages: Array<Message> } = body;

    const session = await validateSession();

    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Validate messages
    if (!messages || messages.length === 0) {
      console.warn('[Suggestions] No messages provided in request');
      return Response.json({ error: 'No messages provided' }, { status: 400 });
    }

    // Use fast model for suggestions
    const model = 'grok-4.1-fast-non-reasoning';

    // Build conversation context for the suggestions agent
    const recentMessages = messages.slice(-4);
    const conversationContext = recentMessages
      .map((msg) => {
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        // Use optional chaining and fallback for parts
        const textParts = (msg.parts || [])
          .filter((part) => part.type === 'text')
          .map((part) => (part as { text: string }).text)
          .join('\n');
        return `${role}: ${textParts}`;
      })
      .join('\n\n');

    if (!conversationContext.trim()) {
      console.warn('[Suggestions] Empty conversation context extracted');
      return Response.json([], { status: 200 });
    }

    // Generate suggestions using the separate agent
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: SUGGESTIONS_AGENT_PROMPT,
        },
        {
          role: 'user',
          content: `Based on this conversation, generate 4 contextual follow-up suggestions:\n\n${conversationContext}`,
        },
      ],
      temperature: 0.7,
      stream: false,
    });

    const text = response.choices[0].message.content?.trim() || '';

    if (!text) {
      console.warn('[Suggestions] AI returned empty response');
      return Response.json([], { status: 200 });
    }

    // Parse the JSON response
    let suggestions: Suggestion[];
    try {
      // Handle cases where model might wrap JSON in markdown code blocks
      let jsonText = text;
      if (text.startsWith('```json')) {
        jsonText = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (text.startsWith('```')) {
        jsonText = text.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      suggestions = JSON.parse(jsonText);

      // Validate structure
      if (!Array.isArray(suggestions)) {
        throw new Error('Suggestions is not an array');
      }

      // Ensure we have at most 4
      suggestions = suggestions.slice(0, 4);

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
      console.error('[SUGGESTIONS PARSE ERROR]', parseError, 'Raw text:', text);
      return Response.json(
        { error: 'Failed to parse suggestions' },
        { status: 500 },
      );
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

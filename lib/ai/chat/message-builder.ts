import type { UIMessage } from 'ai';
import type { ToolCall, ToolResult, ReasoningItem, Step } from './types';

export function buildAssistantMessageParts(
    text: string,
    reasoning: string | ReasoningItem[] | undefined,
    allToolCalls: ToolCall[],
    allToolResults: ToolResult[],
): Array<UIMessage['parts'][number]> {
    const uiParts: Array<UIMessage['parts'][number]> = [];

    // 1. Reasoning/thought signature (if any)
    if (reasoning) {
        const reasoningText = Array.isArray(reasoning)
            ? reasoning
                .map((r: ReasoningItem) => (typeof r === 'string' ? r : r.text))
                .join('\n')
            : typeof reasoning === 'string'
                ? reasoning
                : '';
        if (reasoningText) {
            uiParts.push({ type: 'reasoning', text: reasoningText });
        }
    }

    // 2. Tool call(s) (input-available) from all steps
    allToolCalls.forEach((toolCall: ToolCall) => {
        uiParts.push({
            type: `tool-${toolCall.toolName}`,
            toolCallId: toolCall.toolCallId,
            state: 'input-available',
            input: toolCall.args || {},
        });
    });

    // 3. Tool result(s) (output-available) from all steps
    allToolResults.forEach((toolResult: ToolResult) => {
        const matchingCall = allToolCalls.find(
            (tc) => tc.toolCallId === toolResult.toolCallId,
        );
        uiParts.push({
            type: `tool-${toolResult.toolName}`,
            toolCallId: toolResult.toolCallId,
            state: 'output-available',
            input: matchingCall?.args || {},
            output: toolResult.result ?? {},
        });
    });

    // 4. If there was a tool call but no tool result, create fallback
    if (allToolCalls.length > 0 && allToolResults.length === 0) {
        allToolCalls.forEach((tc: ToolCall) => {
            uiParts.push({
                type: `tool-${tc.toolName}`,
                toolCallId: tc.toolCallId,
                state: 'output-available',
                input: tc.args || {},
                output: text ? { text } : {},
            });
        });
    }

    // 5. Process text content
    if (text) {
        const processedText = text.replace(/^\*\*Thinking\.{3,}\*\*\s*\n*/i, '');
        const { thinkingLines, cleanText } = extractThinkingFromText(processedText);

        // Add reasoning part if we found thinking content (and no reasoning part already added)
        if (thinkingLines.length > 0 && !reasoning) {
            const thinkingContent = thinkingLines.join('\n').trim();
            if (thinkingContent) {
                uiParts.push({ type: 'reasoning', text: thinkingContent });
            }
        }

        // Add cleaned text content if present
        if (cleanText) {
            uiParts.push({ type: 'text', text: cleanText });
        }
    }

    return uiParts;
}

function extractThinkingFromText(text: string): {
    thinkingLines: string[];
    cleanText: string;
} {
    const lines = text.split('\n');
    const thinkingLines: string[] = [];
    const nonThinkingLines: string[] = [];
    let inThinkingBlock = false;

    for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('>')) {
            inThinkingBlock = true;
            const thinkingContent = trimmedLine.substring(1).trim();
            if (thinkingContent) thinkingLines.push(thinkingContent);
        } else if (
            trimmedLine.startsWith('*') &&
            trimmedLine.endsWith('*') &&
            (trimmedLine.toLowerCase().includes('thinking') || inThinkingBlock)
        ) {
            inThinkingBlock = true;
            const thinkingContent = trimmedLine
                .substring(1, trimmedLine.length - 1)
                .trim();
            if (thinkingContent) thinkingLines.push(thinkingContent);
        } else if (!(inThinkingBlock && trimmedLine === '')) {
            if (!trimmedLine.startsWith('*') && !trimmedLine.startsWith('>'))
                inThinkingBlock = false;
            if (!inThinkingBlock || trimmedLine !== '')
                nonThinkingLines.push(line);
        }
    }

    return {
        thinkingLines,
        cleanText: nonThinkingLines.join('\n').trim(),
    };
}

export async function extractToolCallsAndResults(
    result: {
        steps?: Step[];
        response?: Promise<{ messages?: unknown[] }>;
    },
): Promise<{ allToolCalls: ToolCall[]; allToolResults: ToolResult[] }> {
    const allSteps: Step[] = Array.isArray(result?.steps) ? result.steps : [];
    let allToolCalls: ToolCall[] = [];
    let allToolResults: ToolResult[] = [];

    // Fallback: If steps is missing/empty, extract from result.response.messages
    if (!allSteps || allSteps.length === 0) {
        const response = result?.response ? await result.response : undefined;
        const messages = response?.messages || [];

        for (const msg of messages) {
            const message = msg as {
                role?: string;
                content?: Array<{
                    type?: string;
                    toolName?: string;
                    toolCallId?: string;
                    input?: unknown;
                    output?: unknown;
                }>;
            };
            if (message.role === 'assistant' && Array.isArray(message.content)) {
                for (const part of message.content) {
                    if (part.type === 'tool-call' && part.toolName && part.toolCallId) {
                        allToolCalls.push({
                            toolName: part.toolName,
                            toolCallId: part.toolCallId,
                            args:
                                part.input && typeof part.input === 'object'
                                    ? (part.input as Record<string, unknown>)
                                    : {},
                        });
                    }
                }
            }
            if (message.role === 'tool' && Array.isArray(message.content)) {
                for (const part of message.content) {
                    if (part.type === 'tool-result' && part.toolName && part.toolCallId) {
                        let resultValue: unknown;
                        if (
                            part.output &&
                            typeof part.output === 'object' &&
                            'value' in part.output
                        ) {
                            resultValue = part.output.value;
                        } else if (part.output !== undefined) {
                            resultValue = part.output;
                        }
                        allToolResults.push({
                            toolName: part.toolName,
                            toolCallId: part.toolCallId,
                            result: resultValue,
                        });
                    }
                }
            }
        }
    } else {
        allToolCalls = allSteps.flatMap((step) => step?.toolCalls || []);
        allToolResults = allSteps.flatMap((step) => step?.toolResults || []);
    }

    return { allToolCalls, allToolResults };
}

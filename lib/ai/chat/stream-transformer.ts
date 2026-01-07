export function createStreamTransformer() {
    let accumulatedText = '';
    let hasSeenContent = false;

    return new TransformStream({
        transform(chunk, controller) {
            if (chunk && typeof chunk === 'object' && 'type' in chunk) {
                if (
                    chunk.type === 'text-delta' &&
                    'textDelta' in chunk &&
                    typeof chunk.textDelta === 'string'
                ) {
                    const delta = chunk.textDelta;

                    // Skip thinking markers and empty content
                    if (
                        delta.includes('**Thinking') ||
                        delta.includes('Thinking...') ||
                        delta.trim().startsWith('>') ||
                        (!hasSeenContent && delta.trim() === '')
                    ) {
                        return;
                    }

                    accumulatedText += delta;

                    // Detect when real content starts
                    if (
                        delta.includes('#') ||
                        delta.includes('##') ||
                        accumulatedText.length > 50
                    ) {
                        hasSeenContent = true;
                    }

                    if (!hasSeenContent) {
                        return;
                    }

                    // Clean the delta
                    let cleanedDelta = delta;
                    cleanedDelta = cleanedDelta.replace(/\*\*Thinking\.{3,}\*\*/gi, '');
                    cleanedDelta = cleanedDelta.replace(/Thinking\.{3,}/gi, '');

                    const lines = cleanedDelta.split('\n');
                    const filteredLines = lines.filter(
                        (line: string) => !line.trim().startsWith('>'),
                    );
                    cleanedDelta = filteredLines.join('\n');

                    if (cleanedDelta.trim()) {
                        controller.enqueue({ ...chunk, textDelta: cleanedDelta });
                    }
                } else {
                    controller.enqueue(chunk);
                }
            } else {
                controller.enqueue(chunk);
            }
        },
        flush(_controller) {
            accumulatedText = '';
            hasSeenContent = false;
        },
    });
}

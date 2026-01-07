import { Buffer } from 'node:buffer';
import { parseOfficeAsync } from 'officeparser';
import type { UIMessage, TextUIPart } from 'ai';
import { getFilePartsFromMessage } from './types';

// Configuration for Extracted Text Formatting
const ATTACHMENT_TEXT_HEADER_PREFIX = '\n\n--- Content from attachment:';
const ATTACHMENT_TEXT_FOOTER = '---\n--- End of attachment ---';
const ATTACHMENT_ERROR_NOTE_PREFIX =
    '\n\n--- System Note: An error occurred while trying to extract text content from attachment:';
const ATTACHMENT_ERROR_NOTE_SUFFIX =
    '. The file might be corrupted, password-protected, or in an unsupported format. ---';
const ATTACHMENT_TEXT_TRUNCATED_SUFFIX =
    ' [Content truncated as it exceeded 100,000 characters]';
const MAX_EXTRACTED_TEXT_CHARS = 100000;

export async function processMessageAttachments(
    userMessage: UIMessage,
): Promise<string> {
    let combinedUserTextAndAttachments = '';

    // Get the original typed text from the user message parts
    const originalUserTypedText = userMessage.parts
        .filter((part): part is TextUIPart => part.type === 'text')
        .map((part) => part.text)
        .join('\n');

    combinedUserTextAndAttachments = originalUserTypedText;

    const fileParts = getFilePartsFromMessage(userMessage);
    if (fileParts.length === 0) {
        return combinedUserTextAndAttachments;
    }

    for (const attachment of fileParts) {
        if (!attachment.url) continue;

        // Skip text extraction for image files
        const isImage =
            attachment.contentType?.startsWith('image/') ||
            attachment.mediaType?.startsWith('image/');
        if (isImage) {
            continue;
        }

        try {
            const response = await fetch(attachment.url);
            if (!response.ok) {
                throw new Error(`Failed to fetch file: ${response.statusText}`);
            }
            const fileArrayBuffer = await response.arrayBuffer();
            const fileBuffer = Buffer.from(fileArrayBuffer);

            const extractedText = await parseOfficeAsync(fileBuffer);

            if (extractedText?.trim().length > 0) {
                let finalText = extractedText.trim();
                let truncationNote = '';

                if (finalText.length > MAX_EXTRACTED_TEXT_CHARS) {
                    finalText = finalText.substring(0, MAX_EXTRACTED_TEXT_CHARS);
                    truncationNote = ATTACHMENT_TEXT_TRUNCATED_SUFFIX;
                }

                combinedUserTextAndAttachments += `${ATTACHMENT_TEXT_HEADER_PREFIX} ${attachment.name || 'file'} ---\n${finalText}${truncationNote}${ATTACHMENT_TEXT_FOOTER}`;
            }
        } catch (error) {
            console.error(
                `Error processing attachment ${attachment.name || attachment.url}:`,
                error,
            );
            combinedUserTextAndAttachments += `${ATTACHMENT_ERROR_NOTE_PREFIX} ${attachment.name || 'file'}${ATTACHMENT_ERROR_NOTE_SUFFIX}`;
        }
    }

    return combinedUserTextAndAttachments;
}

export function updateMessageWithProcessedText(
    userMessage: UIMessage,
    combinedText: string,
    originalTypedText: string,
): void {
    if (combinedText !== originalTypedText) {
        const nonTextParts = userMessage.parts.filter(
            (part) => part.type !== 'text',
        );
        userMessage.parts = [
            ...nonTextParts,
            { type: 'text', text: combinedText } as TextUIPart,
        ];
    }
}

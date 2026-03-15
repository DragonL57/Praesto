/**
 * Message attachments rendering component
 * Displays file attachments from message parts
 */

import React from 'react';
import type { Message, FilePart } from '@/lib/ai/types';
import { PreviewAttachment } from '../preview-attachment';

interface MessageAttachmentsProps {
  message: Message;
}

/**
 * Renders file attachments from message parts
 */
export const MessageAttachments: React.FC<MessageAttachmentsProps> = ({ message }) => {
  const fileParts = message.parts.filter(
    (part) => part.type === 'file',
  ) as FilePart[];

  if (fileParts.length === 0) return null;

  return (
    <div
      data-testid="message-attachments"
      className="flex gap-2 flex-wrap items-start overflow-x-auto w-full"
      style={{
        flexFlow: 'row wrap',
        rowGap: '0.5rem',
        maxWidth: '100%',
      }}
    >
      {fileParts.map((filePart) => (
        <PreviewAttachment
          key={filePart.url}
          attachment={{
            url: filePart.url,
            contentType: filePart.contentType,
            name: filePart.filename || filePart.url.split('/').pop() || 'file',
          }}
        />
      ))}
    </div>
  );
};

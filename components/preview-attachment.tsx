import type { Attachment } from 'ai';

import { LoaderIcon } from './icons';
import { Button } from './ui/button';
import { X } from 'lucide-react';

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  onRemove,
}: {
  attachment: Attachment;
  isUploading?: boolean;
  onRemove?: () => void;
}) => {
  const { name, url, contentType } = attachment;

  return (
    <div data-testid="input-attachment-preview" className="flex flex-col gap-2">
      <div className="size-16 aspect-square rounded-md relative flex flex-col items-center justify-center">
        {contentType ? (
          contentType.startsWith('image') ? (
            // NOTE: it is recommended to use next/image for images
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={name ?? 'An image attachment'}
              className="rounded-md size-full object-cover"
            />
          ) : (
            <div className="bg-muted size-full rounded-md" />
          )
        ) : (
          <div className="bg-muted size-full rounded-md" />
        )}

        {isUploading && (
          <div
            data-testid="input-attachment-loader"
            className="animate-spin absolute text-zinc-500"
          >
            <LoaderIcon />
          </div>
        )}
        
        {!isUploading && onRemove && (
          <div className="absolute top-1 right-1 z-30">
            <Button
              data-testid="remove-attachment-button"
              className="size-4 p-0 rounded-full flex items-center justify-center bg-zinc-800 dark:bg-white"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
              }}
              style={{ 
                boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.1)'
              }}
              aria-label="Remove attachment"
            >
              <X size={10} className="text-white dark:text-zinc-800" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

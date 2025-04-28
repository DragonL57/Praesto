import { useState } from 'react';
import type { Attachment } from 'ai';

import { LoaderIcon } from './icons';
import { Button } from './ui/button';
import { X } from 'lucide-react';
import { ImagePreviewModal } from './image-preview-modal';

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
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleImageClick = () => {
    if (contentType?.startsWith('image') && url) {
      setIsPreviewOpen(true);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleImageClick();
    }
  };

  return (
    <div data-testid="input-attachment-preview" className="flex flex-col gap-2">
      <div className="size-16 aspect-square rounded-md relative flex flex-col items-center justify-center">
        {contentType ? (
          contentType.startsWith('image') ? (
            <div 
              role="button"
              tabIndex={0}
              onClick={handleImageClick}
              onKeyDown={handleKeyDown}
              className="size-full rounded-md cursor-pointer"
              aria-label={name ? `Preview ${name}` : 'Preview image'}
            >
              {/* NOTE: it is recommended to use next/image for images */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={url}
                src={url}
                alt={name ?? 'An image attachment'}
                className="rounded-md size-full object-cover"
              />
            </div>
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

        {/* Image Preview Modal */}
        {contentType?.startsWith('image') && url && (
          <ImagePreviewModal
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            imageUrl={url}
            alt={name || 'Image preview'}
          />
        )}
      </div>
    </div>
  );
};

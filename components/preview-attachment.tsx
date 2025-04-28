import { useState } from 'react';
import type { Attachment } from 'ai';

import { LoaderIcon } from './icons';
import { Button } from './ui/button';
import { X, FileText, File, FileSpreadsheet, FileImage, Presentation } from 'lucide-react';
import { ImagePreviewModal } from './image-preview-modal';
import { DocumentPreviewModal } from './document-preview-modal';

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

  const handleAttachmentClick = () => {
    if (url && contentType) {
      if (contentType.startsWith('image')) {
        setIsPreviewOpen(true);
      } else if (
        contentType === 'application/pdf' ||
        contentType === 'text/plain' ||
        contentType === 'text/csv'
      ) {
        // Open preview for supported document types
        setIsPreviewOpen(true);
      } else {
        // For other file types, open the link in a new tab
        window.open(url, '_blank');
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleAttachmentClick();
    }
  };

  // Function to determine which icon to display based on file type
  const getFileIcon = () => {
    if (!contentType) return <File size={24} className="text-zinc-500" />;
    
    if (contentType.startsWith('image')) {
      return <FileImage size={24} className="text-blue-500" />;
    } else if (contentType === 'application/pdf') {
      return <FileText size={24} className="text-red-500" />;
    } else if (
      contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      contentType === 'application/msword' ||
      contentType === 'text/plain'
    ) {
      return <FileText size={24} className="text-blue-500" />;
    } else if (
      contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      contentType === 'application/vnd.ms-excel' ||
      contentType === 'text/csv'
    ) {
      return <FileSpreadsheet size={24} className="text-green-500" />;
    } else if (
      contentType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      contentType === 'application/vnd.ms-powerpoint'
    ) {
      return <Presentation size={24} className="text-orange-500" />;
    } else {
      return <File size={24} className="text-zinc-500" />;
    }
  };

  // Function to get a friendly file name with truncation
  const getDisplayName = () => {
    if (!name) return "Unknown file";
    if (name.length <= 15) return name;
    const extension = name.split('.').pop();
    const baseName = name.split('.').slice(0, -1).join('.');
    return `${baseName.substring(0, 10)}...${extension ? `.${extension}` : ''}`;
  };

  return (
    <div data-testid="input-attachment-preview" className="flex flex-col gap-2">
      <div className="size-16 aspect-square rounded-md relative flex flex-col items-center justify-center">
        {contentType ? (
          contentType.startsWith('image') ? (
            <div 
              role="button"
              tabIndex={0}
              onClick={handleAttachmentClick}
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
            <div 
              role="button"
              tabIndex={0}
              onClick={handleAttachmentClick}
              onKeyDown={handleKeyDown}
              className="size-full rounded-md cursor-pointer bg-muted dark:bg-zinc-800 flex flex-col items-center justify-center p-1"
              aria-label={name ? `Open ${name}` : 'Open document'}
            >
              {getFileIcon()}
              <span className="text-[8px] mt-1 text-center overflow-hidden text-ellipsis max-w-full px-0.5">
                {getDisplayName()}
              </span>
            </div>
          )
        ) : (
          <div className="bg-muted dark:bg-zinc-800 size-full rounded-md flex items-center justify-center">
            <File size={24} className="text-zinc-500" />
          </div>
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

        {/* Document Preview Modal */}
        {contentType && !contentType.startsWith('image') && url && (
          <DocumentPreviewModal 
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            fileUrl={url}
            fileName={name || 'Document'}
            fileType={contentType}
          />
        )}
      </div>
    </div>
  );
};

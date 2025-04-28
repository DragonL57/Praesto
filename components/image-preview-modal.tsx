'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogTitle,
} from './ui/dialog';

// VisuallyHidden component for accessibility
const VisuallyHidden = ({
  children
}: {
  children: React.ReactNode
}) => {
  return (
    <span
      className="absolute size-px -m-px overflow-hidden clip-[rect(0,_0,_0,_0)] whitespace-nowrap border-0"
    >
      {children}
    </span>
  )
}

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  alt?: string;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  alt = 'Image preview'
}) => {
  // Handle ESC key press
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogOverlay className="backdrop-blur-sm" />
      <DialogContent className="p-0 border-0 max-w-7xl w-[90vw] max-h-[90vh] overflow-auto bg-transparent">
        {/* Add DialogTitle with VisuallyHidden for accessibility */}
        <DialogTitle asChild>
          <VisuallyHidden>Image Preview</VisuallyHidden>
        </DialogTitle>
        
        {/* Add DialogDescription with VisuallyHidden for accessibility */}
        <DialogDescription asChild>
          <VisuallyHidden>
            {alt || 'Image in fullscreen view. Press Escape to close.'}
          </VisuallyHidden>
        </DialogDescription>
        
        <div className="relative flex items-center justify-center size-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={imageUrl} 
            alt={alt} 
            className="max-w-full max-h-[90vh] object-contain" 
          />
          <Button
            onClick={onClose}
            className="absolute top-2 right-2 size-8 p-0 rounded-full bg-zinc-800/70 hover:bg-zinc-700/90 dark:bg-white/70 dark:hover:bg-white/90 flex items-center justify-center z-50"
            aria-label="Close preview"
          >
            <X size={16} className="text-white dark:text-zinc-800" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
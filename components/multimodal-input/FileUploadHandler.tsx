'use client';

import { useCallback, RefObject } from 'react';
import { toast } from 'sonner';
import type { Attachment } from 'ai';
import { uploadFile } from './utils';

interface FileUploadHandlerProps {
  setAttachments: React.Dispatch<React.SetStateAction<Array<Attachment>>>;
  setUploadQueue: React.Dispatch<React.SetStateAction<Array<string>>>;
  status: string;
}

/**
 * Component that provides file upload handling functions
 */
export function useFileUploadHandler({
  setAttachments,
  setUploadQueue,
  status
}: FileUploadHandlerProps) {
  // Handle file input change
  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined,
        ) as Attachment[];

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error('Error uploading files!', error);
        toast.error('Failed to upload files, please try again!');
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments, setUploadQueue],
  );

  // Handle paste events for images
  const handlePaste = useCallback(
    async (event: React.ClipboardEvent) => {
      if (status !== 'ready') return;

      const items = event.clipboardData?.items;
      if (!items) return;

      const imageItems = Array.from(items).filter((item) =>
        item.type.startsWith('image/'),
      );

      if (imageItems.length === 0) return;

      // Prevent default paste behavior for images
      event.preventDefault();

      const imageFiles: File[] = [];

      for (const item of imageItems) {
        const file = item.getAsFile();
        if (file) {
          const timestamp = new Date().getTime();
          // Create a new file with a simple timestamp as the filename
          const renamedFile = new File(
            [file],
            `${timestamp}.${file.type.split('/')[1] || 'png'}`,
            { type: file.type },
          );
          imageFiles.push(renamedFile);
        }
      }

      if (imageFiles.length === 0) return;

      setUploadQueue(imageFiles.map((file) => file.name));

      try {
        const uploadPromises = imageFiles.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined,
        ) as Attachment[];

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error('Error uploading pasted images!', error);
        toast.error('Failed to upload pasted image, please try again!');
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments, setUploadQueue, status],
  );

  // Create function to trigger file input dialog
  const triggerFileUpload = useCallback((fileInputRef: RefObject<HTMLInputElement>) => {
    fileInputRef.current?.click();
  }, []);

  return {
    handleFileChange,
    handlePaste,
    triggerFileUpload
  };
}
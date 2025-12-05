'use client';

import { useCallback, type RefObject } from 'react';
import { toast } from 'sonner';
import type { Attachment } from 'ai';
import { uploadFile } from './utils';

interface FileUploadHandlerProps {
  setAttachments: React.Dispatch<React.SetStateAction<Array<Attachment>>>;
  setUploadQueue: React.Dispatch<React.SetStateAction<Array<string>>>;
  status: string;
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB (aligned with server-side token config)

/**
 * Component that provides file upload handling functions
 */
export function useFileUploadHandler({
  setAttachments,
  setUploadQueue,
  status,
}: FileUploadHandlerProps) {
  // Handle file input change
  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files || []);

      const validFiles = selectedFiles.filter((file) => {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          toast.error(
            `File "${file.name}" is too large. Max size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`,
          );
          return false;
        }
        return true;
      });

      if (validFiles.length === 0 && selectedFiles.length > 0) {
        // All files were too large, or no files selected initially
        if (event.target) event.target.value = ''; // Clear the file input
        setUploadQueue([]); // Ensure queue is cleared if all were invalid
        return;
      }

      if (validFiles.length < selectedFiles.length) {
        // Some files were filtered out, inform the user if needed or just proceed with valid ones
        // toast.info("Some files were too large and have been excluded.");
      }

      setUploadQueue(validFiles.map((file) => file.name));

      if (validFiles.length === 0) {
        if (event.target) event.target.value = ''; // Clear the file input
        return; // No files to upload
      }

      try {
        const uploadPromises = validFiles.map((file) => uploadFile(file));
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
        if (event.target) event.target.value = ''; // Clear the file input after processing
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
      event.preventDefault();

      const imageFiles: File[] = [];
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (file) {
          if (file.size > MAX_FILE_SIZE_BYTES) {
            toast.error(
              `Pasted image "${file.name}" is too large. Max size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`,
            );
            continue; // Skip this file
          }
          const timestamp = new Date().getTime();
          const renamedFile = new File(
            [file],
            `${timestamp}.${file.type.split('/')[1] || 'png'}`,
            { type: file.type },
          );
          imageFiles.push(renamedFile);
        }
      }

      if (imageFiles.length === 0) {
        return; // No valid files to upload
      }

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
  const triggerFileUpload = useCallback(
    (fileInputRef: RefObject<HTMLInputElement | null>) => {
      fileInputRef.current?.click();
    },
    [],
  );

  return {
    handleFileChange,
    handlePaste,
    triggerFileUpload,
  };
}

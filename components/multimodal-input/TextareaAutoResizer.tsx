'use client';

import { useEffect, type RefObject, useCallback } from 'react';

interface TextareaAutoResizerProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  maxHeight?: number;
  onHeightChange?: (rows: number) => void;
  isMobile?: boolean;
  width?: number;
}

/**
 * Component that handles auto-resizing textarea based on content
 */
export function TextareaAutoResizer({
  textareaRef,
  value,
  maxHeight = 200,
  onHeightChange,
  isMobile = false,
  width,
}: TextareaAutoResizerProps) {
  // Define adjustHeight with useCallback to avoid recreation on each render
  const adjustHeight = useCallback(() => {
    if (!textareaRef.current) return;

    // Reset height to auto to get the correct scrollHeight
    textareaRef.current.style.height = 'auto';

    // Set height based on content but cap at maxHeight
    const newHeight = Math.min(textareaRef.current.scrollHeight, maxHeight);
    textareaRef.current.style.height = `${newHeight}px`;

    // If content is larger than maxHeight, ensure scrollbar is visible
    textareaRef.current.style.overflowY =
      textareaRef.current.scrollHeight > maxHeight ? 'auto' : 'hidden';
    // We intentionally omit textareaRef from deps as it's a stable ref object
    // and including it would cause unnecessary re-creation of this function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxHeight]);

  // Initial setup and auto-focus on desktop
  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();

      // Only focus on desktop, not on mobile
      if (!isMobile && width && width >= 768) {
        textareaRef.current.focus();
      }
    }
    // We don't include textareaRef in deps as it's a stable ref object
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile, width, adjustHeight]);

  // Update height when value changes
  useEffect(() => {
    if (textareaRef.current) {
      adjustHeight();

      // Calculate visual row count for styling purposes
      const style = window.getComputedStyle(textareaRef.current);
      const lineHeight = Number.parseFloat(style.lineHeight);
      const rows = Math.max(
        1,
        Math.floor(textareaRef.current.scrollHeight / lineHeight),
      );

      if (onHeightChange) {
        onHeightChange(rows);
      }
    }
    // We don't include textareaRef in deps as it's a stable ref object
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, onHeightChange, adjustHeight]);

  // This component doesn't render anything, it just sets up event listeners
  return null;
}

/**
 * Reset the height of a textarea
 * Useful when clearing the textarea content
 */
export function resetTextareaHeight(
  textareaRef: RefObject<HTMLTextAreaElement | null>,
) {
  if (!textareaRef.current) return;

  // First set height to auto to reset any previous height
  textareaRef.current.style.height = 'auto';

  // Use setTimeout to ensure this executes after React has updated the DOM with empty content
  setTimeout(() => {
    if (textareaRef.current) {
      // At this point, the textarea should be empty, so its scrollHeight will be minimal
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      textareaRef.current.style.overflowY = 'hidden';
    }
  }, 0);
}

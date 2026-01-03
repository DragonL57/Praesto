'use client';

import { useEffect } from 'react';
import { useWindowSize } from 'usehooks-ts';

interface VirtualKeyboardHandlerProps {
  isMobile: boolean;
}

/**
 * Component that handles virtual keyboard detection and viewport adjustments
 * This helps ensure proper layout when the virtual keyboard is shown on mobile devices
 */
export function VirtualKeyboardHandler({
  isMobile,
}: VirtualKeyboardHandlerProps) {
  const { width } = useWindowSize();

  useEffect(() => {
    if (!isMobile) return;

    let keyboardHeight = 0;
    const handleVirtualKeyboardResize = () => {
      if (navigator.virtualKeyboard?.boundingRect) {
        const { height: kbHeight } = navigator.virtualKeyboard.boundingRect;
        keyboardHeight = kbHeight;

        // Set custom properties for keyboard height and visibility
        document.documentElement.style.setProperty(
          '--keyboard-height',
          `${keyboardHeight}px`,
        );
        document.documentElement.style.setProperty(
          '--keyboard-visible',
          keyboardHeight > 0 ? '1' : '0',
        );

        // Add a class to the body for CSS targeting when keyboard is visible
        if (keyboardHeight > 0) {
          document.body.classList.add('keyboard-visible');
        } else {
          document.body.classList.remove('keyboard-visible');
        }
      }
    };

    // Check if the VirtualKeyboard API is available
    if ('virtualKeyboard' in navigator && navigator.virtualKeyboard) {
      try {
        // Opt out of the automatic virtual keyboard behavior
        // This allows us to use CSS env vars to handle layout adjustments
        navigator.virtualKeyboard.overlaysContent = true;

        // Listen for keyboard resize events
        navigator.virtualKeyboard.addEventListener(
          'geometrychange',
          handleVirtualKeyboardResize,
        );

        console.log('VirtualKeyboard API enabled with overlaysContent=true');
      } catch (error) {
        console.warn('Failed to initialize VirtualKeyboard API:', error);
      }
    }

    // Fallback for devices without VirtualKeyboard API
    const handleResize = () => {
      // Only apply on mobile
      if (width < 768) {
        const visualViewport = window.visualViewport;
        if (!visualViewport) return;

        // Detect keyboard by comparing visual viewport to window inner height
        const newKeyboardHeight = Math.max(
          0,
          window.innerHeight - visualViewport.height,
        );

        // If keyboard height changed significantly, update it
        if (Math.abs(newKeyboardHeight - keyboardHeight) > 50) {
          keyboardHeight = newKeyboardHeight;

          // Set custom properties for keyboard height and visibility
          document.documentElement.style.setProperty(
            '--keyboard-height',
            `${keyboardHeight}px`,
          );
          document.documentElement.style.setProperty(
            '--keyboard-visible',
            keyboardHeight > 0 ? '1' : '0',
          );

          // Update viewport positioning based on visual viewport
          if (visualViewport) {
            document.documentElement.style.setProperty(
              '--viewport-offset-y',
              `${visualViewport.offsetTop}px`,
            );
          }

          // Add a class to the body for CSS targeting when keyboard is visible
          if (keyboardHeight > 0) {
            document.body.classList.add('keyboard-visible');
          } else {
            document.body.classList.remove('keyboard-visible');
          }
        }
      }
    };

    // Add CSS to document head for keyboard inset variables fallback
    const style = document.createElement('style');
    style.innerHTML = `
      @supports (padding-bottom: env(keyboard-inset-height)) {
        body.keyboard-visible .input-container {
          padding-bottom: env(keyboard-inset-height, var(--keyboard-height)) !important;
          transition: padding-bottom 0.2s ease-out;
        }
      }
    `;
    document.head.appendChild(style);

    window.visualViewport?.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('scroll', handleResize);

    return () => {
      if (navigator.virtualKeyboard) {
        navigator.virtualKeyboard.removeEventListener(
          'geometrychange',
          handleVirtualKeyboardResize,
        );
      }
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
      document.head.removeChild(style);
    };
  }, [isMobile, width]);

  // This component doesn't render anything, it just sets up event listeners
  return null;
}

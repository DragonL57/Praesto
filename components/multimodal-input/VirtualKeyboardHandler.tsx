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
export function VirtualKeyboardHandler({ isMobile }: VirtualKeyboardHandlerProps) {
  const { width } = useWindowSize();

  useEffect(() => {
    if (!isMobile) return;

    let keyboardHeight = 0;
    const handleVirtualKeyboardResize = () => {
      if (navigator.virtualKeyboard && navigator.virtualKeyboard.boundingRect) {
        const { height: kbHeight } = navigator.virtualKeyboard.boundingRect;
        keyboardHeight = kbHeight;
        
        document.documentElement.style.setProperty(
          '--keyboard-height', 
          `${keyboardHeight}px`
        );
      }
    };

    // Check if the VirtualKeyboard API is available
    if ('virtualKeyboard' in navigator && navigator.virtualKeyboard) {
      try {
        // Opt out of the automatic virtual keyboard behavior
        // This allows us to use CSS env vars to handle layout adjustments
        navigator.virtualKeyboard.overlaysContent = true;
        
        // Listen for keyboard resize events
        navigator.virtualKeyboard.addEventListener('geometrychange', handleVirtualKeyboardResize);
        
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
        const newKeyboardHeight = Math.max(0, window.innerHeight - visualViewport.height);
        
        // If keyboard height changed significantly, update it
        if (Math.abs(newKeyboardHeight - keyboardHeight) > 50) {
          keyboardHeight = newKeyboardHeight;
          document.documentElement.style.setProperty(
            '--keyboard-height', 
            `${keyboardHeight}px`
          );
        }
      }
    };
    
    window.visualViewport?.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('scroll', handleResize);
    
    return () => {
      if (navigator.virtualKeyboard) {
        navigator.virtualKeyboard.removeEventListener('geometrychange', handleVirtualKeyboardResize);
      }
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, [isMobile, width]);

  // This component doesn't render anything, it just sets up event listeners
  return null;
}
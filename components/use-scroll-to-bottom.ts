import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';

// Modify the return type to be more specific about what we're returning
export function useScrollToBottom<T extends HTMLElement>(): [
  MutableRefObject<T | null>,
  MutableRefObject<T | null>,
  () => void // Added manual scroll function
] {
  const containerRef = useRef<T>(null);
  const endRef = useRef<T>(null);
  // Add a ref to track if we should auto-scroll
  const shouldAutoScrollRef = useRef(true);
  // Use a debounce timer to avoid excessive scrolling
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Implement a manual scroll function
  const scrollToBottom = useCallback(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      // Re-enable auto-scrolling when manually scrolled to bottom
      shouldAutoScrollRef.current = true;
    }
  }, []);

  // Watch for user scroll events to determine if they've scrolled up
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // If user has scrolled up, disable auto-scrolling
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      
      // Consider them at the bottom if within 100px (to account for slight differences)
      shouldAutoScrollRef.current = distanceFromBottom <= 100;
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Setup the mutation observer for content changes
  useEffect(() => {
    const container = containerRef.current;
    const end = endRef.current;

    if (container && end) {
      const observer = new MutationObserver((mutations) => {
        // Only scroll automatically if we should be auto-scrolling
        if (!shouldAutoScrollRef.current) return;
        
        // Check if the mutations are actually adding content
        const hasNewContent = mutations.some(mutation => 
          (mutation.type === 'childList' && mutation.addedNodes.length > 0) ||
          (mutation.type === 'characterData')
        );

        if (!hasNewContent) return;
        
        // Debounce scrolling to avoid multiple unnecessary scrolls
        if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
        
        scrollTimerRef.current = setTimeout(() => {
          end.scrollIntoView({ behavior: 'instant', block: 'end' });
          scrollTimerRef.current = null;
        }, 50);
      });

      // Be more selective about observed changes
      observer.observe(container, {
        childList: true,
        subtree: true,
        characterData: true,
        // Don't observe all attribute changes, they often don't affect layout
        attributes: false,
      });

      return () => {
        if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
        observer.disconnect();
      };
    }
  }, []);

  return [containerRef, endRef, scrollToBottom];
}

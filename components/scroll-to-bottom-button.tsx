'use client';

import { Button } from './ui/button';
import { memo, useEffect, useRef, useState, useCallback } from 'react';
import { LuArrowDownToLine } from "react-icons/lu";

interface ScrollToBottomButtonProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  endRef: React.RefObject<HTMLDivElement | null>;
}

function PureScrollToBottomButton({
  containerRef,
  endRef,
}: ScrollToBottomButtonProps) {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [shouldRender, setShouldRender] = useState<boolean>(false);
  // Track whether the button is currently being pressed/clicked
  const isClickingRef = useRef(false);

  // Store the checkIfShouldShowButton function in a ref to avoid recreating it on every render
  const checkIfShouldShowButtonRef = useRef<() => void>(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check if we're not at the bottom
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // Show button if we're more than 200px from bottom
    setIsVisible(distanceFromBottom > 200);
  });

  // Use a stable reference to the current checkIfShouldShowButton function
  useEffect(() => {
    // Update the ref to capture fresh closure values
    checkIfShouldShowButtonRef.current = () => {
      // Don't update visibility while the button is being clicked
      if (isClickingRef.current) return;
      
      const container = containerRef.current;
      if (!container) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      setIsVisible(distanceFromBottom > 200);
    };
  });

  // Set up and clean up the scroll event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Initial check
    checkIfShouldShowButtonRef.current();

    // Use the function from the ref to ensure we're always using the latest version
    const handleScroll = () => {
      // Skip scroll handling during click to prevent re-render cycle
      if (isClickingRef.current) return;
      checkIfShouldShowButtonRef.current();
    };
    
    // Set up scroll listener with passive option for better performance
    container.addEventListener('scroll', handleScroll, { passive: true });

    // Cleanup
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, []); // Empty dependency array as we use refs for fresh values

  // Control rendering based on visibility for fade in/out effect
  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300); // Match this to the transition duration

      return () => clearTimeout(timer);
    }
  }, [isVisible]); // Only depend on isVisible

  // Prevent default behavior and use a more controlled scroll
  const scrollToBottom = useCallback((e: React.MouseEvent) => {
    // Prevent any default behavior
    e.preventDefault();
    e.stopPropagation();
    
    // Set flag to avoid scroll events during the click action
    isClickingRef.current = true;
    
    // Use requestAnimationFrame for smoother scroll handling
    requestAnimationFrame(() => {
      if (endRef.current) {
        // Use smooth scrolling for better UX
        endRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end',
          inline: 'nearest'
        });
        
        // Reset the flag after scrolling completes (approximately)
        setTimeout(() => {
          isClickingRef.current = false;
        }, 100);
      } else {
        isClickingRef.current = false;
      }
    });
  }, [endRef]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div className="fixed w-full max-w-3xl left-1/2 -translate-x-1/2 bottom-[70px] md:bottom-[86px] z-50 flex justify-center items-center px-4 pointer-events-none">
      <Button
        onClick={scrollToBottom}
        className={`rounded-full shadow-lg bg-muted-foreground/70 hover:bg-muted-foreground transition-all duration-300 size-10 p-0 pointer-events-auto ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
        size="icon"
        aria-label="Scroll to bottom"
      >
        <LuArrowDownToLine size={20} className="text-muted" />
      </Button>
    </div>
  );
}

export const ScrollToBottomButton = memo(PureScrollToBottomButton);

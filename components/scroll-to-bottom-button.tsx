'use client';

import { Button } from './ui/button';
import { memo, useEffect, useState } from 'react';
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const checkIfShouldShowButton = () => {
      if (!container) return;

      // Check if we're not at the bottom
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // Show button if we're more than 200px from bottom
      setIsVisible(distanceFromBottom > 200);
    };

    // Initial check
    checkIfShouldShowButton();

    // Set up scroll listener
    container.addEventListener('scroll', checkIfShouldShowButton);

    // Cleanup
    return () => {
      container.removeEventListener('scroll', checkIfShouldShowButton);
    };
  }, [containerRef]);

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
  }, [isVisible]);

  const scrollToBottom = () => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <div className="fixed w-full max-w-3xl left-1/2 -translate-x-1/2 bottom-[70px] md:bottom-[86px] z-50 flex justify-center items-center px-4">
      <Button
        onClick={scrollToBottom}
        className={`rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-all duration-300 size-10 p-0 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
        size="icon"
        aria-label="Scroll to bottom"
      >
        <LuArrowDownToLine size={20} className="text-primary-foreground" />
      </Button>
    </div>
  );
}

export const ScrollToBottomButton = memo(PureScrollToBottomButton);

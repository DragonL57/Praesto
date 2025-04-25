'use client';

import { Button } from './ui/button';
import { ArrowUpIcon } from './icons';
import { memo, useEffect, useState } from 'react';

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
    <Button
      onClick={scrollToBottom}
      className={`fixed bottom-20 right-10 z-50 rounded-full shadow-md hover:shadow-lg transition-all duration-200 w-8 h-8 p-0 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      size="icon"
      aria-label="Scroll to bottom"
    >
      <div className="rotate-180">
        <ArrowUpIcon size={20} />
      </div>
    </Button>
  );
}

export const ScrollToBottomButton = memo(PureScrollToBottomButton);

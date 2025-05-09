'use client';

import React, { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Create the cn function directly in this file to avoid import issues
function cn(...inputs: (string | undefined | null | false | Record<string, boolean>)[]) {
  return twMerge(clsx(inputs));
}

type PageTransitionProps = {
  children: ReactNode;
  className?: string;
};

export function PageTransition({ children, className }: PageTransitionProps) {
  // Check for browser environment to avoid SSR issues
  const isBrowser = typeof window !== 'undefined';
  const [isVisible, setIsVisible] = useState(isBrowser ? false : true);

  useEffect(() => {
    // This only runs on client-side
    if (isBrowser) {
      // Set visible after component mounts for the transition to trigger
      setIsVisible(true);
    }
    return () => {
      if (isBrowser) {
        setIsVisible(false);
      }
    };
  }, [isBrowser]);

  // No transition on server-side rendering
  if (!isBrowser) {
    return (
      <div className={cn("w-full h-full", className)}>
        {children}
      </div>
    );
  }

  return (
    <div className="overflow-hidden w-full h-full">
      <div
        className={cn(
          'w-full h-full transition-opacity duration-200 ease-out',
          isVisible ? 'opacity-100' : 'opacity-0',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

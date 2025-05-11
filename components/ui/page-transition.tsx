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
  const [startTransition, setStartTransition] = useState(false);

  useEffect(() => {
    // Set to true to start transition after initial mount
    // Using requestAnimationFrame to ensure it happens after the browser has painted the initial state
    const animationFrameId = requestAnimationFrame(() => {
      setStartTransition(true);
    });
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Always render the same DOM structure.
  // The initial state (opacity-0) should be consistent between server and client.
  // Then, useEffect will trigger startTransition to true, causing a fade-in.
  return (
    <div className="overflow-hidden w-full h-full">
      <div
        className={cn(
          'w-full h-full transition-opacity duration-200 ease-out',
          startTransition ? 'opacity-100' : 'opacity-0', // Start with opacity-0, then transition to opacity-100
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

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
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Set mounted to true after component mounts
    setMounted(true);
    
    // Set visible on the next frame for the transition
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 10);
    
    return () => {
      clearTimeout(timer);
      setIsVisible(false);
    };
  }, []);

  // SSR render - must match client's initial render
  if (!mounted) {
    return (
      <div className="overflow-hidden w-full h-full">
        <div className="w-full h-full transition-opacity duration-200 ease-out opacity-0">
          {children}
        </div>
      </div>
    );
  }

  // Client-side render with transition
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

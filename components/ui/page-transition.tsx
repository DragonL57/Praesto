'use client';

import React, { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageTransitionProps = {
  children: ReactNode;
  className?: string;
};

export function PageTransition({ children, className }: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Set visible after component mounts for the transition to trigger
    setIsVisible(true);
    return () => setIsVisible(false);
  }, []);

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

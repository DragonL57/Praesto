'use client';

import { memo, useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Markdown } from './markdown';
import { AnimatePresence, motion } from 'framer-motion';

interface ThinkProps {
  thought: string;
  connectPrevious?: boolean;
  connectNext?: boolean;
  inGroup?: boolean;
}

function PureThink({ 
  thought, 
  connectPrevious = false, 
  connectNext = false,
  inGroup = false 
}: ThinkProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Handle click outside to collapse
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "bg-background rounded-xl transition-all duration-300 ease-in-out w-full",
        !inGroup && 'border-[1.5px] border-border',
        connectPrevious ? 'mt-0' : 'mt-0',
        connectNext ? 'mb-0' : 'mb-0'
      )}
    >
      {/* Header */}
      <div 
        className="flex items-center px-4 py-2"
        onClick={toggleExpanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleExpanded();
          }
        }}
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
        style={{ cursor: 'pointer' }}
      >
        <div className="flex items-center gap-3 text-sm grow">
          <div className="relative">
            {/* Connect to previous component when connectPrevious is true */}
            {connectPrevious && (
              <div className="absolute top-[-22px] bottom-0 left-3.5 w-[1.5px] bg-border h-[22px]"></div>
            )}
            <div className="flex items-center justify-center size-7 rounded-full border-[1.5px] border-border bg-background text-muted-foreground z-10 relative">
              <ThinkIcon size={16} />
            </div>
            {/* Connect to next component when connectNext is true */}
            {connectNext && (
              <div className="absolute top-7 bottom-[-22px] left-3.5 w-[1.5px] bg-border"></div>
            )}
            {/* Add vertical line when content is expanded - matches how web-search does it */}
            {isExpanded && (
              <div className="absolute top-7 bottom-0 left-3.5 w-[1.5px] bg-border h-full"></div>
            )}
          </div>
          <div className="text-sm font-medium flex items-center gap-2">
            Structured Thinking
            {isExpanded ? (
              <ChevronUpIcon size={16} className="text-muted-foreground" />
            ) : (
              <ChevronDownIcon size={16} className="text-muted-foreground" />
            )}
          </div>
        </div>
      </div>

      {/* Content - Match the structure from web-search.tsx */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-2 relative">
              {/* Explicit vertical line that connects with the header icon - using the correct 33px value */}
              <div className="absolute w-[1.5px] bg-border h-full" style={{ left: '31.5px' }}></div>
              
              {/* Content container with proper left padding to align with header text */}
              <div className="pl-10 pr-0">
                <div className="text-sm text-muted-foreground">
                  <Markdown baseHeadingLevel={3}>{thought}</Markdown>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const Think = memo(PureThink);

function ThinkIcon({
  size = 16,
  className,
}: { size?: number; className?: string }) {
  return (
    <svg
      height={size}
      width={size}
      viewBox="0 0 24 24"
      className={cn('stroke-current', className)}
      strokeWidth="2"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  );
}

function ChevronUpIcon({
  size = 16,
  className,
}: { size?: number; className?: string }) {
  return (
    <svg
      height={size}
      width={size}
      viewBox="0 0 24 24"
      className={cn('stroke-current', className)}
      strokeWidth="2"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 15l7-7 7 7"
      />
    </svg>
  );
}

function ChevronDownIcon({
  size = 16,
  className,
}: { size?: number; className?: string }) {
  return (
    <svg
      height={size}
      width={size}
      viewBox="0 0 24 24"
      className={cn('stroke-current', className)}
      strokeWidth="2"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}
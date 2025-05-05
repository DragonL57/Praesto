// filepath: /home/long/vercel_chatui/components/think.tsx
'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Markdown } from './markdown';

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
  return (
    <div
      className={cn(
        "bg-background rounded-xl transition-all duration-300 ease-in-out w-full",
        !inGroup && 'border border-border/50', // Only add border if not in a group
        connectPrevious ? 'mt-0' : 'mt-1', // Top margin based on connection
        connectNext ? 'mb-0' : 'mb-1' // Bottom margin based on connection
      )}
    >
      {/* Header */}
      <div className="flex items-center px-4 py-3">
        <div className="flex items-center gap-3 text-sm">
          <div className="relative">
            {/* Connect to previous component when connectPrevious is true */}
            {connectPrevious && (
              <div className="absolute top-[-22px] bottom-0 left-3.5 w-px bg-border/50 h-[22px]"></div>
            )}
            <div className="flex items-center justify-center size-7 rounded-full border border-border/50 bg-background text-muted-foreground z-10 relative">
              <ThinkIcon size={16} />
            </div>
            {/* Connect to next component when connectNext is true */}
            {connectNext && (
              <div className="absolute top-7 bottom-[-22px] left-3.5 w-px bg-border/50"></div>
            )}
          </div>
          <div className="text-sm font-medium">
            Structured Thinking
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-4 pt-0">
        <div className="pl-10"> {/* Aligns with the icon and heading */}
          <div className="text-sm text-muted-foreground border-l-2 border-muted pl-4 py-1">
            <Markdown baseHeadingLevel={3}>{thought}</Markdown>
          </div>
        </div>
      </div>
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
'use client';

import { useRef, memo } from 'react';
import { cn } from '@/lib/utils';

interface WebsiteContentProps {
  url: string;
  content: string;
  query?: string | null;
  status: 'success' | 'error' | 'loading';
  error?: string;
  source?: string; // Add source field to track if content came from fallback
  fallbackError?: string; // Add fallbackError field to track any errors from fallback
  connectPrevious?: boolean; // Add prop to indicate if this should connect to the previous component
  connectNext?: boolean; // Add prop to indicate if this should connect to the next component
  inGroup?: boolean; // Add prop to indicate if this is part of a group
}

function PureWebsiteContent({
  url,
  content: _content,
  query,
  status: _status,
  error: _error,
  source,
  fallbackError: _fallbackError,
  connectPrevious = false,
  connectNext = false,
  inGroup = false,
}: WebsiteContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Format the URL for display
  const getFormattedUrl = (url: string) => {
    return url.startsWith('http') ? url : `https://${url}`;
  };

  // Get domain name from URL for display
  const getDomainName = (url: string) => {
    try {
      const domain = new URL(getFormattedUrl(url)).hostname;
      return domain;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      return url;
    }
  };

  // Get appropriate label for the content source
  const _getSourceLabel = () => {
    if (source === 'serper-dev-primary') {
      return 'Enhanced extraction';
    } else if (source === 'serper-dev-fallback') {
      return 'Fallback extraction';
    } else if (source === 'fallback-scraper') {
      return 'Enhanced scraping';
    } else if (source === 'direct') {
      return 'Direct extraction';
    }
    return null;
  };

  return (
    <div
      ref={contentRef}
      className={cn(
        "bg-background rounded-xl transition-all duration-300 ease-in-out w-full",
        !inGroup && 'border-[1.5px] border-border', // Removed /50 opacity to increase contrast
        connectPrevious ? 'mt-0' : 'mt-0', // Set to mt-0 for tight integration
        connectNext ? 'mb-0' : 'mb-0' // Set to mb-0 for tight integration
      )}
    >
      {/* Header - Always visible */}
      <div className="flex items-center px-4 py-3">
        <div className="flex items-center gap-3 text-sm">
          <div className="relative">
            {/* Connect to previous component when connectPrevious is true */}
            {connectPrevious && (
              <div className="absolute top-[-22px] bottom-0 left-3.5 w-[1.5px] bg-border h-[22px]"></div>
            )}
            <div className="flex items-center justify-center size-7 rounded-full border-[1.5px] border-border bg-background text-muted-foreground z-10 relative">
              <WebpageIcon size={16} />
            </div>
            {/* Connect to next component when connectNext is true */}
            {connectNext && (
              <div className="absolute top-7 bottom-[-22px] left-3.5 w-[1.5px] bg-border"></div>
            )}
          </div>
          <div className="text-sm font-medium">
            Get context of{" "}
            <a 
              href={getFormattedUrl(url)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              {getDomainName(url)}
            </a>
            {query && <span className="text-xs text-muted-foreground sm:inline-block ml-1">• &quot;{query}&quot;</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export const WebsiteContent = memo(PureWebsiteContent);

function WebpageIcon({
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
        d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"
      />
    </svg>
  );
}



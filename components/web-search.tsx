'use client';

import type React from 'react';
import { useState, useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

interface WebSearchResult {
  title: string;
  href: string; // Changed from url to href to match the tool output
  body: string; // Changed from snippet to body to match the tool output
}

interface WebSearchProps {
  results: WebSearchResult[];
  query: string;
  count: number;
}

// Helper function to safely parse HTML content
const parseHtml = (htmlString: string): string => {
  // First, decode HTML entities consistently on both server and client side
  const decodedString = htmlString
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
    
  // Check if we're in a browser environment
  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    try {
      // Create a temporary DOM element
      const parser = new DOMParser();
      const doc = parser.parseFromString(decodedString, 'text/html');
      return doc.body.textContent || '';
    } catch {
      // Fallback if DOMParser fails
      return decodedString.replace(/<[^>]*>/g, '');
    }
  }
  
  // Fallback for server-side rendering
  return decodedString.replace(/<[^>]*>/g, ''); // Simple regex to strip HTML tags
};

function PureWebSearch({ results, query, count }: WebSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Record<string, boolean>>({});
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Ensure results is an array and each result has the required properties
  const safeResults = Array.isArray(results)
    ? results.filter(
        (result) =>
          result &&
          typeof result === 'object' &&
          result.href !== undefined &&
          result.title &&
          result.body,
      )
    : [];

  const getFormattedUrl = (url: string | undefined) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `https://${url}`;
  };

  const toggleResultExpansion = (resultId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the container's click event
    setExpandedResults((prev) => ({
      ...prev,
      [resultId]: !prev[resultId],
    }));
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Handle click outside to collapse
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (resultsContainerRef.current && !resultsContainerRef.current.contains(event.target as Node)) {
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
      ref={resultsContainerRef}
      className={cn(
        'bg-background border-2 border-border/50 rounded-xl transition-all duration-300 ease-in-out mb-2 w-full',
        isExpanded ? '' : 'cursor-pointer'
      )}
      onClick={!isExpanded ? toggleExpanded : undefined}
      onKeyDown={!isExpanded ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleExpanded();
        }
      } : undefined}
      tabIndex={!isExpanded ? 0 : undefined}
      role={!isExpanded ? 'button' : undefined}
      aria-expanded={isExpanded}
    >
      {/* Header - Always visible */}
      <div 
        className={cn('flex items-center justify-between px-4 py-3', isExpanded ? 'border-b border-border/30' : '')}
        onClick={!isExpanded ? toggleExpanded : (e) => {
          e.stopPropagation();
          toggleExpanded();
        }}
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
        <div className="flex items-center gap-2 text-sm">
          <SearchIcon size={14} className="text-muted-foreground" />
          <span className="text-sm">{query}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{count}</span>
          {isExpanded ? (
            <ChevronUpIcon size={14} className="text-muted-foreground" />
          ) : (
            <ChevronRightIcon size={14} className="text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Results - Only visible when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                'flex flex-col',
                safeResults.length > 3 &&
                  'max-h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent',
              )}
            >
              {safeResults.map((result, index) => {
                const resultId = `${result.href}-${result.title}`;
                const isExpanded = expandedResults[resultId];

                return (
                  <div
                    key={resultId}
                    className={cn('py-2.5 px-4', index !== safeResults.length - 1 && 'border-b border-border/30')}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-muted-foreground mt-0.5 w-4 text-right">{index + 1}</span>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <a
                            href={getFormattedUrl(result.href)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium hover:underline line-clamp-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {parseHtml(result.title)}
                          </a>

                          <a
                            href={getFormattedUrl(result.href)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-muted-foreground hover:text-foreground mt-0.5"
                            aria-label="Open in new tab"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLinkIcon size={12} />
                          </a>
                        </div>

                        <a
                          href={getFormattedUrl(result.href)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground truncate block hover:underline mt-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {result.href}
                        </a>

                        {isExpanded && (
                          <p className="text-xs text-foreground/70 mt-1.5">
                            {parseHtml(result.body)}
                          </p>
                        )}

                        <button
                          onClick={(e) => toggleResultExpansion(resultId, e)}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 mt-1"
                          aria-label={isExpanded ? "Hide details" : "Show details"}
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUpIcon size={12} />
                              <span>Less</span>
                            </>
                          ) : (
                            <>
                              <ChevronDownIcon size={12} />
                              <span>More</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const WebSearch = memo(PureWebSearch);

function SearchIcon({
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
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function ExternalLinkIcon({
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
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
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

function ChevronRightIcon({
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
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}

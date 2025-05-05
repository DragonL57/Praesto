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
  connectNext?: boolean; // Add prop to indicate if this should connect to the next component
  inGroup?: boolean; // Add prop to indicate if this is part of a group
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

function PureWebSearch({ results, query, count: _count, connectNext = false, inGroup = false }: WebSearchProps) {
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
        'bg-background rounded-xl transition-all duration-300 ease-in-out w-full',
        !inGroup && 'border-[1.5px] border-border', // Removed /50 opacity to increase contrast
        isExpanded ? '' : 'cursor-pointer',
        connectNext ? 'mb-0' : 'mb-1' // Restore conditional margin, use mb-1 for less space
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
        className="flex items-center px-4 py-2"
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
        <div className="flex items-center gap-3 text-sm grow">
          <div className="relative flex">
            <div className="flex items-center justify-center size-7 rounded-full border-[1.5px] border-border bg-background text-muted-foreground z-10">
              <SearchIcon size={16} />
            </div>
            {isExpanded && safeResults.length > 0 && (
              <div className="absolute top-7 bottom-0 left-3.5 w-[1.5px] bg-border h-full"></div>
            )}
            {/* Add connecting line to the next component when connectNext is true */}
            {connectNext && (
              <div className="absolute top-7 bottom-[-22px] left-3.5 w-[1.5px] bg-border"></div>
            )}
          </div>
          <div className="text-sm font-medium flex items-center gap-2">
            Search for <span className="font-semibold">&quot;{query}&quot;</span>
            {isExpanded ? (
              <ChevronUpIcon size={16} className="text-muted-foreground" />
            ) : (
              <ChevronDownIcon size={16} className="text-muted-foreground" />
            )}
          </div>
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
            <div className="flex flex-col pl-4">
              {safeResults.map((result, index) => {
                const resultId = `${result.href}-${result.title}`;
                const isResultExpanded = expandedResults[resultId];
                const isLastItem = index === safeResults.length - 1;

                return (
                  <div
                    key={resultId}
                    className="relative pb-2 pr-4"
                  >
                    {/* Connecting line */}
                    {!isLastItem && (
                      <div className="absolute left-3.5 inset-y-0 w-[1.5px] bg-border"></div>
                    )}
                    <div className="flex items-start gap-2">
                      <div className="relative">
                        <div className="flex items-center justify-center size-7 rounded-full border-[1.5px] border-border bg-background text-xs text-muted-foreground z-10 relative">
                          {index + 1}
                        </div>
                        <div className="absolute top-3.5 left-0 h-px w-3 bg-border"></div>
                      </div>

                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-sm font-medium line-clamp-1">
                            {parseHtml(result.title)}
                          </span>
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

                        {isResultExpanded && (
                          <p className="text-xs text-foreground/70 mt-1.5">
                            {parseHtml(result.body)}
                          </p>
                        )}

                        <button
                          onClick={(e) => toggleResultExpansion(resultId, e)}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 mt-1"
                          aria-label={isResultExpanded ? "Hide details" : "Show details"}
                        >
                          {isResultExpanded ? (
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

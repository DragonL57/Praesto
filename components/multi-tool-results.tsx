'use client';

import { useState, useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

// Define proper types instead of using 'any'
interface SearchResult {
  href: string;
  title: string;
}

interface WebsearchData {
  results: SearchResult[];
  query: string;
  count: number;
}

interface WebsiteContentData {
  url: string;
  content: string;
  query: string | null;
  status: 'success' | 'error' | 'loading';
  error?: string;
}

type ToolResult = {
  type: 'websearch' | 'websitecontent';
  data: WebsearchData | WebsiteContentData;
  timestamp: number;
};

interface MultiToolResultsProps {
  results: ToolResult[];
}

function PureMultiToolResults({ results }: MultiToolResultsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Count results by type
  const websearchCount = results.filter(r => r.type === 'websearch').length;
  const websiteCount = results.filter(r => r.type === 'websitecontent').length;

  // Get the summary text for the container header
  const getSummaryText = () => {
    const parts = [];
    if (websearchCount > 0) {
      parts.push(`${websearchCount} search${websearchCount > 1 ? 'es' : ''}`);
    }
    if (websiteCount > 0) {
      parts.push(`${websiteCount} website${websiteCount > 1 ? 's' : ''}`);
    }
    return parts.join(', ');
  };

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

  // Get icon and name for result item
  const getItemDetails = (result: ToolResult) => {
    if (result.type === 'websearch') {
      const data = result.data as WebsearchData;
      return {
        icon: <SearchIcon size={14} className="text-muted-foreground" />,
        name: data.query || 'Search',
        count: data.count || 0,
      };
    } else {
      const data = result.data as WebsiteContentData;
      return {
        icon: <WebpageIcon size={14} className="text-muted-foreground" />,
        name: getDomainName(data.url) || 'Website',
        status: data.status,
      };
    }
  };

  // Get domain name from URL for display
  const getDomainName = (url: string) => {
    try {
      const formatted = url.startsWith('http') ? url : `https://${url}`;
      const domain = new URL(formatted).hostname;
      return domain;
    } catch (_error) {
      // Using _error instead of e to follow naming convention for unused variables
      return url;
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'bg-background border-2 border-border/50 rounded-xl transition-all duration-300 ease-in-out mb-2 w-full',
        !isExpanded && 'cursor-pointer',
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
        className={cn('flex items-center justify-between px-4 py-3', 
          isExpanded && 'border-b border-border/30')}
        onClick={(e) => {
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
          <ResearchIcon size={14} className="text-muted-foreground" />
          <span className="text-sm">AI research</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{getSummaryText()}</span>
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
            <div className="flex flex-col gap-1 py-1 max-h-[320px] overflow-y-auto">
              {results.map((result, index) => {
                const { icon, name, count, status } = getItemDetails(result);
                const isItemExpanded = expandedItem === index;
                
                return (
                  <div key={index} className="border-b border-border/20 last:border-0">
                    <div 
                      className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-accent/20 rounded-sm"
                      onClick={() => setExpandedItem(isItemExpanded ? null : index)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setExpandedItem(isItemExpanded ? null : index);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-expanded={isItemExpanded}
                    >
                      <div className="flex items-center gap-2">
                        {icon}
                        <span className="text-sm truncate max-w-[180px]">{name}</span>
                        {count !== undefined && <span className="text-xs text-muted-foreground">{count} results</span>}
                        {status === 'error' && <AlertCircleIcon size={12} className="text-destructive" />}
                        {status === 'loading' && <LoaderIcon size={12} className="text-muted-foreground animate-spin" />}
                      </div>

                      <div>
                        {isItemExpanded ? (
                          <ChevronUpIcon size={12} className="text-muted-foreground" />
                        ) : (
                          <ChevronDownIcon size={12} className="text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    
                    <AnimatePresence>
                      {isItemExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="px-4 py-2 bg-accent/10"
                        >
                          {result.type === 'websearch' && (
                            <div className="text-xs space-y-2">
                              {(result.data as WebsearchData).results.map((item, i: number) => (
                                <div key={i} className="flex items-start gap-1.5">
                                  <span className="text-muted-foreground mt-0.5 w-4 text-right">{i+1}</span>
                                  <div>
                                    <a 
                                      href={item.href} 
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm font-medium hover:underline line-clamp-1"
                                    >
                                      {item.title}
                                    </a>
                                    <a 
                                      href={item.href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-muted-foreground truncate block hover:underline mt-0.5"
                                    >
                                      {item.href}
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {result.type === 'websitecontent' && (result.data as WebsiteContentData).status === 'success' && (
                            <div className="text-sm max-h-[200px] overflow-y-auto">
                              <div className="flex justify-between items-center mb-2">
                                <a 
                                  href={(result.data as WebsiteContentData).url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-muted-foreground hover:underline flex items-center gap-1"
                                >
                                  <span>Visit website</span>
                                  <ExternalLinkIcon size={10} />
                                </a>
                              </div>
                            </div>
                          )}
                          
                          {result.type === 'websitecontent' && (result.data as WebsiteContentData).status === 'error' && (
                            <div className="text-xs text-destructive">
                              Failed to load content: {(result.data as WebsiteContentData).error}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
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

export const MultiToolResults = memo(PureMultiToolResults);

// Icons
function ResearchIcon({
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
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

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

function AlertCircleIcon({
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
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function LoaderIcon({
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
        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
      />
    </svg>
  );
}
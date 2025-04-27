'use client';

import { useState, useRef, useEffect, memo } from 'react';
import { cn } from '@/lib/utils';
import { Markdown } from './markdown';
import { AnimatePresence, motion } from 'framer-motion';

interface WebsiteContentProps {
  url: string;
  content: string;
  query?: string | null;
  status: 'success' | 'error' | 'loading';
  error?: string;
  source?: string; // Add source field to track if content came from fallback
  fallbackError?: string; // Add fallbackError field to track any errors from fallback
}

function PureWebsiteContent({
  url,
  content,
  query,
  status,
  error,
  source,
  fallbackError,
}: WebsiteContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRawContent, setShowRawContent] = useState(false);
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

  // Filter out image references from content to prevent rendering issues
  const filterImagesFromContent = (content: string): string => {
    if (!content) return '';

    // Remove markdown image syntax: ![alt text](url)
    let filteredContent = content.replace(
      /!\[.*?\]\(.*?\)/g,
      '*[Image removed]*',
    );

    // Remove HTML image tags: <img src="...">
    filteredContent = filteredContent.replace(/<img.*?>/g, '*[Image removed]*');

    // Remove figure elements that might contain images
    filteredContent = filteredContent.replace(
      /<figure.*?>.*?<\/figure>/g,
      '*[Figure removed]*',
    );

    return filteredContent;
  };

  // Determine if the content is likely too complex or dynamic -
  // DISABLED - now always returns false to never block content
  const isDynamicOrComplexSite = () => {
    // Always return false to never block content
    return false;
  };

  // Determine if the content is likely from serper.dev based on general patterns
  const detectSerperContent = () => {
    // If source is explicitly set, use that
    if (
      source === 'serper-dev-primary' ||
      source === 'serper-dev-fallback' ||
      source === 'fallback-scraper'
    ) {
      return true;
    }

    // Look for general patterns in the content that indicate it came from serper.dev
    // If content has proper structure and is from a domain that's typically hard to scrape
    const url_domain = getDomainName(url).toLowerCase();
    const is_difficult_domain =
      url_domain.includes('forum') ||
      url_domain.includes('community') ||
      url_domain.includes('stackoverflow') ||
      url_domain.includes('reddit') ||
      url_domain.includes('github');

    // If content has markdown headers, lists, proper structure, and comes from a difficult domain
    const has_markdown_structure =
      content &&
      (content.includes('# ') ||
        content.includes('## ') ||
        (content.includes('\n- ') && content.includes('\n\n')));

    return (
      is_difficult_domain &&
      has_markdown_structure &&
      content.trim().length > 200
    );
  };

  // Provide guidance based on the site type
  const getSiteSpecificGuidance = () => {
    if (url.includes('forum') || url.includes('discourse')) {
      return 'Forums often use complex JavaScript and may require authentication, making them difficult to scrape.';
    }
    if (
      url.includes('react') ||
      url.includes('vue') ||
      url.includes('angular')
    ) {
      return 'JavaScript framework documentation sites often have dynamic content that can be challenging to extract properly.';
    }
    return 'This website may use dynamic content loading or require authentication, which makes automatic content extraction difficult.';
  };

  // Get appropriate label for the content source
  const getSourceLabel = () => {
    if (source === 'serper-dev-primary') {
      return 'Enhanced extraction';
    } else if (source === 'serper-dev-fallback') {
      return 'Fallback extraction';
    } else if (source === 'fallback-scraper') {
      return 'Enhanced scraping';
    } else if (source === 'direct') {
      return 'Direct extraction';
    }
    return detectSerperContent() ? 'Enhanced extraction' : null;
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Handle click outside to collapse
  useEffect(() => {
    if (!isExpanded) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node)) {
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
      ref={contentRef}
      className={cn(
        'bg-background border-2 border-border/50 rounded-xl transition-all duration-300 ease-in-out mb-2 w-full',
        !isExpanded && status === 'success' && content.trim() && 'cursor-pointer',
      )}
      onClick={!isExpanded && status === 'success' && content.trim() ? toggleExpanded : undefined}
      onKeyDown={
        !isExpanded && status === 'success' && content.trim()
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleExpanded();
              }
            }
          : undefined
      }
      tabIndex={!isExpanded && status === 'success' && content.trim() ? 0 : undefined}
      role={!isExpanded && status === 'success' && content.trim() ? 'button' : undefined}
      aria-expanded={isExpanded}
    >
      {/* Header - Always visible */}
      <div
        className={cn(
          'flex items-center justify-between px-4 py-3',
          isExpanded && status === 'success' && content.trim() && 'border-b border-border/30',
        )}
        onClick={
          status === 'success' && content.trim()
            ? (e) => {
                e.stopPropagation();
                toggleExpanded();
              }
            : undefined
        }
        onKeyDown={
          status === 'success' && content.trim()
            ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleExpanded();
                }
              }
            : undefined
        }
        tabIndex={status === 'success' && content.trim() ? 0 : undefined}
        role={status === 'success' && content.trim() ? 'button' : undefined}
        aria-expanded={isExpanded}
        style={status === 'success' && content.trim() ? { cursor: 'pointer' } : undefined}
      >
        <div className="flex items-center gap-2 text-sm">
          <WebpageIcon size={14} className="text-muted-foreground" />
          <span className="truncate max-w-[180px]">{getDomainName(url)}</span>
          {query && <span className="text-xs text-muted-foreground hidden sm:inline-block">• &quot;{query}&quot;</span>}
        </div>

        <div className="flex items-center gap-2">
          {status === 'loading' ? (
            <LoaderIcon size={14} className="text-muted-foreground animate-spin" />
          ) : status === 'error' ? (
            <AlertCircleIcon size={14} className="text-destructive" />
          ) : (
            <>
              {getSourceLabel() && (
                <span className="text-xs text-muted-foreground hidden sm:inline-block">{getSourceLabel()}</span>
              )}
              {status === 'success' &&
                content.trim() &&
                (isExpanded ? (
                  <ChevronUpIcon size={14} className="text-muted-foreground" />
                ) : (
                  <ChevronDownIcon size={14} className="text-muted-foreground" />
                ))}
            </>
          )}
          <a
            href={getFormattedUrl(url)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
            aria-label={`Visit ${getDomainName(url)} website`}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLinkIcon size={14} />
          </a>
        </div>
      </div>

      {/* Content - Only visible when expanded or in loading/error state */}
      <AnimatePresence>
        {(isExpanded || status === 'loading' || status === 'error') && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {status === 'loading' ? (
              <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <LoaderIcon size={24} className="animate-spin text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Loading content...</p>
              </div>
            ) : status === 'success' && content.trim() && (detectSerperContent() || !isDynamicOrComplexSite()) ? (
              <div className="p-4 text-sm max-h-[320px] overflow-y-auto">
                <Markdown>{filterImagesFromContent(content)}</Markdown>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                <p className="text-sm text-destructive">{error || "Couldn't extract readable content"}</p>

                {fallbackError && (
                  <p className="text-xs text-muted-foreground">
                    Both primary and fallback extraction methods failed
                  </p>
                )}

                <p className="text-xs text-muted-foreground">{getSiteSpecificGuidance()}</p>

                <div className="flex flex-col gap-2 mt-2">
                  <p className="text-xs text-muted-foreground">Try visiting the website directly</p>

                  {content && (
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowRawContent(!showRawContent);
                      }}
                    >
                      {showRawContent ? (
                        <>
                          <ChevronUpIcon size={12} />
                          <span>Hide raw content</span>
                        </>
                      ) : (
                        <>
                          <ChevronDownIcon size={12} />
                          <span>Show raw content</span>
                        </>
                      )}
                    </button>
                  )}

                  {showRawContent && content && (
                    <div className="mt-2 border border-dashed border-border/30 p-3 rounded-md overflow-auto max-h-40 text-xs text-muted-foreground">
                      <pre>{content}</pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
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



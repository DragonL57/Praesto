'use client';

import { cn } from '@/lib/utils';
import { memo, useState } from 'react';
import { Markdown } from './markdown';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Button } from './ui/button';

interface WebsiteContentProps {
  url: string;
  content: string;
  query?: string | null;
  status: 'success' | 'error' | 'loading';
  error?: string;
  source?: string; // Add source field to track if content came from fallback
  fallbackError?: string; // Add fallbackError field to track any errors from fallback
}

function PureWebsiteContent({ url, content, query, status, error, source, fallbackError }: WebsiteContentProps) {
  const [showRawContent, setShowRawContent] = useState(false);

  // Format the URL for display
  const getFormattedUrl = (url: string) => {
    return url.startsWith('http') ? url : `https://${url}`;
  };

  // Get domain name from URL for display
  const getDomainName = (url: string) => {
    try {
      const domain = new URL(getFormattedUrl(url)).hostname;
      return domain;
    } catch (e) {
      return url;
    }
  };

  // Filter out image references from content to prevent rendering issues
  const filterImagesFromContent = (content: string): string => {
    if (!content) return '';
    
    // Remove markdown image syntax: ![alt text](url)
    let filteredContent = content.replace(/!\[.*?\]\(.*?\)/g, '*[Image removed]*');
    
    // Remove HTML image tags: <img src="...">
    filteredContent = filteredContent.replace(/<img.*?>/g, '*[Image removed]*');
    
    // Remove figure elements that might contain images
    filteredContent = filteredContent.replace(/<figure.*?>.*?<\/figure>/g, '*[Figure removed]*');
    
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
    if (source === 'serper-dev-primary' || source === 'serper-dev-fallback' || source === 'fallback-scraper') {
      return true;
    }
    
    // Look for general patterns in the content that indicate it came from serper.dev
    // If content has proper structure and is from a domain that's typically hard to scrape
    const url_domain = getDomainName(url).toLowerCase();
    const is_difficult_domain = url_domain.includes('forum') || 
                               url_domain.includes('community') ||
                               url_domain.includes('stackoverflow') ||
                               url_domain.includes('reddit') ||
                               url_domain.includes('github');
    
    // If content has markdown headers, lists, proper structure, and comes from a difficult domain
    const has_markdown_structure = content && (
      content.includes('# ') || 
      content.includes('## ') ||
      (content.includes('\n- ') && content.includes('\n\n'))
    );
    
    return is_difficult_domain && has_markdown_structure && content.trim().length > 200;
  };

  // Provide guidance based on the site type
  const getSiteSpecificGuidance = () => {
    if (url.includes('forum') || url.includes('discourse')) {
      return "Forums often use complex JavaScript and may require authentication, making them difficult to scrape.";
    }
    if (url.includes('react') || url.includes('vue') || url.includes('angular')) {
      return "JavaScript framework documentation sites often have dynamic content that can be challenging to extract properly.";
    }
    return "This website may use dynamic content loading or require authentication, which makes automatic content extraction difficult.";
  };

  // Get appropriate label for the content source
  const getSourceLabel = () => {
    if (source === 'serper-dev-primary') {
      return "Content extracted using serper.dev as primary method";
    } else if (source === 'serper-dev-fallback') {
      return "Content extracted using serper.dev as fallback method";
    } else if (source === 'fallback-scraper') {
      return "Content extracted using enhanced scraping technology";
    } else if (source === 'direct') {
      return "Content extracted directly from the website";
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-4 w-full bg-background border rounded-xl p-4 mb-2">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center text-sm text-muted-foreground">
          <WebpageIcon size={16} />
          <span>Content from <span className="font-medium">{getDomainName(url)}</span></span>
          {query && <span className="text-xs text-muted-foreground"> • Search: &quot;{query}&quot;</span>}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={getFormattedUrl(url)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex size-6 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label={`Visit ${getDomainName(url)} website`}
              >
                <ExternalLinkIcon size={14} />
              </a>
            </TooltipTrigger>
            <TooltipContent>Visit website</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {status === 'loading' ? (
        <div className="flex flex-col w-full space-y-4">
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full size-8 border-y-2 border-primary"></div>
          </div>
          
          <div className="space-y-3 border p-4 rounded-md bg-muted/30">
            {/* Simple placeholder lines instead of Skeleton component */}
            <div className="h-4 w-3/4 bg-muted rounded"></div>
            <div className="h-4 w-full bg-muted rounded"></div>
            <div className="h-4 w-5/6 bg-muted rounded"></div>
            <div className="h-4 w-full bg-muted rounded"></div>
            <div className="h-4 w-4/5 bg-muted rounded"></div>
            <div className="h-4 w-3/4 bg-muted rounded"></div>
          </div>
          
          <p className="text-sm text-center text-muted-foreground">Loading content from {getDomainName(url)}...</p>
        </div>
      ) : status === 'success' && content.trim() && (detectSerperContent() || !isDynamicOrComplexSite()) ? (
        // Show content if we have valid content from any scraper or it's not a complex site
        <div className="text-sm overflow-auto max-h-60 border p-4 rounded-md bg-muted/30">
          {detectSerperContent() && !getSourceLabel() && (
            <div className="mb-3 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <InfoIcon size={14} />
              <span>Content extracted using enhanced scraping technology</span>
            </div>
          )}
          {getSourceLabel() && (
            <div className={cn(
              "mb-3 text-xs flex items-center gap-1", 
              source === 'direct' ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
            )}>
              <InfoIcon size={14} />
              <span>{getSourceLabel()}</span>
            </div>
          )}
          <Markdown>{filterImagesFromContent(content)}</Markdown>
        </div>
      ) : (
        // Show error state
        <div className="flex flex-col gap-4 text-sm overflow-auto max-h-60 border p-4 rounded-md bg-muted/30">
          <div className="text-destructive font-medium">
            {error || "Couldn't extract readable content from this website"}
          </div>
          
          {fallbackError ? (
            <div className="text-amber-600 dark:text-amber-400 text-sm">
              <p>Both primary extraction and fallback methods failed:</p>
              <ul className="list-disc pl-5 space-y-1 mt-1">
                <li>Primary method: {error || "Failed to extract content"}</li>
                <li>Fallback method (serper.dev): {fallbackError}</li>
              </ul>
            </div>
          ) : (
            <div className="text-amber-600 dark:text-amber-400 text-sm">
              Content extraction failed.
            </div>
          )}
          
          <p>{getSiteSpecificGuidance()}</p>
          
          <div className="flex flex-col gap-3 mt-2">
            <p className="font-medium">Suggestions:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Visit the website directly using the link in the top-right</li>
              <li>Try asking a specific question about the website&apos;s content</li>
              <li>If you have access to the content, try copying and pasting relevant sections directly</li>
              {isDynamicOrComplexSite() && (
                <li>For forum posts or complex pages, try viewing in Reader Mode in your browser first, then share the content</li>
              )}
            </ul>
          </div>
          
          {content && (
            <div className="mt-3">
              <Button
                variant="outline" 
                className="text-xs"
                onClick={() => setShowRawContent(!showRawContent)}
              >
                {showRawContent ? "Hide raw content" : "Show raw extracted content"}
              </Button>
              
              {showRawContent && (
                <div className="mt-3 border border-dashed p-3 overflow-auto max-h-40 text-xs opacity-70">
                  <pre>{content}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const WebsiteContent = memo(PureWebsiteContent);

function WebpageIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg 
      height={size}
      width={size}
      viewBox="0 0 24 24"
      className={cn("stroke-current", className)}
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

function ExternalLinkIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      height={size}
      width={size}
      viewBox="0 0 24 24"
      className={cn("stroke-current", className)}
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

function InfoIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg
      height={size}
      width={size}
      viewBox="0 0 24 24"
      className={cn("stroke-current", className)}
      strokeWidth="2"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 16v-4m0-4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9.03 4.03 9 9z"
      />
    </svg>
  );
}